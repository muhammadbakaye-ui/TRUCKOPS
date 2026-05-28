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
import { Plus, Trash2, Pencil, Loader2, ScrollText, Paperclip } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';

const PERMIT_TYPES = [
  { value: 'usdot', label: 'USDOT Number' },
  { value: 'mc_number', label: 'MC Number' },
  { value: 'ifta', label: 'IFTA License' },
  { value: 'irp', label: 'IRP / Apportioned Plates' },
  { value: 'state_permit', label: 'State Permit' },
  { value: 'oversize', label: 'Oversize / Overweight' },
  { value: 'hazmat', label: 'Hazmat Permit' },
  { value: 'other', label: 'Other' },
];

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const days = differenceInDays(parseISO(dateStr), new Date());
  if (days < 0) return { label: 'Expired', className: 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20' };
  if (days <= 60) return { label: `Expires in ${days}d`, className: 'text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' };
  return { label: 'Active', className: 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20' };
}

function PermitDialog({ open, onClose, editing, trucks, onSave, saving }) {
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { permit_type: 'usdot' });
  }, [open, editing]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('file_url', file_url);
      toast.success('Document attached');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Permit / License' : 'Add Permit / License'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label className="text-xs">Permit Name <span className="text-destructive">*</span></Label>
            <Input value={form.permit_name || ''} onChange={e => set('permit_name', e.target.value)} className="h-8 text-xs mt-1" placeholder="e.g. Texas Oversize Permit 2025" />
          </div>
          <div>
            <Label className="text-xs">Permit Type <span className="text-destructive">*</span></Label>
            <Select value={form.permit_type || ''} onValueChange={v => set('permit_type', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{PERMIT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Permit / License Number</Label>
            <Input value={form.permit_number || ''} onChange={e => set('permit_number', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Issuing Authority</Label>
            <Input value={form.issuing_authority || ''} onChange={e => set('issuing_authority', e.target.value)} className="h-8 text-xs mt-1" placeholder="e.g. FMCSA, TxDOT" />
          </div>
          <div>
            <Label className="text-xs">Assigned Truck</Label>
            <Select value={form.truck_id || 'none'} onValueChange={v => { if (v === 'none') { set('truck_id', ''); set('truck_number', ''); } else { const t = trucks.find(t => t.id === v); set('truck_id', v); set('truck_number', t?.unit_number || ''); } }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Company-wide" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Company-wide</SelectItem>
                {trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.unit_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div></div>
          <div>
            <Label className="text-xs">Effective Date</Label>
            <Input type="date" value={form.effective_date || ''} onChange={e => set('effective_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Expiration Date</Label>
            <Input type="date" value={form.expiration_date || ''} onChange={e => set('expiration_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Attach Document</Label>
            <div className="flex items-center gap-2 mt-1">
              {form.file_url && (
                <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> View Document
                </a>
              )}
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={uploading} asChild>
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
          <Button size="sm" disabled={saving || !form.permit_name || !form.permit_type} onClick={() => onSave(form)}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PermitsLicenses() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks', tenantId],
    queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: permits = [], isLoading } = useQuery({
    queryKey: ['permits', tenantId],
    queryFn: () => tenantId ? base44.entities.PermitLicense.filter({ tenant_id: tenantId }, 'permit_name', 300) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.PermitLicense.update(editing.id, data)
      : base44.entities.PermitLicense.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['permits'] }); setDialogOpen(false); setEditing(null); toast.success('Saved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PermitLicense.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['permits'] }); toast.success('Deleted'); },
  });

  const filtered = permits.filter(p => {
    if (typeFilter !== 'all' && p.permit_type !== typeFilter) return false;
    if (search && !p.permit_name?.toLowerCase().includes(search.toLowerCase()) && !p.permit_number?.toLowerCase().includes(search.toLowerCase()) && !p.issuing_authority?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const expiredCount = permits.filter(p => p.expiration_date && differenceInDays(parseISO(p.expiration_date), new Date()) < 0).length;
  const expiringCount = permits.filter(p => {
    if (!p.expiration_date) return false;
    const d = differenceInDays(parseISO(p.expiration_date), new Date());
    return d >= 0 && d <= 60;
  }).length;

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Permits and Licenses"
        description={`${permits.length} records${expiredCount > 0 ? ` · ${expiredCount} expired` : ''}${expiringCount > 0 ? ` · ${expiringCount} expiring soon` : ''}`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Permit
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search permits..." className="w-52" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-48"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PERMIT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ScrollText className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No permits or licenses on file.</p>
          <p className="text-xs mt-1">Add USDOT, MC number, IFTA, state permits, and other operating licenses.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Permit / License</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Number</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Issuing Authority</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Truck</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Expiration</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => {
                const status = expiryStatus(p.expiration_date);
                return (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{p.permit_name}</td>
                    <td className="px-4 py-3 capitalize">{PERMIT_TYPES.find(t => t.value === p.permit_type)?.label || p.permit_type}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{p.permit_number || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.issuing_authority || '—'}</td>
                    <td className="px-4 py-3 font-mono">{p.truck_number || <span className="text-muted-foreground italic">Company</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.expiration_date || '—'}</td>
                    <td className="px-4 py-3">
                      {status ? <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {p.file_url && (
                          <a href={p.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"><Paperclip className="w-3.5 h-3.5" /></Button>
                          </a>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setEditing(p); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Record?</AlertDialogTitle><AlertDialogDescription>This permit or license record will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(p.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PermitDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} editing={editing} trucks={trucks} onSave={d => saveMutation.mutate(d)} saving={saveMutation.isPending} />
    </div>
  );
}