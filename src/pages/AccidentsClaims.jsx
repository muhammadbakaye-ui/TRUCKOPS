import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MobileSelect from '@/components/ui/MobileSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, ShieldAlert, Pencil, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import SearchInput from '@/components/shared/SearchInput';

const CLAIM_STATUS_STYLES = {
  not_filed: 'text-muted-foreground border-border bg-muted',
  open: 'text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-900/20',
  in_progress: 'text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20',
  settled: 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20',
  closed: 'text-muted-foreground border-border bg-muted/60',
};

function DocUploadBtn({ url, label, uploading, onUpload }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-0.5"><Paperclip className="w-3 h-3" /> View</a>}
      <label className="cursor-pointer">
        <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1 pointer-events-none" disabled={uploading} asChild>
          <span>{uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />} {url ? 'Replace' : label}</span>
        </Button>
      </label>
    </div>
  );
}

function AccidentDialog({ open, onClose, editing, drivers, trucks, trailers, onSave, saving }) {
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState({});

  React.useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { date: new Date().toISOString().split('T')[0], claim_status: 'not_filed', injury_involved: false });
  }, [open, editing]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleUpload = async (field, file) => {
    setUploading(u => ({ ...u, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set(field, file_url);
      toast.success('Document attached');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(u => ({ ...u, [field]: false })); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Accident / Claim' : 'Add Accident / Claim'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {/* Incident Details */}
          <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t pt-1">Incident Details</div>
          <div>
            <Label className="text-xs">Date <span className="text-destructive">*</span></Label>
            <Input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Time</Label>
            <Input type="time" value={form.accident_time || ''} onChange={e => set('accident_time', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Driver</Label>
            <MobileSelect
              value={form.driver_id || ''}
              onValueChange={v => { const d = drivers.find(d => d.id === v); set('driver_id', v); set('driver_name', d?.full_name || ''); }}
              triggerClassName="h-8 text-xs mt-1 w-full border border-input rounded-md px-2 bg-background"
              options={drivers.map(d => ({ value: d.id, label: d.full_name }))}
            />
          </div>
          <div>
            <Label className="text-xs">Truck</Label>
            <MobileSelect
              value={form.truck_id || ''}
              onValueChange={v => { const t = trucks.find(t => t.id === v); set('truck_id', v); set('truck_number', t?.unit_number || ''); }}
              triggerClassName="h-8 text-xs mt-1 w-full border border-input rounded-md px-2 bg-background"
              options={trucks.map(t => ({ value: t.id, label: `#${t.unit_number}` }))}
            />
          </div>
          <div>
            <Label className="text-xs">Trailer (optional)</Label>
            <MobileSelect
              value={form.trailer_id || ''}
              onValueChange={v => { const t = trailers.find(t => t.id === v); set('trailer_id', v); set('trailer_number', t?.unit_number || ''); }}
              triggerClassName="h-8 text-xs mt-1 w-full border border-input rounded-md px-2 bg-background"
              options={[
                { value: '', label: 'None' },
                ...trailers.map(t => ({ value: t.id, label: `#${t.unit_number}` }))
              ]}
            />
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Input value={form.location || ''} onChange={e => set('location', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Description of What Happened</Label>
            <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} className="text-xs mt-1 h-16" />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Label className="text-xs">Injury Involved</Label>
            <Switch checked={!!form.injury_involved} onCheckedChange={v => set('injury_involved', v)} />
          </div>
          {form.injury_involved && (
            <div className="col-span-2">
              <Label className="text-xs">Injury Description</Label>
              <Textarea value={form.injury_description || ''} onChange={e => set('injury_description', e.target.value)} className="text-xs mt-1 h-12" />
            </div>
          )}
          <div>
            <Label className="text-xs">Other Parties Involved</Label>
            <Textarea value={form.other_parties || ''} onChange={e => set('other_parties', e.target.value)} className="text-xs mt-1 h-12" />
          </div>

          {/* Police Info */}
          <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t pt-3">Police Report</div>
          <div>
            <Label className="text-xs">Police Report Number</Label>
            <Input value={form.police_report_number || ''} onChange={e => set('police_report_number', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Police Department</Label>
            <Input value={form.police_department || ''} onChange={e => set('police_department', e.target.value)} className="h-8 text-xs mt-1" />
          </div>

          {/* Insurance */}
          <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t pt-3">Insurance {'&'} Claim</div>
          <div>
            <Label className="text-xs">Insurance Company</Label>
            <Input value={form.insurance_company || ''} onChange={e => set('insurance_company', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Insurance Claim #</Label>
            <Input value={form.insurance_claim_number || ''} onChange={e => set('insurance_claim_number', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Claim Status</Label>
            <MobileSelect
              value={form.claim_status || 'not_filed'}
              onValueChange={v => set('claim_status', v)}
              triggerClassName="h-8 text-xs mt-1 w-full border border-input rounded-md px-2 bg-background"
              options={[
                { value: 'not_filed', label: 'Not Filed' },
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'settled', label: 'Settled' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
          </div>
          <div>
            <Label className="text-xs">Estimated Damage Cost ($)</Label>
            <Input type="number" value={form.estimated_damage_cost || ''} onChange={e => set('estimated_damage_cost', parseFloat(e.target.value) || '')} className="h-8 text-xs mt-1" />
          </div>

          {/* Documents */}
          <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t pt-3">Documents</div>
          <div>
            <Label className="text-xs">Document 1 (Police Report / Photos)</Label>
            <div className="mt-1"><DocUploadBtn url={form.file_url} label="Upload Doc 1" uploading={uploading.file_url} onUpload={f => handleUpload('file_url', f)} /></div>
          </div>
          <div>
            <Label className="text-xs">Document 2 (Insurance / Other)</Label>
            <div className="mt-1"><DocUploadBtn url={form.file_url_2} label="Upload Doc 2" uploading={uploading.file_url_2} onUpload={f => handleUpload('file_url_2', f)} /></div>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Document 3</Label>
            <div className="mt-1"><DocUploadBtn url={form.file_url_3} label="Upload Doc 3" uploading={uploading.file_url_3} onUpload={f => handleUpload('file_url_3', f)} /></div>
          </div>

          <div className="col-span-2 border-t pt-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-12" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving || !form.date} onClick={() => onSave({ ...form, pending_review: false })}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AccidentsClaims() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: drivers = [] } = useQuery({ queryKey: ['drivers', tenantId], queryFn: () => tenantId ? base44.entities.Driver.filter({ tenant_id: tenantId }, 'full_name', 200) : Promise.resolve([]), enabled: !!tenantId });
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks', tenantId], queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]), enabled: !!tenantId });
  const { data: trailers = [] } = useQuery({ queryKey: ['trailers', tenantId], queryFn: () => tenantId ? base44.entities.Trailer.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]), enabled: !!tenantId });
  const { data: accidents = [], isLoading } = useQuery({ queryKey: ['accidents', tenantId], queryFn: () => tenantId ? base44.entities.AccidentClaim.filter({ tenant_id: tenantId }, '-date', 500) : Promise.resolve([]), enabled: !!tenantId });

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? base44.entities.AccidentClaim.update(editing.id, data) : base44.entities.AccidentClaim.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accidents'] }); setDialogOpen(false); setEditing(null); toast.success('Saved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AccidentClaim.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accidents'] }); toast.success('Deleted'); },
  });

  const filtered = accidents.filter(a => {
    if (search && !a.driver_name?.toLowerCase().includes(search.toLowerCase()) && !a.location?.toLowerCase().includes(search.toLowerCase())) return false;
    if (driverFilter !== 'all' && a.driver_id !== driverFilter) return false;
    if (statusFilter !== 'all' && a.claim_status !== statusFilter) return false;
    if (dateFrom && a.date < dateFrom) return false;
    if (dateTo && a.date > dateTo) return false;
    return true;
  });

  const openDialog = (rec = null) => { setEditing(rec); setDialogOpen(true); };

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Accidents & Claims"
        description={`${accidents.length} total records`}
        actions={<Button size="sm" className="h-8 text-xs gap-1" onClick={() => openDialog()}><Plus className="w-3.5 h-3.5" /> Add Accident</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search driver / location..." className="w-56" />
        <MobileSelect
          value={driverFilter}
          onValueChange={setDriverFilter}
          triggerClassName="h-8 text-xs w-44 border border-input rounded-md px-2 bg-background"
          options={[
            { value: 'all', label: 'All Drivers' },
            ...drivers.map(d => ({ value: d.id, label: d.full_name }))
          ]}
        />
        <MobileSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          triggerClassName="h-8 text-xs w-40 border border-input rounded-md px-2 bg-background"
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'not_filed', label: 'Not Filed' },
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'settled', label: 'Settled' },
            { value: 'closed', label: 'Closed' },
          ]}
        />
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ShieldAlert className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No accident or claim records found.</p>
          <Button size="sm" className="mt-4 gap-1" onClick={() => openDialog()}><Plus className="w-3.5 h-3.5" /> Add First Record</Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Driver</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Truck</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Injury</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Claim #</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Est. Cost</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Docs</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">{a.date}{a.accident_time ? ` ${a.accident_time}` : ''}</td>
                  <td className="px-4 py-3 font-medium">{a.driver_name || '—'}</td>
                  <td className="px-4 py-3 font-mono">{a.truck_number ? `#${a.truck_number}` : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[120px] truncate">{a.location || '—'}</td>
                  <td className="px-4 py-3">
                    {a.injury_involved
                      ? <Badge variant="outline" className="text-[10px] text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20">Yes</Badge>
                      : <span className="text-muted-foreground">No</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{a.insurance_claim_number || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.estimated_damage_cost ? `$${a.estimated_damage_cost.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-[10px] ${CLAIM_STATUS_STYLES[a.claim_status] || ''}`}>
                      {a.claim_status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {a.file_url && <a href={a.file_url} target="_blank" rel="noopener noreferrer" title="Doc 1"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Paperclip className="w-3 h-3" /></Button></a>}
                      {a.file_url_2 && <a href={a.file_url_2} target="_blank" rel="noopener noreferrer" title="Doc 2"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Paperclip className="w-3 h-3" /></Button></a>}
                      {a.file_url_3 && <a href={a.file_url_3} target="_blank" rel="noopener noreferrer" title="Doc 3"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Paperclip className="w-3 h-3" /></Button></a>}
                      {!a.file_url && !a.file_url_2 && !a.file_url_3 && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openDialog(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Record?</AlertDialogTitle><AlertDialogDescription>This accident/claim record will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(a.id)}>Delete</AlertDialogAction>
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

      <AccidentDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} editing={editing} drivers={drivers} trucks={trucks} trailers={trailers} onSave={d => saveMutation.mutate(d)} saving={saveMutation.isPending} />
    </div>
  );
}