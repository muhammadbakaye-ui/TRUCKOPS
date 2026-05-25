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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Loader2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

const INSPECTION_TYPES = [
  { value: 'pre_trip', label: 'Pre-Trip' },
  { value: 'post_trip', label: 'Post-Trip' },
  { value: 'dot_roadside', label: 'DOT Roadside' },
  { value: 'annual', label: 'Annual' },
];

function InspectionDialog({ open, onClose, editing, trucks, drivers, onSave, saving }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { date: new Date().toISOString().split('T')[0], result: 'pass', defects_corrected: false });
  }, [open, editing]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Inspection' : 'Add Inspection'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label className="text-xs">Truck <span className="text-destructive">*</span></Label>
            <Select value={form.truck_id || ''} onValueChange={v => { const t = trucks.find(t => t.id === v); set('truck_id', v); set('truck_number', t?.unit_number || ''); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select truck" /></SelectTrigger>
              <SelectContent>{trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.unit_number}</SelectItem>)}</SelectContent>
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
            <Label className="text-xs">Inspection Type <span className="text-destructive">*</span></Label>
            <Select value={form.inspection_type || ''} onValueChange={v => set('inspection_type', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{INSPECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
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
            <Label className="text-xs">Defects Noted</Label>
            <Textarea value={form.defects_noted || ''} onChange={e => set('defects_noted', e.target.value)} className="text-xs mt-1 h-14" placeholder="Describe any defects found..." />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Checkbox checked={!!form.defects_corrected} onCheckedChange={v => set('defects_corrected', v)} />
            <Label className="text-xs cursor-pointer">Defects Corrected Before Operation</Label>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-12" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving || !form.truck_id || !form.date || !form.inspection_type} onClick={() => onSave(form)}>
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
  const [truckFilter, setTruckFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks', tenantId],
    queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', tenantId],
    queryFn: () => tenantId ? base44.entities.Driver.filter({ tenant_id: tenantId }, 'full_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });
  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['inspections', tenantId],
    queryFn: () => tenantId ? base44.entities.TruckInspection.filter({ tenant_id: tenantId }, '-date', 500) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.TruckInspection.update(editing.id, data)
      : base44.entities.TruckInspection.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inspections'] }); setDialogOpen(false); setEditing(null); toast.success('Saved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TruckInspection.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inspections'] }); toast.success('Deleted'); },
  });

  const filtered = inspections.filter(i => {
    if (truckFilter !== 'all' && i.truck_id !== truckFilter) return false;
    if (typeFilter !== 'all' && i.inspection_type !== typeFilter) return false;
    if (resultFilter !== 'all' && i.result !== resultFilter) return false;
    return true;
  });

  const failCount = inspections.filter(i => i.result === 'fail').length;

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Truck Inspections"
        description={`${inspections.length} total${failCount > 0 ? ` · ${failCount} failed` : ''}`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Inspection
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Select value={truckFilter} onValueChange={setTruckFilter}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Trucks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trucks</SelectItem>
            {trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.unit_number}</SelectItem>)}
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
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ClipboardCheck className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No inspection records found.</p>
          <p className="text-xs mt-1">Add pre-trip, post-trip, and DOT inspection records here.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Truck</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Driver</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Result</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Defects</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Corrected</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(ins => (
                <tr key={ins.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => { setEditing(ins); setDialogOpen(true); }}>
                  <td className="px-4 py-3">{ins.date}</td>
                  <td className="px-4 py-3 font-mono font-medium">{ins.truck_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ins.driver_name || '—'}</td>
                  <td className="px-4 py-3 capitalize">{ins.inspection_type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={ins.result === 'fail'
                      ? 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20 text-[10px]'
                      : 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20 text-[10px]'}>
                      {ins.result === 'fail' ? 'Fail' : 'Pass'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">{ins.defects_noted || '—'}</td>
                  <td className="px-4 py-3">
                    {ins.defects_noted
                      ? <Badge variant="outline" className={ins.defects_corrected ? 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20 text-[10px]' : 'text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-[10px]'}>
                          {ins.defects_corrected ? 'Yes' : 'No'}
                        </Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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