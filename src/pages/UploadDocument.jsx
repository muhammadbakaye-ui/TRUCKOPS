import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { usePreviewGate, PreviewFeatureDialog } from '../components/shared/PreviewFeatureGate';
import { useSession } from '../components/shared/AppSession';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, FileText, CheckCircle, X, XCircle, Truck, User, Hash, DollarSign, Tag, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { useUploadContext } from '../context/UploadContext';

export default function UploadDocument() {
  const navigate = useNavigate();
  const { session } = useSession();
  const { showDialog, checkFeatureAccess, handleSubscribe, handleDismiss } = usePreviewGate();
  const isInPreview = session?.subscription_status !== 'active' && session?.subscription_status !== 'trialing';
  const { jobs, submitUpload, cancelJob, dismissJob } = useUploadContext();
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [docType, setDocType] = useState('rate_confirmation');
  const fileInputRef = useRef(null);
  
  const handleDropZoneClick = () => {
    if (!checkFeatureAccess(isInPreview)) return;
    fileInputRef.current?.click();
  };
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [tripNumber, setTripNumber] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [driverAmount, setDriverAmount] = useState('');
  const [showOverrides, setShowOverrides] = useState(false);

  useEffect(() => {
    base44.entities.Driver.filter({ status: 'active' }).then(setDrivers);
    base44.entities.Truck.filter({ status: 'active' }).then(setTrucks);
  }, []);

  // Ctrl+V paste from clipboard
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const ext = item.type.split('/')[1] || 'png';
            const named = new File([file], `pasted-image-${Date.now()}.${ext}`, { type: item.type });
            imageFiles.push(named);
          }
        }
      }
      if (imageFiles.length > 0) handleFiles(imageFiles);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFiles = (newFiles) => setFiles(prev => [...prev, ...newFiles]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleProcess = () => {
    if (files.length === 0) return;
    submitUpload({ files, docType, selectedDriverId, selectedTruckId, tripNumber, manualAmount, driverAmount, drivers, trucks, tenantId: session?.tenant_id });
    setFiles([]);
  };

  const hasOverrides = manualAmount || driverAmount || tripNumber;
  const activeJobs = jobs.filter(j => j.status === 'processing' || j.status === 'done' || j.status === 'cancelled');

  return (
    <div className="p-4 space-y-4 flex gap-5 items-start">
      <PreviewFeatureDialog open={showDialog} onSubscribe={handleSubscribe} onDismiss={handleDismiss} />
      {/* LEFT: Upload form */}
      <div className="flex-1 min-w-0 space-y-5 max-w-2xl">
        <PageHeader title="Upload Document" description="Upload a rate confirmation or BOL to auto-create a load" />

        {/* Primary options */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-9 text-sm w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rate_confirmation">Rate Confirmation</SelectItem>
                <SelectItem value="bol">Bill of Lading</SelectItem>
                <SelectItem value="carrier_tender">Carrier Tender</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Driver <span className="opacity-50">(optional)</span></Label>
            <Select
              value={selectedDriverId || 'none'}
              onValueChange={(val) => {
                if (val === 'none') {
                  setSelectedDriverId('');
                  setSelectedTruckId('');
                } else {
                  setSelectedDriverId(val);
                  const driver = drivers.find(d => d.id === val);
                  if (driver?.assigned_truck_id) setSelectedTruckId(driver.assigned_truck_id);
                }
              }}
            >
              <SelectTrigger className="h-9 text-sm w-48"><SelectValue placeholder="Not assigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned</SelectItem>
                {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Truck <span className="opacity-50">(optional)</span></Label>
            <Select
              value={selectedTruckId || 'none'}
              onValueChange={(val) => {
                if (val === 'none') {
                  setSelectedTruckId('');
                  setSelectedDriverId('');
                } else {
                  setSelectedTruckId(val);
                  const truck = trucks.find(t => t.id === val);
                  if (truck?.assigned_driver_id) setSelectedDriverId(truck.assigned_driver_id);
                }
              }}
            >
              <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="Not assigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned</SelectItem>
                {trucks.map(t => <SelectItem key={t.id} value={t.id}>#{t.unit_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Overrides toggle button */}
          <button
            type="button"
            onClick={() => setShowOverrides(v => !v)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors self-end"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Overrides
            {showOverrides ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {hasOverrides && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5" />}
          </button>
        </div>

        {/* Override fields */}
        {showOverrides && (
          <div className="flex flex-wrap gap-4 items-end p-4 bg-muted/40 rounded-lg border border-border">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Invoice Amount Override</Label>
              <Input value={manualAmount} onChange={e => setManualAmount(e.target.value)} placeholder="Auto from document" type="number" className="h-9 text-sm w-44" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Driver Pay Override</Label>
              <Input value={driverAmount} onChange={e => setDriverAmount(e.target.value)} placeholder="Auto from document" type="number" className="h-9 text-sm w-44" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Trip #</Label>
              <Input value={tripNumber} onChange={e => setTripNumber(e.target.value)} placeholder="Optional" className="h-9 text-sm w-36" />
            </div>
          </div>
        )}

        {/* Drop zone */}
        <Card
          data-tour="upload-dropzone"
          className={`border-2 border-dashed transition-colors cursor-pointer ${dragging ? 'border-primary bg-primary/5' : 'border-border'} ${files.length > 0 ? 'border-green-500 bg-green-500/5' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            if (!checkFeatureAccess(isInPreview)) {
              e.preventDefault();
              return;
            }
            onDrop(e);
          }}
          onClick={() => handleDropZoneClick()}
        >
          <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
            {files.length > 0 ? (
              <>
                <FileText className="w-10 h-10 text-green-600" />
                <p className="text-sm font-medium">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
                <div className="flex flex-col gap-1 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 bg-green-500/10 rounded px-2 py-1 text-xs">
                      <span className="truncate text-foreground">{f.name} <span className="text-muted-foreground">({(f.size / 1024).toFixed(0)} KB)</span></span>
                      <button className="flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} title="Remove">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-primary">Click to add more · or Ctrl+V to paste</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm font-medium">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, image, or document formats supported · Multiple files OK · Ctrl+V to paste image</p>
              </>
            )}
            <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.png,.jpg,.jpeg,.tiff,.doc,.docx" onChange={(e) => {
              if (checkFeatureAccess(isInPreview)) handleFiles(Array.from(e.target.files));
            }} />
          </CardContent>
        </Card>

        {files.length > 0 && (
          <Button onClick={handleProcess} className="gap-2">
            <Upload className="w-4 h-4" />
            Queue {files.length} file{files.length !== 1 ? 's' : ''} for Processing
          </Button>
        )}
      </div>

      {/* RIGHT: Upload queue */}
      {activeJobs.length > 0 && (
        <div className="w-80 flex-shrink-0 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Upload Queue</h3>
          {activeJobs.map(job => {
            const pct = job.total > 0 ? Math.round((job.current / job.total) * 100) : 0;
            const isDone = job.status === 'done';
            const isCancelled = job.status === 'cancelled';
            const isProcessing = job.status === 'processing';
            const driverLabel = drivers.find(d => d.full_name === job.driverName)?.full_name || job.driverName;

            return (
              <Card key={job.id} className={`${isDone ? 'border-green-500/50' : isCancelled ? 'border-muted' : 'border-primary/30'}`}>
                <CardHeader className="py-2.5 px-3 border-b flex flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isDone
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      : isCancelled
                      ? <XCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      : <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />}
                    <span className="text-xs font-semibold truncate">
                      {isDone ? `${job.results.length}/${job.total} created` : isCancelled ? `Cancelled (${job.results.length} done)` : `Processing ${job.current}/${job.total}`}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {isProcessing && (
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" title="Cancel" onClick={() => cancelJob(job.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                    {(isDone || isCancelled) && (
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" title="Dismiss" onClick={() => dismissJob(job.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-3 py-2.5 space-y-2">
                  {isProcessing && (
                    <div className="space-y-1">
                      <Progress value={pct} className="h-1.5" />
                      {job.currentFileName && <p className="text-[10px] text-muted-foreground truncate">{job.currentFileName}</p>}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Tag className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="capitalize">{job.docType?.replace(/_/g, ' ')}</span>
                      <span className="mx-1">·</span>
                      <span>{job.total} file{job.total !== 1 ? 's' : ''}</span>
                    </div>
                    {driverLabel && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <User className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{driverLabel}</span>
                      </div>
                    )}
                    {job.truckNumber && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Truck className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>Truck #{job.truckNumber}</span>
                      </div>
                    )}
                    {job.tripNumber && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Hash className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>Trip #{job.tripNumber}</span>
                      </div>
                    )}
                    {job.manualAmount && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <DollarSign className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>Invoice override: ${job.manualAmount}</span>
                      </div>
                    )}
                    {job.driverAmount && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <DollarSign className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>Driver pay: ${job.driverAmount}</span>
                      </div>
                    )}
                  </div>
                  {job.results.length > 0 && (
                    <div className="space-y-1 pt-1 border-t">
                      {job.results.map((r, i) => (
                        <button
                          key={i}
                          className="flex items-center gap-1.5 text-[10px] text-primary hover:underline w-full text-left"
                          onClick={() => navigate(createPageUrl(`LoadDetail?id=${r.load.id}`))}
                        >
                          <FileText className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="font-mono font-semibold">{r.load.internal_load_number}</span>
                          <span className="text-muted-foreground truncate">— {r.extracted?.customer_name || 'Load'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}