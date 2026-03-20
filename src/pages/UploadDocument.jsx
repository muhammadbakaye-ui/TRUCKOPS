import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, FileText, CheckCircle, ArrowRight } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { toast } from 'sonner';
import { logAudit } from '../components/shared/AuditLogger';

export default function UploadDocument() {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [docType, setDocType] = useState('rate_confirmation');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const fileInputRef = useRef(null);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [tripNumber, setTripNumber] = useState('');

  useEffect(() => {
    base44.entities.Driver.filter({ status: 'active' }).then(setDrivers);
    base44.entities.Truck.filter({ status: 'active' }).then(setTrucks);
  }, []);

  const handleFiles = (newFiles) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);
    const processedResults = [];

    try {
      for (const file of files) {
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });

          const doc = await base44.entities.Document.create({
            document_type: docType,
            file_name: file.name,
            file_url,
            related_type: 'load',
            extraction_status: 'pending',
          });

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

          const selectedDriver = selectedDriverId ? drivers.find(d => d.id === selectedDriverId) : null;
          const selectedTruck = selectedTruckId ? trucks.find(t => t.id === selectedTruckId) : null;

          const load = await base44.entities.Load.create({
            internal_load_number: newLoadNum,
            external_load_number: extracted.load_number,
            customer_name: extracted.customer_name,
            customer_id: customerId,
            contact_name: extracted.contact_name,
            freight_rate: extracted.freight_rate,
            fuel_surcharge: extracted.fuel_surcharge,
            invoice_amount: (extracted.freight_rate || 0) + (extracted.fuel_surcharge || 0),
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
            ...(selectedDriver ? { driver_1_id: selectedDriver.id, driver_1_name: selectedDriver.full_name } : {}),
            ...(selectedTruck ? { truck_id: selectedTruck.id, truck_number: selectedTruck.unit_number } : {}),
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
        } catch (err) {
          toast.error(`Failed to process ${file.name}: ${err.message}`);
        }
      }

      setResults(processedResults);
      setFiles([]);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl space-y-4">
      <PageHeader title="Upload Document" description="Upload a rate confirmation or BOL to auto-create a load" />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 items-center">
          <Label className="text-xs">Document Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rate_confirmation">Rate Confirmation</SelectItem>
              <SelectItem value="bol">Bill of Lading</SelectItem>
              <SelectItem value="carrier_tender">Carrier Tender</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 items-center">
          <Label className="text-xs">Driver</Label>
          <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="(optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {drivers.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 items-center">
          <Label className="text-xs">Trip #</Label>
          <Input
            value={tripNumber}
            onChange={e => setTripNumber(e.target.value)}
            placeholder="(optional)"
            className="h-8 text-xs w-32"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Label className="text-xs">Truck</Label>
          <Select value={selectedTruckId} onValueChange={setSelectedTruckId}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="(optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {trucks.map(t => (
                <SelectItem key={t.id} value={t.id}>#{t.unit_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card
        data-tour="upload-dropzone"
        className={`border-2 border-dashed transition-colors cursor-pointer ${dragging ? 'border-primary bg-primary/5' : 'border-border'} ${files.length > 0 ? 'border-green-500 bg-green-500/5' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !processing && fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          {files.length > 0 ? (
            <>
              <FileText className="w-10 h-10 text-green-600" />
              <p className="text-sm font-medium">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
              <p className="text-xs text-muted-foreground">{files.map(f => `${f.name} (${(f.size / 1024).toFixed(0)} KB)`).join(', ')}</p>
              <p className="text-xs text-primary">Click to add more or drop to replace</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground">PDF, image, or document formats supported · Multiple files OK</p>
            </>
          )}
          <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.png,.jpg,.jpeg,.tiff,.doc,.docx" onChange={(e) => handleFiles(Array.from(e.target.files))} />
        </CardContent>
      </Card>

      {files.length > 0 && results.length === 0 && (
        <Button onClick={handleProcess} disabled={processing} className="gap-2">
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {processing ? `Processing ${files.length} file${files.length !== 1 ? 's' : ''}...` : `Extract & Create Load${files.length > 1 ? 's' : ''}`}
        </Button>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, idx) => (
            <Card key={idx} className="border-green-500">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  Load Created Successfully
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Load #:</span> <span className="font-mono font-bold">{result.load.internal_load_number}</span></div>
                  <div><span className="text-muted-foreground">Customer:</span> {result.extracted.customer_name || '—'}</div>
                  <div><span className="text-muted-foreground">Rate:</span> {result.extracted.freight_rate ? `$${result.extracted.freight_rate.toLocaleString()}` : '—'}</div>
                  <div><span className="text-muted-foreground">Stops:</span> {result.stops.length}</div>
                  <div><span className="text-muted-foreground">Equipment:</span> {result.extracted.equipment_type || '—'}</div>
                  <div><span className="text-muted-foreground">Commodity:</span> {result.extracted.commodity || '—'}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1" onClick={() => navigate(createPageUrl(`LoadDetail?id=${result.load.id}`))}>
                    Open Load <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button size="sm" variant="outline" className="w-full" onClick={() => { setFiles([]); setResults([]); }}>Upload More</Button>
        </div>
      )}
    </div>
  );
}