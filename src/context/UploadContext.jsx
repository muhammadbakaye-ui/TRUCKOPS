import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { logAudit } from '../components/shared/AuditLogger';

const UploadContext = createContext(null);

export function useUploadContext() {
  return useContext(UploadContext);
}

let jobIdCounter = 0;

export function UploadProvider({ children }) {
  const [jobs, setJobs] = useState([]);
  // cancelRef: map of jobId -> boolean (true = cancel requested)
  const cancelRefs = useRef({});
  // Serial FIFO queue — each job chains onto this promise
  const processingQueue = useRef(Promise.resolve());

  const updateJob = useCallback((jobId, updates) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j));
  }, []);

  const dismissJob = useCallback((jobId) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
    delete cancelRefs.current[jobId];
  }, []);

  const cancelJob = useCallback((jobId) => {
    cancelRefs.current[jobId] = true;
    updateJob(jobId, { status: 'cancelled' });
  }, [updateJob]);

  // Helper: retry an async fn up to `retries` times with exponential backoff
  const withRetry = async (fn, retries = 3, delayMs = 1500) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, delayMs * attempt));
      }
    }
  };

  // Main processing function — enqueues job for serial FIFO execution
  const submitUpload = useCallback(({
    bundle, docType, selectedDriverId, selectedTruckId, tripNumber, manualAmount, driverAmount, drivers, trucks, tenantId, maxUploads,
  }) => {
    // Enforce per-session upload limit based on subscription plan
    if (maxUploads && bundle.length > maxUploads) {
      toast.error(
        `Your plan allows a maximum of ${maxUploads} document upload${maxUploads !== 1 ? 's' : ''} at a time. Please upgrade your plan to upload more at once.`,
        { duration: 6000 }
      );
      return;
    }
    const id = ++jobIdCounter;
    cancelRefs.current[id] = false;

    const driverObj = selectedDriverId ? drivers.find(d => d.id === selectedDriverId) : null;
    const truckObj = selectedTruckId ? trucks.find(t => t.id === selectedTruckId) : null;

    const job = {
      id,
      total: 1,
      current: 0,
      bundleSize: bundle.length,
      currentFileName: '',
      results: [],
      errors: [],
      status: 'processing',
      docType,
      driverName: driverObj?.full_name || null,
      truckNumber: truckObj?.unit_number || null,
      tripNumber: tripNumber || null,
      manualAmount: manualAmount || null,
      driverAmount: driverAmount || null,
    };
    setJobs(prev => [...prev, job]);

    const processJob = async () => {
      const currentYear = new Date().getFullYear();

      const fixDate = (dateStr) => {
        if (!dateStr) return dateStr;
        const fullMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (fullMatch) return `${currentYear}-${fullMatch[2]}-${fullMatch[3]}`;
        const shortMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
        if (shortMatch) return `${currentYear}-${shortMatch[1].padStart(2,'0')}-${shortMatch[2].padStart(2,'0')}`;
        const slashMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (slashMatch) {
          const month = slashMatch[1].padStart(2,'0');
          const day = slashMatch[2].padStart(2,'0');
          const yearStr = slashMatch[3];
          const year = yearStr.length === 2 ? (parseInt(yearStr) > 50 ? '19' + yearStr : '20' + yearStr) : yearStr;
          return `${year}-${month}-${day}`;
        }
        return dateStr;
      };

      // Pre-fetch company list + seed load number
      const [allCompanies, seedLoads] = await Promise.all([
        base44.entities.Company.filter({ tenant_id: tenantId }, '-created_date', 500),
        tenantId ? base44.entities.Load.filter({ tenant_id: tenantId }, '-created_date', 1) : Promise.resolve([]),
      ]);
      let loadNumCounter = seedLoads.length > 0
        ? parseInt(seedLoads[0].internal_load_number?.replace(/\D/g, '') || '1000')
        : 1000;

      // Step 1: Upload all bundle files in parallel
      updateJob(id, { currentFileName: 'Uploading files\u2026' });
      const uploadResults = await Promise.all(
        bundle.map(async ({ file, label }) => {
          if (cancelRefs.current[id]) return { file, label, file_url: null, doc: null, cancelled: true };
          try {
            const { file_url } = await withRetry(() => base44.integrations.Core.UploadFile({ file }));
            const doc = await base44.entities.Document.create({
              document_type: docType,
              file_name: file.name,
              file_url,
              related_type: 'load',
              extraction_status: 'pending',
            });
            return { file, label, file_url, doc, cancelled: false };
          } catch (err) {
            return { file, label, file_url: null, doc: null, error: err.message };
          }
        })
      );

      if (cancelRefs.current[id]) {
        await Promise.all(uploadResults.filter(r => r.doc).map(r => base44.entities.Document.delete(r.doc.id).catch(() => {})));
        updateJob(id, { status: 'cancelled', results: [], errors: [] });
        return;
      }

      const validUploads = uploadResults.filter(u => u.file_url && !u.error && !u.cancelled);
      if (validUploads.length === 0) {
        const errors = uploadResults.filter(u => u.error).map(u => ({ name: u.file.name, error: u.error }));
        updateJob(id, { status: 'done', errors });
        toast.error('All files failed to upload.');
        return;
      }

      // Step 2: ONE LLM call with ALL file_urls together
      const docCount = validUploads.length;
      const docDescriptions = bundle.map((b, i) => b.label ? `Document ${i + 1} (${b.label})` : `Document ${i + 1}`).join(', ');
      const multiDocPrefix = docCount > 1
        ? `You are analyzing ${docCount} documents (${docDescriptions}) that ALL belong to a SINGLE load/shipment. Read all documents together and extract ONE unified set of load information. If the same field appears in multiple documents, use the most specific or detailed value. If a field only appears in one document, still use it.\n\n`
        : '';

      const llmPrompt = `${multiDocPrefix}Extract all load/shipment data from this ${docType === 'rate_confirmation' ? 'rate confirmation' : 'bill of lading'} document.
Return a structured JSON with the following fields (use null if not found):
- load_number (string) - the main load/order/reference number
- customer_po (string) - Customer PO number explicitly labeled as "Customer PO", "PO Number", or "PO #"
- customer_name (string) - broker or shipper company name
- contact_name (string) - contact person
- charge_line_items (array) - CRITICAL: Extract EVERY individual charge line item. Each item must have a "description" (string) and "amount" (number). Return each line separately. If only a total is shown, return [{"description": "Freight Income", "amount": total}].
- commodity (string) - type of freight
- weight (number) - weight in lbs
- equipment_type (string: dry_van, reefer, flatbed, step_deck, lowboy, tanker, other)
- stops (array of objects with: stop_type (pickup/delivery/stop), company_name, street, city, state, zip, appointment_date (YYYY-MM-DD, always use ${new Date().getFullYear()} as year if not stated), time_from, time_to, reference_number, bol_number, po_number)
- special_instructions (string)
- hazmat (boolean)`;

      const llmSchema = {
        type: 'object',
        properties: {
          load_number: { type: 'string' },
          customer_po: { type: 'string' },
          customer_name: { type: 'string' },
          contact_name: { type: 'string' },
          charge_line_items: {
            type: 'array',
            items: { type: 'object', properties: { description: { type: 'string' }, amount: { type: 'number' } } }
          },
          commodity: { type: 'string' },
          weight: { type: 'number' },
          equipment_type: { type: 'string' },
          special_instructions: { type: 'string' },
          hazmat: { type: 'boolean' },
          stops: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                stop_type: { type: 'string' }, company_name: { type: 'string' }, street: { type: 'string' },
                city: { type: 'string' }, state: { type: 'string' }, zip: { type: 'string' },
                appointment_date: { type: 'string' }, time_from: { type: 'string' }, time_to: { type: 'string' },
                reference_number: { type: 'string' }, bol_number: { type: 'string' }, po_number: { type: 'string' },
              }
            }
          }
        }
      };

      updateJob(id, { currentFileName: `Analyzing ${docCount > 1 ? docCount + ' documents' : 'document'}\u2026` });

      let extracted = null;
      try {
        extracted = await withRetry(() => base44.integrations.Core.InvokeLLM({
          prompt: llmPrompt,
          file_urls: validUploads.map(u => u.file_url),
          response_json_schema: llmSchema,
        }), 3, 800);
      } catch (err) {
        await Promise.all(validUploads.map(u => base44.entities.Document.delete(u.doc.id).catch(() => {})));
        updateJob(id, { status: 'done', errors: [{ name: bundle[0].file.name, error: err.message }] });
        toast.error(`Extraction failed: ${err.message}`);
        return;
      }

      if (cancelRefs.current[id]) {
        await Promise.all(validUploads.map(u => base44.entities.Document.delete(u.doc.id).catch(() => {})));
        updateJob(id, { status: 'cancelled', results: [], errors: [] });
        return;
      }

      // Step 3: Create one load from unified extraction
      try {
        loadNumCounter += 1;
        const newLoadNum = `L-${loadNumCounter}`;

        let customerId = null;
        if (extracted.customer_name) {
          const needle = extracted.customer_name.toLowerCase().substring(0, 6);
          const existing = allCompanies.find(c => c.company_name.toLowerCase().includes(needle));
          if (existing) customerId = existing.id;
        }

        if (extracted.stops) {
          extracted.stops = extracted.stops.map(s => ({ ...s, appointment_date: fixDate(s.appointment_date) }));
        }

        const firstStop = extracted.stops?.find(s => s.stop_type === 'pickup');
        const lastStop = [...(extracted.stops || [])].reverse().find(s => s.stop_type === 'delivery');

        let chargeLineItems = [];
        if (manualAmount) {
          chargeLineItems = [{ description: 'Freight Income', amount: parseFloat(manualAmount) }];
        } else if (extracted.charge_line_items?.length) {
          chargeLineItems = extracted.charge_line_items;
        }
        const lineItemsTotal = chargeLineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);

        const primaryDoc = validUploads[0].doc;

        const load = await base44.entities.Load.create({
          tenant_id: tenantId,
          internal_load_number: newLoadNum,
          external_load_number: extracted.load_number,
          customer_reference_number: extracted.customer_po,
          customer_name: extracted.customer_name,
          customer_id: customerId,
          contact_name: extracted.contact_name,
          charge_line_items: chargeLineItems,
          freight_rate: lineItemsTotal,
          invoice_amount: lineItemsTotal,
          ...(driverAmount ? { driver_rate: parseFloat(driverAmount) } : {}),
          commodity: extracted.commodity,
          weight: extracted.weight,
          equipment_type: extracted.equipment_type,
          hazmat: extracted.hazmat || false,
          source_document_id: primaryDoc.id,
          extraction_status: 'extracted',
          status: 'draft',
          dispatch_status: 'delivered',
          invoice_status: 'not_invoiced',
          pickup_city: firstStop?.city,
          pickup_state: firstStop?.state,
          pickup_date: firstStop?.appointment_date,
          delivery_city: lastStop?.city,
          delivery_state: lastStop?.state,
          delivery_date: lastStop?.appointment_date,
          ...(driverObj ? { driver_1_id: driverObj.id, driver_1_name: driverObj.full_name } : {}),
          ...(truckObj ? { truck_id: truckObj.id, truck_number: truckObj.unit_number } : {}),
          ...(tripNumber ? { trip_number: tripNumber } : {}),
        });

        const stops = extracted.stops || [];

        await Promise.all([
          ...stops.map((s, i) => base44.entities.LoadStop.create({ ...s, load_id: load.id, stop_order: i + 1 })),
          ...validUploads.map(u => base44.entities.Document.update(u.doc.id, {
            related_id: load.id,
            extraction_json: JSON.stringify(extracted),
            extraction_confidence: 0.9,
          })),
          logAudit({ action_type: 'create', entity_type: 'Load', entity_id: load.id, entity_label: newLoadNum, details: `Created from ${docType} upload (${docCount} doc${docCount > 1 ? 's' : ''})` }),
        ]);

        toast.success(`Load ${newLoadNum} created!`);
        updateJob(id, { status: 'done', current: 1, results: [{ load, extracted, stops }], errors: [] });
      } catch (err) {
        updateJob(id, { status: 'done', errors: [{ name: bundle[0].file.name, error: err.message }] });
        toast.error(`Failed to create load: ${err.message}`);
      }
    }; // end processJob

    // Chain onto the global queue — guarantees serial FIFO execution
    // .catch() resets the queue so a failed job doesn't permanently deadlock future ones
    processingQueue.current = processingQueue.current
      .catch(() => {})
      .then(() => processJob().catch(err => {
        console.error('processJob uncaught error:', err);
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'done', errors: [{ name: 'Unknown', error: err.message }] } : j));
      }));
  }, []);

  return (
    <UploadContext.Provider value={{ jobs, submitUpload, cancelJob, dismissJob }}>
      {children}
    </UploadContext.Provider>
  );
}