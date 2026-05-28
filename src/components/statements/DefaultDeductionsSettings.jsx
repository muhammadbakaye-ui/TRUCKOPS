import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, X, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const EMPTY = { deduction_name: '', default_amount: '', applies_to: 'all', applies_to_driver_id: '', applies_to_driver_name: '', recurring: false };

function DeductionForm({ initial, drivers, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="border border-primary/30 rounded-lg p-3 space-y-3 bg-card">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Deduction Name <span className="text-destructive">*</span></Label>
          <Input value={form.deduction_name} onChange={e => set('deduction_name', e.target.value)} className="h-8 text-xs mt-1" placeholder="e.g. Health Insurance, Truck Lease" />
        </div>
        <div>
          <Label className="text-xs">Default Amount ($)</Label>
          <Input type="number" step="0.01" value={form.default_amount || ''} onChange={e => set('default_amount', parseFloat(e.target.value) || '')} className="h-8 text-xs mt-1" placeholder="0.00" />
        </div>
      </div>

      <div>
        <Label className="text-xs">Applies To</Label>
        <Select value={form.applies_to} onValueChange={v => { set('applies_to', v); if (v === 'all') { set('applies_to_driver_id', ''); set('applies_to_driver_name', ''); } }}>
          <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drivers</SelectItem>
            <SelectItem value="specific_driver">Specific Driver</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.applies_to === 'specific_driver' && (
        <div>
          <Label className="text-xs">Select Driver <span className="text-destructive">*</span></Label>
          <Select value={form.applies_to_driver_id} onValueChange={v => { const d = drivers.find(d => d.id === v); set('applies_to_driver_id', v); set('applies_to_driver_name', d?.full_name || ''); }}>
            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select driver" /></SelectTrigger>
            <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-md">
        <div>
          <p className="text-xs font-medium flex items-center gap-1.5"><RefreshCw className="w-3 h-3 text-primary" /> Recurring</p>
          <p className="text-[10px] text-muted-foreground">Auto-add to every new statement for the applicable driver(s)</p>
        </div>
        <Switch checked={!!form.recurring} onCheckedChange={v => set('recurring', v)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}><X className="w-3 h-3 mr-1" /> Cancel</Button>
        <Button size="sm" className="h-7 text-xs"
          disabled={saving || !form.deduction_name.trim() || (form.applies_to === 'specific_driver' && !form.applies_to_driver_id)}
          onClick={() => onSave(form)}
        >
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />} Save
        </Button>
      </div>
    </div>
  );
}

function DeductionRow({ ded, onEdit, onDelete, deleting }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 border border-border rounded-lg bg-card hover:bg-muted/20 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{ded.deduction_name}</p>
          {ded.recurring && <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5 flex-shrink-0"><RefreshCw className="w-2.5 h-2.5 mr-0.5" /> Recurring</Badge>}
        </div>
        <div className="flex gap-2 mt-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20">
            ${ded.default_amount ? Number(ded.default_amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
          </Badge>
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border bg-muted">
            {ded.applies_to === 'all' ? 'All Drivers' : ded.applies_to_driver_name || 'Specific Driver'}
          </Badge>
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={deleting}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Deduction?</AlertDialogTitle>
              <AlertDialogDescription>"{ded.deduction_name}" will be permanently removed from your defaults.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onDelete(ded.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function DefaultDeductionsSettings({ open, onClose, tenantId }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data: deductions = [], isLoading } = useQuery({
    queryKey: ['default-deductions', tenantId],
    queryFn: () => tenantId ? base44.entities.DefaultDeduction.filter({ tenant_id: tenantId }, 'deduction_name', 200) : Promise.resolve([]),
    enabled: !!tenantId && open,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', tenantId],
    queryFn: () => tenantId ? base44.entities.Driver.filter({ status: 'active', tenant_id: tenantId }, 'full_name', 200) : Promise.resolve([]),
    enabled: !!tenantId && open,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, default_amount: parseFloat(data.default_amount) || 0 };
      if (payload.id) return base44.entities.DefaultDeduction.update(payload.id, payload);
      return base44.entities.DefaultDeduction.create({ ...payload, tenant_id: tenantId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['default-deductions'] }); setAdding(false); setEditingId(null); toast.success('Saved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DefaultDeduction.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['default-deductions'] }); setDeletingId(null); toast.success('Deleted'); },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Statement Default Deductions</DialogTitle>
        </DialogHeader>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">How this works</p>
          <p className="text-xs text-muted-foreground">
            Configure your standard deductions here. They appear as quick-add buttons in the Statement Builder so you don't have to retype them every time.
          </p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 pt-1">
            <li><span className="font-medium">All Drivers</span> — shows for every statement regardless of driver</li>
            <li><span className="font-medium">Specific Driver</span> — only shows when building a statement for that driver</li>
            <li><span className="font-medium">Recurring</span> — automatically pre-added to every new statement (no manual click needed)</li>
          </ul>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…</div>
          ) : deductions.length === 0 && !adding ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No default deductions configured.</p>
              <p className="text-xs mt-0.5">Add deductions to replace the old hardcoded Insurance / IFTA / ELD buttons.</p>
            </div>
          ) : (
            deductions.map(ded =>
              editingId === ded.id ? (
                <DeductionForm key={ded.id} initial={ded} drivers={drivers} onSave={d => saveMutation.mutate({ ...d, id: ded.id })} onCancel={() => setEditingId(null)} saving={saveMutation.isPending} />
              ) : (
                <DeductionRow key={ded.id} ded={ded} onEdit={() => { setEditingId(ded.id); setAdding(false); }} onDelete={(id) => { setDeletingId(id); deleteMutation.mutate(id); }} deleting={deletingId === ded.id && deleteMutation.isPending} />
              )
            )
          )}

          {adding && (
            <DeductionForm initial={EMPTY} drivers={drivers} onSave={d => saveMutation.mutate(d)} onCancel={() => setAdding(false)} saving={saveMutation.isPending} />
          )}
        </div>

        {!adding && !editingId && (
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 border-dashed" onClick={() => { setAdding(true); setEditingId(null); }}>
            <Plus className="w-3.5 h-3.5" /> Add Deduction
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}