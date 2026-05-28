import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const EMPTY_RULE = { line_item_name: '', apply_to_invoice: true, subtract_from_driver_pay: false, notes: '' };

function RuleForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...EMPTY_RULE, ...initial });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="border border-primary/30 rounded-lg p-3 space-y-3 bg-card">
      <div>
        <Label className="text-xs">Line Item Name <span className="text-destructive">*</span></Label>
        <Input
          value={form.line_item_name}
          onChange={e => set('line_item_name', e.target.value)}
          className="h-8 text-xs mt-1"
          placeholder="e.g. Drop Trailer, Fuel, Line Haul, Detention"
        />
        <p className="text-[10px] text-muted-foreground mt-1">Exact text as it appears in uploaded documents (not case-sensitive)</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-md">
          <div>
            <p className="text-xs font-medium">Apply to Invoice</p>
            <p className="text-[10px] text-muted-foreground">Show on broker invoice</p>
          </div>
          <Switch checked={!!form.apply_to_invoice} onCheckedChange={v => set('apply_to_invoice', v)} />
        </div>
        <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-md">
          <div>
            <p className="text-xs font-medium">Subtract from Driver Pay</p>
            <p className="text-[10px] text-muted-foreground">Deduct from driver rate</p>
          </div>
          <Switch checked={!!form.subtract_from_driver_pay} onCheckedChange={v => set('subtract_from_driver_pay', v)} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea
          value={form.notes || ''}
          onChange={e => set('notes', e.target.value)}
          className="text-xs mt-1 h-12"
          placeholder="Why this rule exists..."
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
        <Button size="sm" className="h-7 text-xs" disabled={saving || !form.line_item_name.trim()} onClick={() => onSave(form)}>
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />} Save Rule
        </Button>
      </div>
    </div>
  );
}

function RuleRow({ rule, onEdit, onDelete, deleting }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 border border-border rounded-lg bg-card hover:bg-muted/20 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{rule.line_item_name}</p>
        <div className="flex gap-2 mt-1.5 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${rule.apply_to_invoice ? 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20' : 'text-muted-foreground border-border bg-muted'}`}>
            Invoice: {rule.apply_to_invoice ? 'Yes' : 'No'}
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${rule.subtract_from_driver_pay ? 'text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20' : 'text-muted-foreground border-border bg-muted'}`}>
            Subtract Driver Pay: {rule.subtract_from_driver_pay ? 'Yes' : 'No'}
          </Badge>
        </div>
        {rule.notes && <p className="text-[10px] text-muted-foreground mt-1 truncate">{rule.notes}</p>}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={deleting}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
              <AlertDialogDescription>The rule for "{rule.line_item_name}" will be permanently removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onDelete(rule.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function LineItemRulesSettings({ open, onClose, tenantId }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['line-item-rules', tenantId],
    queryFn: () => tenantId ? base44.entities.LineItemRule.filter({ tenant_id: tenantId }, 'line_item_name', 200) : Promise.resolve([]),
    enabled: !!tenantId && open,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        return base44.entities.LineItemRule.update(data.id, data);
      }
      return base44.entities.LineItemRule.create({ ...data, tenant_id: tenantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-item-rules'] });
      setAdding(false);
      setEditingId(null);
      toast.success('Rule saved');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LineItemRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-item-rules'] });
      setDeletingId(null);
      toast.success('Rule deleted');
    },
  });

  const handleDelete = (id) => {
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Line Item Rules</DialogTitle>
        </DialogHeader>

        {/* Explanation */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">How this works</p>
          <p className="text-xs text-muted-foreground">
            When a document is uploaded, the AI extracts line items (e.g. "Line Haul $2,400", "Drop Trailer $75"). 
            Rules defined here are applied automatically to each matching line item before the load is created.
          </p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 pt-1">
            <li><span className="font-medium">Apply to Invoice: No</span> — hides that line item from the broker invoice (still used in internal calculations)</li>
            <li><span className="font-medium">Subtract from Driver Pay: Yes</span> — that line item amount is deducted from the driver's pay rate</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-1">Manual Invoice and Driver Pay Overrides on the upload form still work and take priority over these rules.</p>
        </div>

        {/* Rules list */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading rules…
            </div>
          ) : rules.length === 0 && !adding ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No rules configured yet.</p>
              <p className="text-xs mt-0.5">Add your first rule to automate line item handling.</p>
            </div>
          ) : (
            rules.map(rule => (
              editingId === rule.id ? (
                <RuleForm
                  key={rule.id}
                  initial={rule}
                  onSave={(data) => saveMutation.mutate({ ...data, id: rule.id })}
                  onCancel={() => setEditingId(null)}
                  saving={saveMutation.isPending}
                />
              ) : (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  onEdit={() => { setEditingId(rule.id); setAdding(false); }}
                  onDelete={handleDelete}
                  deleting={deletingId === rule.id && deleteMutation.isPending}
                />
              )
            ))
          )}

          {adding && (
            <RuleForm
              initial={EMPTY_RULE}
              onSave={(data) => saveMutation.mutate(data)}
              onCancel={() => setAdding(false)}
              saving={saveMutation.isPending}
            />
          )}
        </div>

        {!adding && editingId === null && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs gap-1.5 border-dashed"
            onClick={() => { setAdding(true); setEditingId(null); }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Rule
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}