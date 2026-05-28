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
import { Plus, Trash2, Pencil, Loader2, ShieldPlus, Paperclip } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';

const COVERAGE_TYPES = [
  { value: 'auto_liability', label: 'Auto Liability' },
  { value: 'cargo', label: 'Cargo' },
  { value: 'physical_damage', label: 'Physical Damage' },
  { value: 'general_liability', label: 'General Liability' },
  { value: 'workers_comp', label: "Workers' Comp" },
  { value: 'other', label: 'Other' },
];

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const days = differenceInDays(parseISO(dateStr), new Date());
  if (days < 0) return { label: 'Expired', className: 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20' };
  if (days <= 60) return { label: `Expires in ${days}d`, className: 'text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' };
  return { label: 'Active', className: 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20' };
}

function PolicyDialog({ open, onClose, editing, onSave, saving }) {
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { coverage_type: 'auto_liability' });
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
          <DialogTitle className="text-base">{editing ? 'Edit Policy' : 'Add Insurance Policy'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label className="text-xs">Policy Name <span className="text-destructive">*</span></Label>
            <Input value={form.policy_name || ''} onChange={e => set('policy_name', e.target.value)} className="h-8 text-xs mt-1" placeholder="e.g. Truckers Auto Liability 2025" />
          </div>
          <div>
            <Label className="text-xs">Coverage Type <span className="text-destructive">*</span></Label>
            <Select value={form.coverage_type || ''} onValueChange={v => set('coverage_type', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{COVERAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Policy Number</Label>
            <Input value={form.policy_number || ''} onChange={e => set('policy_number', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Insurer</Label>
            <Input value={form.insurer || ''} onChange={e => set('insurer', e.target.value)} className="h-8 text-xs mt-1" placeholder="Insurance company name" />
          </div>
          <div>
            <Label className="text-xs">Annual Premium ($)</Label>
            <Input type="number" step="0.01" value={form.premium || ''} onChange={e => set('premium', Number(e.target.value))} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Agent Name</Label>
            <Input value={form.agent_name || ''} onChange={e => set('agent_name', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Agent Phone</Label>
            <Input value={form.agent_phone || ''} onChange={e => set('agent_phone', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Effective Date</Label>
            <Input type="date" value={form.effective_date || ''} onChange={e => set('effective_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Expiration Date</Label>
            <Input type="date" value={form.expiration_date || ''} onChange={e => set('expiration_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Attach Policy Document</Label>
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
          <Button size="sm" disabled={saving || !form.policy_name || !form.coverage_type} onClick={() => onSave(form)}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InsurancePolicies() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [coverageFilter, setCoverageFilter] = useState('all');

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['insurance', tenantId],
    queryFn: () => tenantId ? base44.entities.InsurancePolicy.filter({ tenant_id: tenantId }, 'policy_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.InsurancePolicy.update(editing.id, data)
      : base44.entities.InsurancePolicy.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurance'] }); setDialogOpen(false); setEditing(null); toast.success('Saved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InsurancePolicy.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurance'] }); toast.success('Deleted'); },
  });

  const filtered = policies.filter(p => {
    if (search && !p.policy_name?.toLowerCase().includes(search.toLowerCase()) && !p.insurer?.toLowerCase().includes(search.toLowerCase())) return false;
    if (coverageFilter !== 'all' && p.coverage_type !== coverageFilter) return false;
    return true;
  });

  const expiredCount = policies.filter(p => p.expiration_date && differenceInDays(parseISO(p.expiration_date), new Date()) < 0).length;
  const expiringCount = policies.filter(p => {
    if (!p.expiration_date) return false;
    const d = differenceInDays(parseISO(p.expiration_date), new Date());
    return d >= 0 && d <= 60;
  }).length;

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Insurance Policies"
        description={`${policies.length} policies${expiredCount > 0 ? ` · ${expiredCount} expired` : ''}${expiringCount > 0 ? ` · ${expiringCount} expiring soon` : ''}`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Policy
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search policy, insurer..." className="w-56" />
        <Select value={coverageFilter} onValueChange={setCoverageFilter}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Coverage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Coverage Types</SelectItem>
            {COVERAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>
      ) : policies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ShieldPlus className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No insurance policies on file.</p>
          <p className="text-xs mt-1">Add your auto liability, cargo, and other policies to track renewals.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Policy Name ({filtered.length})</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Coverage Type</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Insurer</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Policy #</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Expiration</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Premium/yr</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => {
                const status = expiryStatus(p.expiration_date);
                return (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{p.policy_name}</td>
                    <td className="px-4 py-3 capitalize">{p.coverage_type?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.insurer || '—'}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{p.policy_number || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.expiration_date || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{p.premium ? `$${p.premium.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
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
                            <AlertDialogHeader><AlertDialogTitle>Delete Policy?</AlertDialogTitle><AlertDialogDescription>This insurance policy record will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
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

      <PolicyDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} editing={editing} onSave={d => saveMutation.mutate(d)} saving={saveMutation.isPending} />
    </div>
  );
}