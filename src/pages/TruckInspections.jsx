import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, ClipboardCheck, Pencil, Paperclip, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import SearchInput from '@/components/shared/SearchInput';

const INSPECTION_TYPES = [
  { value: 'pre_trip', label: 'Pre-Trip' },
  { value: 'post_trip', label: 'Post-Trip' },
  { value: 'dot_roadside', label: 'DOT Roadside' },
  { value: 'annual', label: 'Annual' },
  { value: 'random', label: 'Random' },
];

const CHECKLIST_ITEMS = [
  { key: 'brakes', label: 'Brakes' },
  { key: 'tires', label: 'Tires' },
  { key: 'lights', label: 'Lights (headlights, brake lights, turn signals)' },
  { key: 'mirrors', label: 'Mirrors' },
  { key: 'horn', label: 'Horn' },
  { key: 'wipers', label: 'Wipers' },
  { key: 'fuel_level', label: 'Fuel Level' },
  { key: 'trailer_connection', label: 'Trailer Connection' },
  { key: 'fire_extinguisher', label: 'Fire Extinguisher' },
  { key: 'steering', label: 'Steering' },
  { key: 'suspension', label: 'Suspension' },
  { key: 'exhaust', label: 'Exhaust System' },
  { key: 'frame', label: 'Frame' },
  { key: 'cargo_securement', label: 'Cargo Securement' },
];

