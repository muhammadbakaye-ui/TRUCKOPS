import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, Truck, FileCheck, Paperclip, ExternalLink } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import SearchInput from '@/components/shared/SearchInput';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

function HVUTDialog({ open, onClose, editing, trucks, onSave, saving }) {
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { tax_year: currentYear, filing_status: 'not_filed' });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit HVUT Record' : 'Add Highway Use Tax Record'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label className="text-xs">Truck</Label>
            <Select value={form.truck_id || ''} onValueChange={v => { const t = trucks.find(t => t.id === v); set('truck_id', v); set('truck_number', t?.unit_number || ''); set('vin', t?.vin || ''); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.unit_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">VIN</Label>
            <Input value={form.vin || ''} onChange={e => set('vin', e.target.value)} className="h-8 text-xs mt-1" placeholder="Last 8 digits" />
          </div>
          <div>
            <Label className="text-xs">Gross Weight (lbs)</Label>
            <Input type="number" value={form.gross_weight || ''} onChange={e => set('gross_weight', Number(e.target.value))} className="h-8 text-xs mt-1" placeholder="e.g. 55000" />
          </div>
          <div>
            <Label className="text-xs">Tax Year</Label>
            <Select value={String(form.tax_year || currentYear)} onValueChange={v => set('tax_year', Number(v))}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Due Date</Label>
            <Input type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Filing Status</Label>
            <Select value={form.filing_status || 'not_filed'} onValueChange={v => set('filing_status', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="not_filed">Not Filed</SelectItem>
                <SelectItem value="filed">Filed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tax Amount ($)</Label>
            <Input type="number" step="0.01" value={form.tax_amount || ''} onChange={e => set('tax_amount', Number(e.target.value))} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Document (Form 2290)</Label>
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
          <Button size="sm" disabled={saving} onClick={() => onSave(form)}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HighwayUseTax() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks', tenantId],
    queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['hvut', tenantId],
    queryFn: () => tenantId ? base44.entities.HighwayUseTax.filter({ tenant_id: tenantId }, '-tax_year', 500) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.HighwayUseTax.update(editing.id, data)
      : base44.entities.HighwayUseTax.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hvut'] }); setDialogOpen(false); setEditing(null); toast.success('Saved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HighwayUseTax.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hvut'] }); toast.success('Deleted'); },
  });

  const openDialog = (rec = null) => { setEditing(rec); setDialogOpen(true); };

  const markFiledMutation = useMutation({
    mutationFn: (id) => base44.entities.HighwayUseTax.update(id, { filing_status: 'filed' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hvut'] }); toast.success('Marked as filed'); },
  });

  const filtered = records.filter(r => {
    if (yearFilter !== 'all' && String(r.tax_year) !== yearFilter) return false;
    if (statusFilter !== 'all' && r.filing_status !== statusFilter) return false;
    if (search && !r.truck_number?.toLowerCase().includes(search.toLowerCase()) && !r.vin?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Check for upcoming due dates
  const getDueStatus = (dueDate) => {
    if (!dueDate) return null;
    const days = differenceInDays(parseISO(dueDate), new Date());
    if (days < 0) return { label: 'Overdue', className: 'text-red-600 border-red-300 bg-red-50' };
    if (days <= 30) return { label: `${days}d`, className: 'text-yellow-600 border-yellow-300 bg-yellow-50' };
    return { label: 'On Time', className: 'text-green-600 border-green-300 bg-green-50' };
  };

  const totalTax = filtered.reduce((s, r) => s + (r.tax_amount || 0), 0);
  const filedCount = filtered.filter(r => r.filing_status === 'filed').length;

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Highway Use Tax"
        description={`${records.length} trucks tracked · $${totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })} total tax`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => openDialog()}>
            <Plus className="w-3.5 h-3.5" /> Add Truck
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Trucks</p>
          <p className="text-lg font-semibold mt-0.5">{records.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground">Filed</p>
          <p className="text-lg font-semibold mt-0.5 text-green-600">{filedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-lg font-semibold mt-0.5 text-yellow-600">{records.length - filedCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search truck, VIN..." className="w-48" />
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="filed">Filed</SelectItem>
            <SelectItem value="not_filed">Not Filed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Truck className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No HVUT records found.</p>
          <p className="text-xs mt-1">Track Form 2290 filings for your heavy highway vehicles.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Truck</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">VIN</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Weight</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tax Year</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Due Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Tax</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Doc</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => {
                const dueStatus = getDueStatus(r.due_date);
                return (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{r.truck_number || '—'}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{r.vin || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.gross_weight ? `${r.gross_weight.toLocaleString()} lbs` : '—'}</td>
                    <td className="px-4 py-3">{r.tax_year}</td>
                    <td className="px-4 py-3">
                      {r.due_date ? (
                        <div className="flex flex-col gap-1">
                          <span>{r.due_date}</span>
                          {dueStatus && <Badge variant="outline" className={`text-[10px] ${dueStatus.className}`}>{dueStatus.label}</Badge>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={
                        r.filing_status === 'filed' ? 'text-green-600 border-green-300 bg-green-50 text-[10px]' :
                        r.filing_status === 'pending' ? 'text-yellow-600 border-yellow-300 bg-yellow-50 text-[10px]' :
                        'text-muted-foreground border-border bg-muted text-[10px]'
                      }>
                        {r.filing_status?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {r.tax_amount ? `$${r.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.file_url
                        ? <a href={r.file_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Paperclip className="w-3 h-3" /></Button></a>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.filing_status !== 'filed' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => markFiledMutation.mutate(r.id)}>
                            <FileCheck className="w-3 h-3" /> Mark Filed
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openDialog(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Record?</AlertDialogTitle><AlertDialogDescription>This HVUT record will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(r.id)}>Delete</AlertDialogAction></AlertDialogFooter>
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

      <HVUTDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} editing={editing} trucks={trucks} onSave={d => saveMutation.mutate(d)} saving={saveMutation.isPending} />
    </div>
  );
}