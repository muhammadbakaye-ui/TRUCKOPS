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
    files, docType, selectedDriverId, selectedTruckId, tripNumber, manualAmount, driverAmount, drivers, trucks, tenantId,
  }) => {
    const id = ++jobIdCounter;
    cancelRefs.current[id] = false;

    const driverObj = selectedDriverId ? drivers.find(d => d.id === selectedDriverId) : null;
    const truckObj = selectedTruckId ? trucks.find(t => t.id === selectedTruckId) : null;

    const job = {
      id,
      total: files.length,
      current: 0,
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
      const processedResults = [];
      const failedFiles = [];
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

      // Pre-fetch company list + seed load number in parallel — one round-trip for the whole batch
      const [allCompanies, seedLoads] = await Promise.all([
        base44.entities.Company.filter({ tenant_id: tenantId }, '-created_date', 500),
        tenantId ? base44.entities.Load.filter({ tenant_id: tenantId }, '-created_date', 1) : Promise.resolve([]),
      ]);
      let loadNumCounter = seedLoads.length > 0
        ? parseInt(seedLoads[0].internal_load_number?.replace(/\D/g, '') || '1000')
        : 1000;

      // Phase 1: Upload all files in parallel, then run LLM extractions concurrently (max 3 at a time)
      // This eliminates the serial upload→wait→LLM→wait→next-file bottleneck.

      // Step 1: Upload all files concurrently
      setJobs(prev => prev.map(j => j.id === id ? { ...j, currentFileName: 'Uploading files…' } : j));
      const uploadResults = await Promise.all(
        files.map(async (file) => {
          if (cancelRefs.current[id]) return { file, file_url: null, doc: null, cancelled: true };
          try {
            const { file_url } = await withRetry(() => base44.integrations.Core.UploadFile({ file }));
            // Create pending document record right after upload
            const doc = await base44.entities.Document.create({
              document_type: docType,
              file_name: file.name,
              file_url,
              related_type: 'load',
              extraction_status: 'pending',
            });
            return { file, file_url, doc, cancelled: false };
          } catch (err) {
            return { file, file_url: null, doc: null, error: err.message };
          }
        })
      );

      if (cancelRefs.current[id]) {
        // Clean up any docs created before cancel
        await Promise.all(uploadResults.filter(r => r.doc).map(r => base44.entities.Document.delete(r.doc.id).catch(() => {})));
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'cancelled', results: [], errors: [] } : j));
        return;
      }

      // Step 2: Run LLM extractions concurrently (up to 3 at a time to avoid rate limits)
      const CONCURRENCY = 3;
      const llmPrompt = `Extract all load/shipment data from this ${docType === 'rate_confirmation' ? 'rate confirmation' : 'bill of lading'} document.
Return a structured JSON with the following fields (use null if not found):
- load_number (string) - the main load/order/reference number (e.g. "Load #", "Order #", "Load Number")
- customer_po (string) - IMPORTANT: the Customer PO number explicitly labeled as "Customer PO", "Customer PO #", "PO Number", or "PO #" — this is separate from the load number. On rate confirmations this often appears near the top next to or below the Load #. Extract it even if it looks like a number. Return null only if this label is truly absent from the document.
- customer_name (string) - broker or shipper company name  
- contact_name (string) - contact person
- charge_line_items (array) - CRITICAL: Extract EVERY individual charge line item from the document's freight terms, charge details, or rate breakdown section. Each item must have a "description" (string) and "amount" (number). For example: [{"description": "Line Haul", "amount": 409.25}, {"description": "Fuel Surcharge", "amount": 80.21}, {"description": "Drop Trailer", "amount": 26.92}]. Do NOT just return the total — return each line separately. If the document only shows a single total with no breakdown, return a single item like [{"description": "Freight Income", "amount": 516.38}].
- commodity (string) - type of freight
- weight (number) - weight in lbs
- equipment_type (string: dry_van, reefer, flatbed, step_deck, lowboy, tanker, other)
- stops (array of objects with: stop_type (pickup/delivery/stop), company_name, street, city, state, zip, appointment_date (YYYY-MM-DD format, always use ${new Date().getFullYear()} as the year if the year is not explicitly stated in the document), time_from, time_to, reference_number (only a ref # explicitly listed FOR THIS SPECIFIC STOP — do NOT copy the top-level Load # or Customer PO here), bol_number (BOL number specific to this stop), po_number (PO number specific to this stop))
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
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                amount: { type: 'number' },
              }
            }
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
                stop_type: { type: 'string' },
                company_name: { type: 'string' },
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zip: { type: 'string' },
                appointment_date: { type: 'string' },
                time_from: { type: 'string' },
                time_to: { type: 'string' },
                reference_number: { type: 'string' },
                bol_number: { type: 'string' },
                po_number: { type: 'string' },
              }
            }
          }
        }
      };

      // Concurrency-limited LLM runner
       const extractionResults = [];
       for (let i = 0; i < uploadResults.length; i += CONCURRENCY) {
         if (cancelRefs.current[id]) break;
         const batch = uploadResults.slice(i, i + CONCURRENCY).filter(u => !u.cancelled && !u.error);
         if (batch.length === 0) continue;
         const endIdx = Math.min(i + CONCURRENCY, uploadResults.length);
         setJobs(prev => prev.map(j => j.id === id ? { ...j, current: i, currentFileName: `Extracting ${endIdx} of ${uploadResults.length}…` } : j));
         const batchResults = await Promise.all(
           batch.map(async (upload) => {
             if (upload.error || !upload.file_url) return { ...upload, extracted: null };
             try {
               const extracted = await withRetry(() => base44.integrations.Core.InvokeLLM({
                 prompt: llmPrompt,
                 file_urls: [upload.file_url],
                 response_json_schema: llmSchema,
               }), 3, 800);
               return { ...upload, extracted };
             } catch (err) {
               return { ...upload, extracted: null, error: err.message };
             }
           })
         );
         extractionResults.push(...batchResults);
       }

      if (cancelRefs.current[id]) {
        await Promise.all(extractionResults.filter(r => r.doc).map(r => base44.entities.Document.delete(r.doc.id).catch(() => {})));
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'cancelled', results: [], errors: [] } : j));
        return;
      }

      // Step 3: Persist loads serially (load number must be sequential, no races)
      for (const item of extractionResults) {
        if (cancelRefs.current[id]) break;

        const { file, file_url, doc, extracted, error } = item;

        if (error || !extracted) {
          failedFiles.push({ name: file.name, error: error || 'Extraction failed' });
          toast.error(`Failed: ${file.name} — ${error || 'Extraction failed'}`);
          setJobs(prev => prev.map(j => j.id === id ? { ...j, errors: [...failedFiles] } : j));
          continue;
        }

        try {
          // Assign next load number (in-memory, already seeded from DB at start)
          loadNumCounter += 1;
          const newLoadNum = `L-${loadNumCounter}`;

          // Match company from pre-fetched list
          let customerId = null;
          if (extracted.customer_name) {
            const needle = extracted.customer_name.toLowerCase().substring(0, 6);
            const existing = allCompanies.find(c => c.company_name.toLowerCase().includes(needle));
            if (existing) customerId = existing.id;
          }

          // Fix stop dates
          if (extracted.stops) {
            extracted.stops = extracted.stops.map(s => ({ ...s, appointment_date: fixDate(s.appointment_date) }));
          }

          const firstStop = extracted.stops?.find(s => s.stop_type === 'pickup');
          const lastStop = [...(extracted.stops || [])].reverse().find(s => s.stop_type === 'delivery');

          // Build charge_line_items: use override if provided, else use AI-extracted items
          let chargeLineItems = [];
          if (manualAmount) {
            chargeLineItems = [{ description: 'Freight Income', amount: parseFloat(manualAmount) }];
          } else if (extracted.charge_line_items?.length) {
            chargeLineItems = extracted.charge_line_items;
          }
          const lineItemsTotal = chargeLineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);

          // Create load, stops, and update doc — stops and doc update can be parallelized after load creation
          const load = await base44.entities.Load.create({
            tenant_id: tenantId,
            internal_load_number: newLoadNum,
            external_load_number: extracted.load_number,
            customer_reference_number: extracted.customer_po,
            customer_name: extracted.customer_name,
            customer_id: customerId,
            contact_name: extracted.contact_name,
            charge_line_items: chargeLineItems,
            freight_rate: lineItemsTotal, // kept for driver pay compatibility
            invoice_amount: lineItemsTotal,
            ...(driverAmount ? { driver_rate: parseFloat(driverAmount) } : {}),
            commodity: extracted.commodity,
            weight: extracted.weight,
            equipment_type: extracted.equipment_type,
            hazmat: extracted.hazmat || false,
            source_document_id: doc.id,
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

          // Stops + doc update + audit log in parallel — none depend on each other
          await Promise.all([
            ...stops.map((s, i) => base44.entities.LoadStop.create({ ...s, load_id: load.id, stop_order: i + 1 })),
            base44.entities.Document.update(doc.id, {
              related_id: load.id,
              extraction_json: JSON.stringify(extracted),
              extraction_confidence: 0.9,
            }),
            logAudit({ action_type: 'create', entity_type: 'Load', entity_id: load.id, entity_label: newLoadNum, details: `Created from ${docType} upload` }),
          ]);

          processedResults.push({ load, extracted, stops });
          toast.success(`Load ${newLoadNum} created!`);

          setJobs(prev => prev.map(j => j.id === id
            ? { ...j, current: processedResults.length + failedFiles.length, results: [...processedResults], errors: [...failedFiles] }
            : j
          ));
        } catch (err) {
          failedFiles.push({ name: file.name, error: err.message });
          setJobs(prev => prev.map(j => j.id === id ? { ...j, errors: [...failedFiles] } : j));
          toast.error(`Failed: ${file.name} — ${err.message}`);
        }
      }

      const wasCancelled = cancelRefs.current[id];
      setJobs(prev => prev.map(j => j.id === id
        ? { ...j, status: wasCancelled ? 'cancelled' : 'done', current: processedResults.length, results: processedResults, errors: failedFiles }
        : j
      ));

      if (failedFiles.length > 0 && !wasCancelled) {
        toast.error(`${failedFiles.length} file(s) failed. Check the upload panel for details.`);
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