function ChecklistRow({ item, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
      <span className="text-xs">{item.label}</span>
      <div className="flex gap-1">
        {['pass', 'fail', 'na'].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(item.key, v)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
              value === v
                ? v === 'pass' ? 'bg-green-600 text-white border-green-600'
                  : v === 'fail' ? 'bg-red-600 text-white border-red-600'
                  : 'bg-muted text-muted-foreground border-border'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {v === 'na' ? 'N/A' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function InspectionDialog({ open, onClose, editing, trucks, drivers, onSave, saving }) {
  const [form, setForm] = useState({});
  const [checklist, setChecklist] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...editing } : { date: new Date().toISOString().split('T')[0], result: 'pass', defects_corrected: false, out_of_service: false });
      setChecklist(editing?.checklist || {});
    }
  }, [open, editing]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setCheck = (key, val) => setChecklist(p => ({ ...p, [key]: val }));

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('file_url', file_url);
      toast.success('Document attached');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const valid = form.truck_id && form.date && form.inspection_type && form.result;
  const failItems = CHECKLIST_ITEMS.filter(i => checklist[i.key] === 'fail');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Inspection' : 'Add Inspection'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {/* Basic Info */}
          <div>
            <Label className="text-xs">Truck <span className="text-destructive">*</span></Label>
            <Select value={form.truck_id || ''} onValueChange={v => { const t = trucks.find(t => t.id === v); set('truck_id', v); set('truck_number', t?.unit_number || ''); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select truck" /></SelectTrigger>
              <SelectContent>{trucks.map(t => <SelectItem key={t.id} value={t.id}>#{t.unit_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Driver</Label>
            <Select value={form.driver_id || ''} onValueChange={v => { const d = drivers.find(d => d.id === v); set('driver_id', v); set('driver_name', d?.full_name || ''); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Date <span className="text-destructive">*</span></Label>
            <Input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Time</Label>
            <Input type="time" value={form.inspection_time || ''} onChange={e => set('inspection_time', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Inspection Type <span className="text-destructive">*</span></Label>
            <Select value={form.inspection_type || ''} onValueChange={v => set('inspection_type', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{INSPECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Overall Result <span className="text-destructive">*</span></Label>
            <Select value={form.result || 'pass'} onValueChange={v => set('result', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Inspector Name</Label>
            <Input value={form.inspector_name || ''} onChange={e => set('inspector_name', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Inspection Location</Label>
            <Input value={form.inspection_location || ''} onChange={e => set('inspection_location', e.target.value)} className="h-8 text-xs mt-1" />
          </div>

          {/* Checklist */}
          <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t pt-3">Checklist</div>
          <div className="col-span-2 bg-muted/20 rounded-lg p-3 border border-border">
            {failItems.length > 0 && (
              <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded text-xs text-red-600">
                {failItems.length} item{failItems.length !== 1 ? 's' : ''} failed: {failItems.map(i => i.label).join(', ')}
              </div>
            )}
            {CHECKLIST_ITEMS.map(item => (
              <ChecklistRow key={item.key} item={item} value={checklist[item.key] || ''} onChange={setCheck} />
            ))}
          </div>

          {/* Defects */}
          <div className="col-span-2">
            <Label className="text-xs">Defects Found</Label>
            <Textarea value={form.defects_noted || ''} onChange={e => set('defects_noted', e.target.value)} className="text-xs mt-1 h-14" placeholder="Describe any defects found..." />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Label className="text-xs">Defects Corrected Before Departure</Label>
            <Switch checked={!!form.defects_corrected} onCheckedChange={v => set('defects_corrected', v)} />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Label className="text-xs text-red-600">Out of Service</Label>
            <Switch checked={!!form.out_of_service} onCheckedChange={v => set('out_of_service', v)} />
          </div>

          {/* Document */}
          <div className="col-span-2">
            <Label className="text-xs">Document (inspection report, DOT form)</Label>
            <div className="flex items-center gap-2 mt-1">
              {form.file_url && <a href={form.file_url} target="_blank" rel="noopener noreferrer"><Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary px-2"><ExternalLink className="w-3 h-3" /> View</Button></a>}
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1 pointer-events-none" disabled={uploading} asChild>
                  <span>{uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />} {form.file_url ? 'Replace' : 'Upload'}</span>
                </Button>
              </label>
            </div>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-12" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving || !valid} onClick={() => onSave({ ...form, checklist, pending_review: false })}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TruckInspections() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [truckFilter, setTruckFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

  const { data: trucks = [] } = useQuery({ queryKey: ['trucks', tenantId], queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]), enabled: !!tenantId });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers', tenantId], queryFn: () => tenantId ? base44.entities.Driver.filter({ tenant_id: tenantId }, 'full_name', 200) : Promise.resolve([]), enabled: !!tenantId });
  const { data: inspections = [], isLoading } = useQuery({ queryKey: ['inspections', tenantId], queryFn: () => tenantId ? base44.entities.TruckInspection.filter({ tenant_id: tenantId }, '-date', 500) : Promise.resolve([]), enabled: !!tenantId });

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? base44.entities.TruckInspection.update(editing.id, data) : base44.entities.TruckInspection.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inspections'] }); setDialogOpen(false); setEditing(null); toast.success('Saved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TruckInspection.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inspections'] }); toast.success('Deleted'); },
  });

  const confirmMutation = useMutation({
    mutationFn: (id) => base44.entities.TruckInspection.update(id, { pending_review: false }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inspections'] }); toast.success('Record confirmed'); },
  });

  const filtered = inspections.filter(i => {
    if (search && !i.truck_number?.toLowerCase().includes(search.toLowerCase()) && !i.driver_name?.toLowerCase().includes(search.toLowerCase()) && !i.inspector_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (truckFilter !== 'all' && i.truck_id !== truckFilter) return false;
    if (typeFilter !== 'all' && i.inspection_type !== typeFilter) return false;
    if (resultFilter !== 'all' && i.result !== resultFilter) return false;
    return true;
  });

  const failCount = inspections.filter(i => i.result === 'fail').length;
  const openDialog = (rec = null) => { setEditing(rec); setDialogOpen(true); };

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Truck Inspections"
        description={`${inspections.length} total${failCount > 0 ? ` · ${failCount} failed` : ''}`}
        actions={<Button size="sm" className="h-8 text-xs gap-1" onClick={() => openDialog()}><Plus className="w-3.5 h-3.5" /> Add Inspection</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search truck, driver..." className="w-48" />
        <Select value={truckFilter} onValueChange={setTruckFilter}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Trucks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trucks</SelectItem>
            {trucks.map(t => <SelectItem key={t.id} value={t.id}>#{t.unit_number}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {INSPECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Results" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ClipboardCheck className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No inspection records found.</p>
          <Button size="sm" className="mt-4 gap-1" onClick={() => openDialog()}><Plus className="w-3.5 h-3.5" /> Add First Inspection</Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date / Time</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Truck</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Driver</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Inspector</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Result</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Defects</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">OOS</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Doc</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(ins => (
                <tr key={ins.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>{ins.date}</div>
                    {ins.inspection_time && <div className="text-[10px] text-muted-foreground">{ins.inspection_time}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium">#{ins.truck_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ins.driver_name || '—'}</td>
                  <td className="px-4 py-3 capitalize">{ins.inspection_type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ins.inspector_name || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={ins.result === 'fail' ? 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20 text-[10px]' : 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20 text-[10px]'}>
                      {ins.result === 'fail' ? 'Fail' : 'Pass'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {ins.defects_noted ? (
                      <div>
                        <Badge variant="outline" className={ins.defects_corrected ? 'text-green-600 border-green-300 bg-green-50 text-[10px]' : 'text-orange-600 border-orange-300 bg-orange-50 text-[10px]'}>
                          {ins.defects_corrected ? 'Corrected' : 'Not Corrected'}
                        </Badge>
                      </div>
                    ) : <span className="text-muted-foreground">None</span>}
                  </td>
                  <td className="px-4 py-3">
                    {ins.out_of_service
                      ? <Badge variant="outline" className="text-[10px] text-red-600 border-red-300 bg-red-50">OOS</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {ins.file_url
                      ? <a href={ins.file_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Paperclip className="w-3 h-3" /></Button></a>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {ins.submitted_by_driver && ins.pending_review && (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-green-600 hover:text-green-700" onClick={() => confirmMutation.mutate(ins.id)}>
                          <CheckCircle2 className="w-3 h-3" /> Confirm
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openDialog(ins)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Inspection?</AlertDialogTitle><AlertDialogDescription>This record will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(ins.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InspectionDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} editing={editing} trucks={trucks} drivers={drivers} onSave={d => saveMutation.mutate(d)} saving={saveMutation.isPending} />
    </div>
  );
}