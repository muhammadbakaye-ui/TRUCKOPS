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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, FlaskConical, Pencil, Paperclip, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import SearchInput from '@/components/shared/SearchInput';

const TEST_TYPES = [
  { value: 'pre_employment', label: 'Pre-Employment' },
  { value: 'random', label: 'Random' },
  { value: 'post_accident', label: 'Post-Accident' },
  { value: 'reasonable_suspicion', label: 'Reasonable Suspicion' },
  { value: 'return_to_duty', label: 'Return to Duty' },
  { value: 'follow_up', label: 'Follow-Up' },
];

const RESULT_STYLES = {
  pass: 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20',
  fail: 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20',
  pending: 'text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20',
};

function TestDialog({ open, onClose, editing, drivers, onSave, saving }) {
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { test_date: new Date().toISOString().split('T')[0], result: 'pass', follow_up_required: false });
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

  const valid = form.driver_id && form.test_date && form.test_type && form.result;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Test Record' : 'Add Drug & Alcohol Test'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label className="text-xs">Driver <span className="text-destructive">*</span></Label>
            <Select value={form.driver_id || ''} onValueChange={v => { const d = drivers.find(d => d.id === v); set('driver_id', v); set('driver_name', d?.full_name || ''); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Test Date <span className="text-destructive">*</span></Label>
            <Input type="date" value={form.test_date || ''} onChange={e => set('test_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Test Type <span className="text-destructive">*</span></Label>
            <Select value={form.test_type || ''} onValueChange={v => set('test_type', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{TEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Testing Facility / Lab</Label>
            <Input value={form.testing_facility || ''} onChange={e => set('testing_facility', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Collector Name</Label>
            <Input value={form.collector_name || ''} onChange={e => set('collector_name', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Substance Tested For</Label>
            <Select value={form.substance_tested || ''} onValueChange={v => set('substance_tested', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="drugs">Drugs</SelectItem>
                <SelectItem value="alcohol">Alcohol</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Result <span className="text-destructive">*</span></Label>
            <Select value={form.result || 'pass'} onValueChange={v => set('result', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.result === 'fail' && (
            <div className="col-span-2">
              <Label className="text-xs">Substance That Failed</Label>
              <Input value={form.substance_if_failed || ''} onChange={e => set('substance_if_failed', e.target.value)} className="h-8 text-xs mt-1" placeholder="e.g. Marijuana, Alcohol" />
            </div>
          )}
          <div className="col-span-2 flex items-center gap-3">
            <Label className="text-xs">Follow Up Test Required</Label>
            <Switch checked={!!form.follow_up_required} onCheckedChange={v => set('follow_up_required', v)} />
          </div>
          {form.follow_up_required && (
            <div>
              <Label className="text-xs">Follow Up Date</Label>
              <Input type="date" value={form.follow_up_date || ''} onChange={e => set('follow_up_date', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
          )}
          <div className="col-span-2">
            <Label className="text-xs">Test Result Document</Label>
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
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-14" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving || !valid} onClick={() => onSave({ ...form, pending_review: false })}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DrugAlcoholTests() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [driverFilter, setDriverFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', tenantId],
    queryFn: () => tenantId ? base44.entities.Driver.filter({ tenant_id: tenantId }, 'full_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['drug-tests', tenantId],
    queryFn: () => tenantId ? base44.entities.DrugAlcoholTest.filter({ tenant_id: tenantId }, '-test_date', 500) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.DrugAlcoholTest.update(editing.id, data)
      : base44.entities.DrugAlcoholTest.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drug-tests'] }); setDialogOpen(false); setEditing(null); toast.success('Saved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DrugAlcoholTest.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drug-tests'] }); toast.success('Deleted'); },
  });

  const confirmMutation = useMutation({
    mutationFn: (id) => base44.entities.DrugAlcoholTest.update(id, { pending_review: false }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drug-tests'] }); toast.success('Record confirmed'); },
  });

  const filtered = tests.filter(t => {
    if (search && !t.driver_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (driverFilter !== 'all' && t.driver_id !== driverFilter) return false;
    if (resultFilter !== 'all' && t.result !== resultFilter) return false;
    if (typeFilter !== 'all' && t.test_type !== typeFilter) return false;
    return true;
  });

  const failCount = tests.filter(t => t.result === 'fail').length;
  const openDialog = (rec = null) => { setEditing(rec); setDialogOpen(true); };

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Drug & Alcohol Tests"
        description={`${tests.length} total tests${failCount > 0 ? ` · ${failCount} failed` : ''}`}
        actions={<Button size="sm" className="h-8 text-xs gap-1" onClick={() => openDialog()}><Plus className="w-3.5 h-3.5" /> Add Test</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search driver..." className="w-48" />
        <Select value={driverFilter} onValueChange={setDriverFilter}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Drivers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drivers</SelectItem>
            {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Results" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <FlaskConical className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No test records found.</p>
          <Button size="sm" className="mt-4 gap-1" onClick={() => openDialog()}><Plus className="w-3.5 h-3.5" /> Add First Test</Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Driver</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Test Type</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Facility</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Substance</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Result</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Follow Up</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Doc</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Pending</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">{t.test_date}</td>
                  <td className="px-4 py-3 font-medium">{t.driver_name}</td>
                  <td className="px-4 py-3 capitalize">{t.test_type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.testing_facility || '—'}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{t.substance_tested || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-[10px] ${RESULT_STYLES[t.result] || ''}`}>
                      {t.result ? t.result.charAt(0).toUpperCase() + t.result.slice(1) : '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {t.follow_up_required
                      ? <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300 bg-orange-50">{t.follow_up_date || 'Required'}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {t.file_url
                      ? <a href={t.file_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Paperclip className="w-3 h-3" /></Button></a>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {t.submitted_by_driver && t.pending_review ? (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-green-600 hover:text-green-700" onClick={() => confirmMutation.mutate(t.id)}>
                        <CheckCircle2 className="w-3 h-3" /> Confirm
                      </Button>
                    ) : t.submitted_by_driver ? (
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">Confirmed</Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openDialog(t)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Test Record?</AlertDialogTitle><AlertDialogDescription>This record will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(t.id)}>Delete</AlertDialogAction>
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

      <TestDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} editing={editing} drivers={drivers} onSave={d => saveMutation.mutate(d)} saving={saveMutation.isPending} />
    </div>
  );
}