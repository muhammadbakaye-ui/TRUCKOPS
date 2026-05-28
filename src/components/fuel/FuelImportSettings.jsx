import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const SYSTEM_FIELDS = [
  { value: 'card_number', label: 'Card Number' },
  { value: 'driver_name_raw', label: 'Driver Name' },
  { value: 'truck_number_raw', label: 'Truck / Unit Number' },
  { value: 'location_name', label: 'Location Name' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'transaction_date', label: 'Transaction Date' },
  { value: 'gallons', label: 'Gallons' },
  { value: 'fuel_amount', label: 'Fuel Amount ($)' },
  { value: 'transaction_fee', label: 'Transaction Fee' },
  { value: 'advance_amount', label: 'Advance Amount' },
  { value: 'advance_fee', label: 'Advance Fee' },
  { value: 'misc_amount', label: 'Misc Amount' },
  { value: 'invoice_amount', label: 'Invoice Amount' },
  { value: 'total_amount', label: 'Total Amount' },
  { value: 'gross_amount', label: 'Gross Amount' },
];

export default function FuelImportSettings({ open, onClose, tenantId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ fuel_amount_column: '', name_prefix_strip: 'N-', column_mappings: [], extra_notes: '' });
  const [settingId, setSettingId] = useState(null);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['fuel-import-settings', tenantId],
    queryFn: () => tenantId ? base44.entities.FuelImportSetting.filter({ tenant_id: tenantId }, '-created_date', 1) : Promise.resolve([]),
    enabled: !!tenantId && open,
  });

  useEffect(() => {
    if (settings.length > 0) {
      const s = settings[0];
      setSettingId(s.id);
      setForm({
        fuel_amount_column: s.fuel_amount_column || '',
        name_prefix_strip: s.name_prefix_strip ?? 'N-',
        column_mappings: s.column_mappings || [],
        extra_notes: s.extra_notes || '',
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settingId) return base44.entities.FuelImportSetting.update(settingId, data);
      const created = await base44.entities.FuelImportSetting.create({ ...data, tenant_id: tenantId });
      setSettingId(created.id);
      return created;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fuel-import-settings'] }); toast.success('Settings saved'); },
  });

  const addMapping = () => setForm(p => ({ ...p, column_mappings: [...p.column_mappings, { document_column: '', system_field: '' }] }));
  const removeMapping = (i) => setForm(p => ({ ...p, column_mappings: p.column_mappings.filter((_, idx) => idx !== i) }));
  const updateMapping = (i, key, val) => setForm(p => {
    const next = [...p.column_mappings];
    next[i] = { ...next[i], [key]: val };
    return { ...p, column_mappings: next };
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Fuel Import Settings</DialogTitle>
        </DialogHeader>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">How this works</p>
          <p className="text-xs text-muted-foreground">
            The AI reads your fuel card files and extracts transaction data. These settings help it understand your specific document format — especially when column names differ from what it expects by default.
          </p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 pt-1">
            <li><span className="font-medium">Column Mappings</span> — tell the AI that "FUEL CHRGS" in your file is the fuel amount, "VEH #" is the truck number, etc.</li>
            <li><span className="font-medium">Fuel Amount Column</span> — which column to prefer when multiple dollar amounts exist (e.g. GROSS AMT vs NET AMT)</li>
            <li><span className="font-medium">Name Prefix to Strip</span> — automatically removed from driver names during matching (e.g. "N-")</li>
            <li><span className="font-medium">Extra Notes</span> — any additional instruction for the AI (e.g. "ignore rows where description contains ADVANCE")</li>
          </ul>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…</div>
        ) : (
          <div className="space-y-5">
            {/* Fuel Amount Column */}
            <div>
              <Label className="text-xs">Preferred Fuel Amount Column</Label>
              <p className="text-[10px] text-muted-foreground mb-1">The AI will prefer this column name when extracting the fuel charge. Leave blank to use the default behavior (GROSS AMT → fuel purchase amount).</p>
              <Input value={form.fuel_amount_column} onChange={e => setForm(p => ({ ...p, fuel_amount_column: e.target.value }))} className="h-8 text-xs w-56" placeholder="e.g. GROSS AMT, NET AMT, FUEL CHRGS" />
            </div>

            {/* Name Prefix Strip */}
            <div>
              <Label className="text-xs">Driver Name Prefix to Strip</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Automatically removed from driver names before matching. Leave blank to disable.</p>
              <Input value={form.name_prefix_strip} onChange={e => setForm(p => ({ ...p, name_prefix_strip: e.target.value }))} className="h-8 text-xs w-32" placeholder="e.g. N-" />
            </div>

            {/* Column Mappings */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <Label className="text-xs">Column Name Mappings</Label>
                  <p className="text-[10px] text-muted-foreground">Map column headers in your document to system fields.</p>
                </div>
              </div>

              {form.column_mappings.length > 0 && (
                <div className="space-y-2 mb-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
                    <div className="col-span-5">Column in Document</div>
                    <div className="col-span-6">Maps to System Field</div>
                    <div className="col-span-1" />
                  </div>
                  {form.column_mappings.map((m, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <Input value={m.document_column} onChange={e => updateMapping(i, 'document_column', e.target.value)} className="h-8 text-xs" placeholder="e.g. VEH #, FUEL CHRGS" />
                      </div>
                      <div className="col-span-6">
                        <Select value={m.system_field} onValueChange={v => updateMapping(i, 'system_field', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
                          <SelectContent>
                            {SYSTEM_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeMapping(i)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-dashed" onClick={addMapping}>
                <Plus className="w-3.5 h-3.5" /> Add Column Mapping
              </Button>
            </div>

            {/* Extra Notes */}
            <div>
              <Label className="text-xs">Extra Extraction Notes</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Additional instructions for the AI. Be specific.</p>
              <Textarea
                value={form.extra_notes}
                onChange={e => setForm(p => ({ ...p, extra_notes: e.target.value }))}
                className="text-xs h-20"
                placeholder="e.g. This is an EFS fuel card report. Ignore rows where the description contains ADVANCE. The QTY column is always gallons."
              />
            </div>

            <Button className="w-full gap-2" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}