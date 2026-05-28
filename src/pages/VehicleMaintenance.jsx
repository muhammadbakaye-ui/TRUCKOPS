import React, { useState, useMemo, useEffect } from 'react';
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
import { Plus, Trash2, Loader2, Wrench, Pencil, Paperclip, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';
import SearchInput from '@/components/shared/SearchInput';

const MAINT_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'tire_rotation', label: 'Tire Rotation' },
  { value: 'brake_service', label: 'Brake Service' },
  { value: 'dot_inspection', label: 'DOT Inspection' },
  { value: 'transmission_service', label: 'Transmission Service' },
  { value: 'engine_repair', label: 'Engine Repair' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'body_work', label: 'Body Work' },
  { value: 'other', label: 'Other' },
];

function serviceStatus(lastDate) {
  if (!lastDate) return { label: 'No Record', className: 'text-muted-foreground border-border bg-muted' };
  const days = differenceInDays(new Date(), parseISO(lastDate));
  if (days > 90) return { label: 'Overdue', className: 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20' };
  if (days > 30) return { label: 'Due Soon', className: 'text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' };
  return { label: 'Up to Date', className: 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20' };
}

function MaintDialog({ open, onClose, editing, trucks, trailers, onSave, saving }) {
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { date: new Date().toISOString().split('T')[0], vehicle_type: 'truck' });
  }, [open, editing]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const vehicles = form.vehicle_type === 'trailer' ? trailers : trucks;

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('file_url', file_url);
      toast.success('Document attached');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const valid = form.vehicle_id && form.date && form.maintenance_type;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Maintenance Record' : 'Add Maintenance Record'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label className="text-xs">Vehicle Type <span className="text-destructive">*</span></Label>
            <Select value={form.vehicle_type || 'truck'} onValueChange={v => { set('vehicle_type', v); set('vehicle_id', ''); set('vehicle_number', ''); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="trailer">Trailer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Vehicle <span className="text-destructive">*</span></Label>
            <Select value={form.vehicle_id || ''} onValueChange={v => { const vh = vehicles.find(x => x.id === v); set('vehicle_id', v); set('vehicle_number', vh?.unit_number || ''); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>#{v.unit_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Service Date <span className="text-destructive">*</span></Label>
            <Input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Maintenance Type <span className="text-destructive">*</span></Label>
            <Select value={form.maintenance_type || ''} onValueChange={v => set('maintenance_type', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{MAINT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Mileage at Service</Label>
            <Input type="number" value={form.mileage || ''} onChange={e => set('mileage', Number(e.target.value))} className="h-8 text-xs mt-1" placeholder="e.g. 125000" />
          </div>
          <div>
            <Label className="text-xs">Cost ($)</Label>
            <Input type="number" step="0.01" value={form.cost || ''} onChange={e => set('cost', Number(e.target.value))} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Service Provider / Shop</Label>
            <Input value={form.vendor || ''} onChange={e => set('vendor', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Technician Name</Label>
            <Input value={form.technician || ''} onChange={e => set('technician', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Description of Work Done</Label>
            <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} className="text-xs mt-1 h-14" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Parts Replaced</Label>
            <Textarea value={form.parts_replaced || ''} onChange={e => set('parts_replaced', e.target.value)} className="text-xs mt-1 h-12" placeholder="List parts that were replaced" />
          </div>

          <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t pt-3">Next Service</div>
          <div>
            <Label className="text-xs">Next Service Due Date</Label>
            <Input type="date" value={form.next_service_date || ''} onChange={e => set('next_service_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Next Service Due Mileage</Label>
            <Input type="number" value={form.next_service_mileage || ''} onChange={e => set('next_service_mileage', Number(e.target.value))} className="h-8 text-xs mt-1" />
          </div>

          <div className="col-span-2">
            <Label className="text-xs">Document (invoice, receipt, report)</Label>
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
          <Button size="sm" disabled={saving || !valid} onClick={() => onSave(form)}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VehicleMaintenance() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: trucks = [] } = useQuery({ queryKey: ['trucks', tenantId], queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]), enabled: !!tenantId });
  const { data: trailers = [] } = useQuery({ queryKey: ['trailers', tenantId], queryFn: () => tenantId ? base44.entities.Trailer.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]), enabled: !!tenantId });
  const { data: records = [], isLoading } = useQuery({ queryKey: ['maintenance', tenantId], queryFn: () => tenantId ? base44.entities.MaintenanceRecord.filter({ tenant_id: tenantId }, '-date', 500) : Promise.resolve([]), enabled: !!tenantId });

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? base44.entities.MaintenanceRecord.update(editing.id, data) : base44.entities.MaintenanceRecord.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenance'] }); setDialogOpen(false); setEditing(null); toast.success('Saved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceRecord.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenance'] }); toast.success('Deleted'); },
  });

  const lastServiceMap = useMemo(() => {
    const m = {};
    records.forEach(r => { if (!m[r.vehicle_id] || r.date > m[r.vehicle_id].date) m[r.vehicle_id] = { date: r.date, nextDate: r.next_service_date, nextMileage: r.next_service_mileage }; });
    return m;
  }, [records]);

  const allVehicles = useMemo(() => [
    ...trucks.map(t => ({ id: t.id, number: t.unit_number, type: 'truck' })),
    ...trailers.map(t => ({ id: t.id, number: t.unit_number, type: 'trailer' })),
  ], [trucks, trailers]);

  const filtered = records.filter(r => {
    if (search && !r.vehicle_number?.toLowerCase().includes(search.toLowerCase()) && !r.vendor?.toLowerCase().includes(search.toLowerCase()) && !r.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (vehicleFilter !== 'all' && r.vehicle_id !== vehicleFilter) return false;
    if (typeFilter !== 'all' && r.maintenance_type !== typeFilter) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  const totalCost = filtered.reduce((s, r) => s + (r.cost || 0), 0);
  const openDialog = (rec = null) => { setEditing(rec); setDialogOpen(true); };

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Vehicle Maintenance"
        description={`${records.length} records · $${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} total`}
        actions={<Button size="sm" className="h-8 text-xs gap-1" onClick={() => openDialog()}><Plus className="w-3.5 h-3.5" /> Add Record</Button>}
      />

      {/* Vehicle status summary */}
      {allVehicles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {allVehicles.map(v => {
            const info = lastServiceMap[v.id];
            const s = serviceStatus(info?.date);
            return (
              <div key={v.id} className="bg-card border border-border rounded-lg px-3 py-2 space-y-0.5">
                <p className="text-xs font-mono font-semibold">#{v.number}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{v.type}</p>
                <Badge variant="outline" className={`text-[10px] ${s.className}`}>{s.label}</Badge>
                {info?.date && <p className="text-[9px] text-muted-foreground">Last: {info.date}</p>}
                {info?.nextDate && <p className="text-[9px] text-orange-600">Next: {info.nextDate}</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search vehicle, vendor..." className="w-52" />
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Vehicles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vehicles</SelectItem>
            {allVehicles.map(v => <SelectItem key={v.id} value={v.id}>#{v.number} ({v.type})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {MAINT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Wrench className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No maintenance records found.</p>
          <Button size="sm" className="mt-4 gap-1" onClick={() => openDialog()}><Plus className="w-3.5 h-3.5" /> Add First Record</Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vehicle</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Shop / Tech</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Mileage</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Next Service</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Cost</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Doc</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-medium">#{r.vehicle_number}</span>
                      <Badge variant="outline" className="text-[9px] capitalize">{r.vehicle_type}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{r.maintenance_type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">{r.description || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{r.vendor || '—'}</div>
                    {r.technician && <div className="text-[10px] opacity-70">{r.technician}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{r.mileage ? r.mileage.toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.next_service_date ? <div className="text-orange-600 font-medium">{r.next_service_date}</div> : null}
                    {r.next_service_mileage ? <div className="text-[10px]">{r.next_service_mileage.toLocaleString()} mi</div> : null}
                    {!r.next_service_date && !r.next_service_mileage ? '—' : null}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{r.cost ? `$${r.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td className="px-4 py-3">
                    {r.file_url
                      ? <a href={r.file_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Paperclip className="w-3 h-3" /></Button></a>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openDialog(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Record?</AlertDialogTitle><AlertDialogDescription>This maintenance record will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(r.id)}>Delete</AlertDialogAction>
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

      <MaintDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} editing={editing} trucks={trucks} trailers={trailers} onSave={d => saveMutation.mutate(d)} saving={saveMutation.isPending} />
    </div>
  );
}