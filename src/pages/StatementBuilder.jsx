import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react';
import { logAudit } from '../components/shared/AuditLogger';
import { toast } from 'sonner';
import { format } from 'date-fns';

const urlParams = new URLSearchParams(window.location.search);
const statementId = urlParams.get('id');

const LINE_TYPES = ['trip','deduction','credit','fuel','advance','adjustment'];

export default function StatementBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ status: 'draft', gross_total: 0, deductions_total: 0, credits_total: 0, fuel_total: 0, final_check_amount: 0 });
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const { data: statement } = useQuery({
    queryKey: ['statement', statementId],
    queryFn: async () => {
      if (!statementId) return null;
      const s = await base44.entities.DriverStatement.get(statementId);
      setForm(s);
      return s;
    },
    enabled: !!statementId,
  });

  const { data: statementLines = [] } = useQuery({
    queryKey: ['statement-lines', statementId],
    queryFn: async () => {
      if (!statementId) return [];
      const l = await base44.entities.StatementLine.filter({ statement_id: statementId }, 'date', 100);
      setLines(l);
      return l;
    },
    enabled: !!statementId,
  });

  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: () => base44.entities.Truck.list() });

  // Auto-calculate totals
  useEffect(() => {
    const gross = lines.filter(l => l.line_type === 'trip' || l.line_type === 'credit').reduce((s, l) => s + (l.amount || 0), 0);
    const deductions = lines.filter(l => l.line_type === 'deduction' || l.line_type === 'advance').reduce((s, l) => s + Math.abs(l.amount || 0), 0);
    const fuel = lines.filter(l => l.line_type === 'fuel').reduce((s, l) => s + Math.abs(l.amount || 0), 0);
    const net = gross - deductions - fuel;
    setForm(prev => ({
      ...prev,
      gross_total: gross,
      deductions_total: deductions,
      fuel_total: fuel,
      final_check_amount: net,
    }));
  }, [lines]);

  const addLine = () => setLines(prev => [...prev, { line_type: 'trip', description: '', amount: 0, date: new Date().toISOString().split('T')[0] }]);
  const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const setLine = (i, key, val) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l));

  const handleSave = async (finalize = false) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        status: finalize ? 'finalized' : form.status,
        driver_name: drivers.find(d => d.id === form.driver_id)?.full_name || form.driver_name,
        truck_number: trucks.find(t => t.id === form.truck_id)?.unit_number || form.truck_number,
      };
      let savedId = statementId;
      if (!statementId) {
        const s = await base44.entities.DriverStatement.create(payload);
        savedId = s.id;
        await logAudit({ action_type: 'create', entity_type: 'DriverStatement', entity_id: savedId, entity_label: `${payload.driver_name} ${payload.period_start}` });
      } else {
        await base44.entities.DriverStatement.update(statementId, payload);
      }
      // Save lines
      const existingLines = statementId ? await base44.entities.StatementLine.filter({ statement_id: savedId }, 'date', 100) : [];
      for (const el of existingLines) {
        if (!lines.find(l => l.id === el.id)) await base44.entities.StatementLine.delete(el.id);
      }
      for (const line of lines) {
        const linePayload = { ...line, statement_id: savedId };
        if (line.id) await base44.entities.StatementLine.update(line.id, linePayload);
        else await base44.entities.StatementLine.create(linePayload);
      }
      if (finalize) await logAudit({ action_type: 'finalize', entity_type: 'DriverStatement', entity_id: savedId });
      queryClient.invalidateQueries({ queryKey: ['statements'] });
      toast.success(finalize ? 'Statement finalized' : 'Statement saved');
      if (!statementId) navigate(createPageUrl(`StatementBuilder?id=${savedId}`));
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => navigate(createPageUrl('DriverStatements'))}>
          <ArrowLeft className="w-3.5 h-3.5" /> Statements
        </Button>
        <h2 className="text-sm font-semibold">{statementId ? `Statement — ${form.driver_name || ''}` : 'New Driver Statement'}</h2>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Draft
          </Button>
          {form.status === 'draft' && (
            <Button size="sm" className="h-8 gap-1" onClick={() => handleSave(true)} disabled={saving}>
              <CheckCircle className="w-3.5 h-3.5" /> Finalize
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lines */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Header</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Driver</Label>
                <Select value={form.driver_id || ''} onValueChange={(v) => { const d = drivers.find(d => d.id === v); set('driver_id', v); set('driver_name', d?.full_name || ''); }}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Truck</Label>
                <Select value={form.truck_id || ''} onValueChange={(v) => { const t = trucks.find(t => t.id === v); set('truck_id', v); set('truck_number', t?.unit_number || ''); }}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select truck" /></SelectTrigger>
                  <SelectContent>{trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.unit_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Statement Date</Label>
                <Input type="date" value={form.statement_date || ''} onChange={(e) => set('statement_date', e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Period Start</Label>
                <Input type="date" value={form.period_start || ''} onChange={(e) => set('period_start', e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Period End</Label>
                <Input type="date" value={form.period_end || ''} onChange={(e) => set('period_end', e.target.value)} className="h-8 text-xs mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line Items</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addLine}><Plus className="w-3 h-3" /> Add Line</Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  <div className="col-span-2">Type</div>
                  <div className="col-span-1">Date</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2">Route</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-1"></div>
                </div>
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1 items-center">
                    <div className="col-span-2">
                      <Select value={line.line_type} onValueChange={(v) => setLine(i, 'line_type', v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{LINE_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Input type="date" value={line.date || ''} onChange={(e) => setLine(i, 'date', e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div className="col-span-4">
                      <Input value={line.description || ''} onChange={(e) => setLine(i, 'description', e.target.value)} className="h-7 text-xs" placeholder="Description" />
                    </div>
                    <div className="col-span-2">
                      <Input value={line.route || ''} onChange={(e) => setLine(i, 'route', e.target.value)} className="h-7 text-xs" placeholder="Route" />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" value={line.amount || ''} onChange={(e) => setLine(i, 'amount', Number(e.target.value))} className="h-7 text-xs" placeholder="0.00" />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLine(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
                {lines.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No lines yet. Click "Add Line" to start.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Gross Earnings</span>
                <span className="font-medium text-green-600">${(form.gross_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Deductions</span>
                <span className="font-medium text-red-600">-${(form.deductions_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Fuel</span>
                <span className="font-medium text-orange-600">-${(form.fuel_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-semibold text-xs">Net Pay</span>
                <span className="text-xl font-bold text-primary">${(form.final_check_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}