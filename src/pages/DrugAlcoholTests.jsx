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
import { Plus, Trash2, Loader2, FlaskConical, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const TEST_TYPES = [
  { value: 'pre_employment', label: 'Pre-Employment' },
  { value: 'random', label: 'Random' },
  { value: 'post_accident', label: 'Post-Accident' },
  { value: 'reasonable_suspicion', label: 'Reasonable Suspicion' },
  { value: 'return_to_duty', label: 'Return to Duty' },
];

function TestDialog({ open, onClose, editing, drivers, onSave, saving }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { test_date: new Date().toISOString().split('T')[0], result: 'pass' });
  }, [open, editing]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Test Record' : 'Add Drug and Alcohol Test'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label className="text-xs">Driver <span className="text-destructive">*</span></Label>
            <Select value={form.driver_id || ''} onValueChange={v => {
              const d = drivers.find(d => d.id === v);
              set('driver_id', v); set('driver_name', d?.full_name || '');
            }}>
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
            <Label className="text-xs">Result <span className="text-destructive">*</span></Label>
            <Select value={form.result || 'pass'} onValueChange={v => set('result', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-16" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving || !form.driver_id || !form.test_date || !form.test_type} onClick={() => onSave(form)}>
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
  const [driverFilter, setDriverFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

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
    if (driverFilter !== 'all' && t.driver_id !== driverFilter) return false;
    if (resultFilter !== 'all' && t.result !== resultFilter) return false;
    return true;
  });

  const failCount = tests.filter(t => t.result === 'fail').length;

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Drug and Alcohol Tests"
        description={`${tests.length} total tests${failCount > 0 ? ` · ${failCount} failed` : ''}`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Test
          </Button>
        }
      />

      <div className="flex gap-2">
        <Select value={driverFilter} onValueChange={setDriverFilter}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Drivers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drivers</SelectItem>
            {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
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
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <FlaskConical className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No test records found.</p>
          <p className="text-xs mt-1">Add drug and alcohol test results to keep your records compliant.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Driver</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Test Type</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Result</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Notes</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Submission</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => { setEditing(t); setDialogOpen(true); }}>
                  <td className="px-4 py-3">{t.test_date}</td>
                  <td className="px-4 py-3 font-medium">{t.driver_name}</td>
                  <td className="px-4 py-3 capitalize">{t.test_type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={t.result === 'fail'
                      ? 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20 text-[10px]'
                      : 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20 text-[10px]'}>
                      {t.result === 'fail' ? 'Fail' : 'Pass'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{t.notes || '—'}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {t.submitted_by_driver && (
                      <div className="flex flex-col gap-1">
                        {t.pending_review && <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-300 bg-yellow-50">Pending Review</Badge>}
                        {t.file_url
                          ? <a href={t.file_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-blue-600"><ExternalLink className="w-3 h-3" /> View Doc</Button></a>
                          : <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-300 bg-yellow-50">Doc Missing</Badge>}
                        {t.pending_review && <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-green-600 hover:text-green-700" onClick={() => confirmMutation.mutate(t.id)}><CheckCircle2 className="w-3 h-3" /> Confirm</Button>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Test Record?</AlertDialogTitle><AlertDialogDescription>This record will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(t.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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