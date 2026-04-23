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

  // Main processing function — runs in background, survives navigation
  const submitUpload = useCallback(async ({
    files, docType, selectedDriverId, selectedTruckId, tripNumber, manualAmount, driverAmount, drivers, trucks,
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
      status: 'processing',
      docType,
      driverName: driverObj?.full_name || null,
      truckNumber: truckObj?.unit_number || null,
      tripNumber: tripNumber || null,
      manualAmount: manualAmount || null,
      driverAmount: driverAmount || null,
    };
    setJobs(prev => [...prev, job]);

    const processedResults = [];

    for (const file of files) {
      if (cancelRefs.current[id]) break;

      const fileIndex = processedResults.length + 1;
      setJobs(prev => prev.map(j => j.id === id ? { ...j, current: fileIndex, currentFileName: file.name } : j));

      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        if (cancelRefs.current[id]) break;

        const doc = await base44.entities.Document.create({
          document_type: docType,
          file_name: file.name,
          file_url,
          related_type: 'load',
          extraction_status: 'pending',
        });

        if (cancelRefs.current[id]) break;

        const extracted = await base44.integrations.Core.InvokeLLM({
          prompt: `Extract all load/shipment data from this ${docType === 'rate_confirmation' ? 'rate confirmation' : 'bill of lading'} document.
Return a structured JSON with the following fields (use null if not found):
- load_number (string) - the load or order number from broker/shipper
- customer_name (string) - broker or shipper company name  
- contact_name (string) - contact person
- freight_rate (number) - total freight rate in dollars
- fuel_surcharge (number) - fuel surcharge amount if listed separately
- commodity (string) - type of freight
- weight (number) - weight in lbs
- equipment_type (string: dry_van, reefer, flatbed, step_deck, lowboy, tanker, other)
- stops (array of objects with: stop_type (pickup/delivery/stop), company_name, street, city, state, zip, appointment_date (YYYY-MM-DD), time_from, time_to, reference_number, bol_number, po_number)
- special_instructions (string)
- hazmat (boolean)`,
          file_urls: [file_url],
          response_json_schema: {
            type: 'object',
            properties: {
              load_number: { type: 'string' },
              customer_name: { type: 'string' },
              contact_name: { type: 'string' },
              freight_rate: { type: 'number' },
              fuel_surcharge: { type: 'number' },
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
          }
        });

        if (cancelRefs.current[id]) {
          // Clean up the pending doc we already created
          await base44.entities.Document.delete(doc.id).catch(() => {});
          break;
        }

        const loads = await base44.entities.Load.list('-created_date', 1);
        const lastNum = loads.length > 0
          ? parseInt(loads[0].internal_load_number?.replace(/\D/g, '') || '1000')
          : 1000;
        const newLoadNum = `L-${lastNum + processedResults.length + 1}`;

        let customerId = null;
        if (extracted.customer_name) {
          const companies = await base44.entities.Company.list();
          const existing = companies.find(c =>
            c.company_name.toLowerCase().includes(extracted.customer_name.toLowerCase().substring(0, 6))
          );
          if (existing) customerId = existing.id;
        }

        const firstStop = extracted.stops?.find(s => s.stop_type === 'pickup');
        const lastStop = [...(extracted.stops || [])].reverse().find(s => s.stop_type === 'delivery');

        const load = await base44.entities.Load.create({
          internal_load_number: newLoadNum,
          external_load_number: extracted.load_number,
          customer_name: extracted.customer_name,
          customer_id: customerId,
          contact_name: extracted.contact_name,
          freight_rate: manualAmount ? parseFloat(manualAmount) : extracted.freight_rate,
          fuel_surcharge: manualAmount ? 0 : extracted.fuel_surcharge,
          invoice_amount: manualAmount ? parseFloat(manualAmount) : (extracted.freight_rate || 0) + (extracted.fuel_surcharge || 0),
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
        for (let i = 0; i < stops.length; i++) {
          await base44.entities.LoadStop.create({ ...stops[i], load_id: load.id, stop_order: i + 1 });
        }

        await base44.entities.Document.update(doc.id, {
          related_id: load.id,
          extraction_json: JSON.stringify(extracted),
          extraction_confidence: 0.9,
        });

        await logAudit({ action_type: 'create', entity_type: 'Load', entity_id: load.id, entity_label: newLoadNum, details: `Created from ${docType} upload` });

        processedResults.push({ load, extracted, stops });
        toast.success(`Load ${newLoadNum} created!`);

        setJobs(prev => prev.map(j => j.id === id ? { ...j, current: fileIndex, results: [...processedResults] } : j));
      } catch (err) {
        toast.error(`Failed: ${file.name} — ${err.message}`);
      }
    }

    const wasCancelled = cancelRefs.current[id];
    setJobs(prev => prev.map(j => j.id === id
      ? { ...j, status: wasCancelled ? 'cancelled' : 'done', current: processedResults.length, results: processedResults }
      : j
    ));

    return processedResults;
  }, []);

  return (
    <UploadContext.Provider value={{ jobs, submitUpload, cancelJob, dismissJob }}>
      {children}
    </UploadContext.Provider>
  );
}