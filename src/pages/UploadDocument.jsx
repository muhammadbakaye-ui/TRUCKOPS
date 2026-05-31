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
import { Upload, Loader2, FileText, CheckCircle, X, XCircle, Truck, User, Hash, DollarSign, Tag, SlidersHorizontal, ChevronDown, ChevronUp, Plus, Settings, Camera } from 'lucide-react';
import LineItemRulesSettings from '../components/upload/LineItemRulesSettings';
import PageHeader from '../components/shared/PageHeader';
import { useUploadContext } from '../context/UploadContext';

export default function UploadDocument() {
  const navigate = useNavigate();
  const { session } = useSession();
  const { showDialog, checkFeatureAccess, handleSubscribe, handleDismiss } = usePreviewGate();
  const isInPreview = session?.subscription_status !== 'active' && session?.subscription_status !== 'trialing';
  const { jobs, submitUpload, cancelJob, dismissJob } = useUploadContext();
  const [dragging, setDragging] = useState(false);
  const [primaryFile, setPrimaryFile] = useState(null);
  const [extraSlots, setExtraSlots] = useState([]); // [{file: null, label: ''}] — bundle mode
  const [separateFiles, setSeparateFiles] = useState([]); // Mode 2: multiple separate loads
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
  const [showRulesSettings, setShowRulesSettings] = useState(false);

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
      if (imageFiles.length > 0 && !primaryFile) setPrimaryFile(imageFiles[0]);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [primaryFile]);

  const handleProcess = () => {
    if (separateFiles.length > 0) {
      // Mode 2: each file → its own load
      separateFiles.forEach(file => {
        submitUpload({ bundle: [{ file, label: '' }], docType, selectedDriverId, selectedTruckId, tripNumber, manualAmount, driverAmount, drivers, trucks, tenantId: session?.tenant_id });
      });
      setSeparateFiles([]);
    } else if (primaryFile) {
      // Mode 1: all docs → one combined load
      const bundle = [
        { file: primaryFile, label: '' },
        ...extraSlots.filter(s => s.file).map(s => ({ file: s.file, label: s.label })),
      ];
      submitUpload({ bundle, docType, selectedDriverId, selectedTruckId, tripNumber, manualAmount, driverAmount, drivers, trucks, tenantId: session?.tenant_id });
      setPrimaryFile(null);
      setExtraSlots([]);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length === 0) return;
    if (dropped.length > 1) {
      // Mode 2: multiple files → separate loads
      setSeparateFiles(dropped);
      setPrimaryFile(null);
      setExtraSlots([]);
    } else {
      // Mode 1: single file → bundle mode
      setPrimaryFile(dropped[0]);
      setSeparateFiles([]);
    }
  };

  const hasOverrides = manualAmount || driverAmount || tripNumber;
  const activeJobs = jobs.filter(j => j.status === 'processing' || j.status === 'done' || j.status === 'cancelled');
  const totalDocCount = 1 + extraSlots.filter(s => s.file).length;

  return (
    <div className="p-4 space-y-4 md:flex md:gap-5 md:items-start">
      <PreviewFeatureDialog open={showDialog} onSubscribe={handleSubscribe} onDismiss={handleDismiss} />
      {/* LEFT: Upload form */}
      <div className="w-full md:flex-1 md:min-w-0 md:space-y-5 md:max-w-2xl space-y-4 md:space-y-5">
        {/* Mobile form - full spacing */}
        <div className="md:hidden space-y-4">
          <div>
            <h1 className="text-base font-semibold text-foreground mb-1">Upload Document</h1>
            <p className="text-xs text-muted-foreground">Upload a rate confirmation or BOL to auto-create a load</p>
          </div>

          {/* Line Item Rules */}
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border border-border bg-transparent" onClick={() => setShowRulesSettings(true)}>
            <Settings className="w-3.5 h-3.5" /> Line Item Rules
          </Button>

          {/* Document Type */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rate_confirmation">Rate Confirmation</SelectItem>
                <SelectItem value="bol">Bill of Lading</SelectItem>
                <SelectItem value="carrier_tender">Carrier Tender</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Driver & Truck - 2 column grid with labels above */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Driver <span className="font-normal text-[11px]">(optional)</span>
              </Label>
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
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Not assigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Truck <span className="font-normal text-[11px]">(optional)</span>
              </Label>
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
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Not assigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {trucks.map(t => <SelectItem key={t.id} value={t.id}>#{t.unit_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Overrides button - full width */}
          <button
            type="button"
            onClick={() => setShowOverrides(v => !v)}
            className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground transition-colors justify-between w-full"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Overrides
            </span>
            {showOverrides ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        {/* Desktop header */}
        <div className="hidden md:block">
          <PageHeader
            title="Upload Document"
            description="Upload a rate confirmation or BOL to auto-create a load"
            actions={
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowRulesSettings(true)}>
                <Settings className="w-3.5 h-3.5" /> Line Item Rules
              </Button>
            }
          />
        </div>
        <LineItemRulesSettings open={showRulesSettings} onClose={() => setShowRulesSettings(false)} tenantId={session?.tenant_id} />

        {/* Primary options */}
        <div className="hidden md:flex md:flex-wrap gap-4 items-end">
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
          <div className="hidden md:flex md:flex-wrap gap-4 items-end p-4 bg-muted/40 rounded-lg border border-border">
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
          className={`border-2 border-dashed transition-colors cursor-pointer md:rounded-lg rounded-2xl min-h-[160px] md:min-h-0 ${dragging ? 'border-primary bg-primary/5' : 'border-border'} ${(primaryFile || separateFiles.length > 0) ? 'border-green-500 bg-green-500/5' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            if (!checkFeatureAccess(isInPreview)) {
              e.preventDefault();
              return;
            }
            onDrop(e);
          }}
          onClick={() => !primaryFile && separateFiles.length === 0 && handleDropZoneClick()}
        >
          <CardContent className="flex flex-col items-center justify-center py-10 md:py-8 gap-3 md:min-h-auto min-h-40">
            {separateFiles.length > 0 ? (
              // Mode 2: separate loads
              <div className="w-full space-y-2" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Analyzing as {separateFiles.length} separate loads</span>
                  </div>
                  <button onClick={() => setSeparateFiles([])} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"><X className="w-3 h-3" /> Clear all</button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {separateFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-green-500/10 border border-green-200 rounded-md px-2.5 py-1.5 text-xs">
                      <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wide w-10 flex-shrink-0">#{i + 1}</span>
                      <FileText className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="truncate flex-1 font-medium">{f.name}</span>
                      <button onClick={() => setSeparateFiles(prev => prev.filter((_, idx) => idx !== i))} className="flex-shrink-0 text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground pt-1">Each file will be analyzed independently and create its own load.</p>
              </div>
            ) : primaryFile ? (
              // Mode 1: bundle mode
              <div className="w-full space-y-2" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">Analyzing as 1 combined load</span>
                </div>

                {/* Primary file */}
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-200 rounded-md px-2.5 py-1.5 text-xs">
                  <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wide w-16 flex-shrink-0">Doc 1</span>
                  <FileText className="w-3 h-3 text-green-600 flex-shrink-0" />
                  <span className="truncate flex-1 font-medium">{primaryFile.name}</span>
                  <button onClick={() => setPrimaryFile(null)} className="flex-shrink-0 text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                </div>

                {/* Extra document slots */}
                {extraSlots.map((slot, i) => (
                  <div key={i} className="border border-dashed rounded-md p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Doc {i + 2}</span>
                      <button onClick={() => setExtraSlots(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                    </div>
                    {slot.file ? (
                      <div className="flex items-center gap-1.5 text-xs bg-muted/50 rounded px-2 py-1">
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate flex-1">{slot.file.name}</span>
                        <button onClick={() => document.getElementById(`extra-file-${i}`).click()} className="text-primary text-[10px] hover:underline flex-shrink-0">Change</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => document.getElementById(`extra-file-${i}`).click()}
                        className="w-full text-[11px] text-muted-foreground hover:text-foreground border border-dashed rounded px-2 py-1.5 text-center hover:border-primary transition-colors"
                      >
                        Click to select file
                      </button>
                    )}
                    <input
                      id={`extra-file-${i}`}
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.tiff,.doc,.docx"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setExtraSlots(prev => prev.map((s, idx) => idx === i ? { ...s, file: f } : s));
                        e.target.value = '';
                      }}
                    />
                    <input
                      value={slot.label}
                      onChange={(e) => setExtraSlots(prev => prev.map((s, idx) => idx === i ? { ...s, label: e.target.value } : s))}
                      placeholder="Label (optional, e.g. Payment Details)"
                      className="w-full text-[11px] h-6 px-2 border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ))}

                {/* Add another slot (max 5 total) */}
                {(1 + extraSlots.length) < 5 && (
                  <button
                    onClick={() => setExtraSlots(prev => [...prev, { file: null, label: '' }])}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline py-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Attach another document to this upload
                  </button>
                )}
                <p className="text-[10px] text-muted-foreground pt-1">All attached documents will be analyzed together as one load.</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm font-medium hidden md:block">Drop the primary document here or click to browse</p>
                <p className="text-sm font-medium md:hidden text-primary">Tap to browse or use camera</p>
                <p className="text-xs text-muted-foreground hidden md:block">Drop one file for bundle mode · Drop multiple files for separate loads · Ctrl+V to paste</p>
                <p className="text-xs text-muted-foreground md:hidden">PDF, image, or document formats supported</p>
              </>
            )}
            <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.png,.jpg,.jpeg,.tiff,.doc,.docx" onChange={(e) => {
              if (checkFeatureAccess(isInPreview)) {
                const files = Array.from(e.target.files || []);
                if (files.length > 1) {
                  setSeparateFiles(files);
                  setPrimaryFile(null);
                  setExtraSlots([]);
                } else if (files.length === 1) {
                  setPrimaryFile(files[0]);
                  setSeparateFiles([]);
                }
                e.target.value = '';
              }
            }} />
          </CardContent>
        </Card>

        {/* Divider and Take Photo (mobile only) */}
        {!primaryFile && separateFiles.length === 0 && (
          <div className="md:hidden space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Button
             onClick={() => handleDropZoneClick()}
             variant="outline"
             className="w-full h-12 gap-2 rounded-lg border border-border bg-secondary text-[13px] text-muted-foreground hover:text-foreground"
            >
             <Camera className="w-4 h-4" />
             Take Photo
            </Button>
          </div>
        )}

        {(primaryFile || separateFiles.length > 0) && (
          <Button onClick={handleProcess} className="gap-2 w-full md:w-auto">
            <Upload className="w-4 h-4" />
            {separateFiles.length > 0
              ? `Analyze ${separateFiles.length} files → Create ${separateFiles.length} Loads`
              : `Analyze ${totalDocCount} document${totalDocCount !== 1 ? 's' : ''} → Create Load`
            }
          </Button>
        )}
      </div>

      {/* RIGHT: Upload queue */}
      {activeJobs.length > 0 && (
        <div className="w-full md:w-80 md:flex-shrink-0 space-y-3">
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
                      {isDone ? 'Load created' : isCancelled ? 'Cancelled' : 'Analyzing…'}
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
                      <span>{job.bundleSize ?? job.total} doc{(job.bundleSize ?? job.total) !== 1 ? 's' : ''}</span>
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