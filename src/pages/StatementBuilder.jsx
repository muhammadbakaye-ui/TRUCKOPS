import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, ArrowLeft, Plus, Trash2, CheckCircle, Fuel, Truck, Printer, Eye, EyeOff } from 'lucide-react';
import { logAudit } from '../components/shared/AuditLogger';
import { toast } from 'sonner';
import { printStatement } from '../components/print/printStatement';

const urlParams = new URLSearchParams(window.location.search);
const statementId = urlParams.get('id');

const DEFAULT_DEDUCTIONS = [
  { description: 'Insurance', amount: 425 },
  { description: 'IFTA', amount: 50 },
  { description: 'ELD', amount: 15 },
];

export default function StatementBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ status: 'draft', gross_total: 0, deductions_total: 0, fuel_total: 0, final_check_amount: 0 });
  const [tripLines, setTripLines] = useState([]);
  const [deductionLines, setDeductionLines] = useState([]);
  const [fuelLines, setFuelLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingFuel, setLoadingFuel] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: () => base44.entities.Truck.list() });
  const { data: carrierCompany = [] } = useQuery({ queryKey: ['settings-company'], queryFn: () => base44.entities.Company.filter({ company_type: 'carrier' }, '-created_date', 1) });

  const handlePrint = () => {
    const company = carrierCompany[0] || {};
    const allLines = [...tripLines, ...deductionLines, ...fuelLines];
    printStatement({ company, statement: form, allLines });
  };

  // Load existing statement
  useQuery({
    queryKey: ['statement', statementId],
    queryFn: async () => {
      if (!statementId) return null;
      const s = await base44.entities.DriverStatement.get(statementId);
      setForm(s);
      // Load existing lines
      const lines = await base44.entities.StatementLine.filter({ statement_id: statementId }, 'date', 200);
      setTripLines(lines.filter(l => l.line_type === 'trip' || l.line_type === 'credit' || l.line_type === 'adjustment'));
      setDeductionLines(lines.filter(l => l.line_type === 'deduction' || l.line_type === 'advance'));
      setFuelLines(lines.filter(l => l.line_type === 'fuel'));
      return s;
    },
    enabled: !!statementId,
  });

  // Auto-calculate totals
  useEffect(() => {
    const gross = tripLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const deductions = deductionLines.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0);
    const fuel = fuelLines.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0);
    setForm(prev => ({
      ...prev,
      gross_total: gross,
      deductions_total: deductions,
      fuel_total: fuel,
      final_check_amount: gross - deductions - fuel,
    }));
  }, [tripLines, deductionLines, fuelLines]);

  const loadDriverTrips = async () => {
    if (!form.driver_id) return toast.error('Select a driver first');
    setLoadingTrips(true);
    try {
      const loads = await base44.entities.Load.filter({ driver_1_id: form.driver_id });
      const extractTripNum = (desc) => {
        if (!desc) return null;
        const match = desc.match(/_(\d{3})_/);
        return match ? match[1] : null;
      };
      const newLines = loads.map(l => {
        const tripNum = l.trip_number || extractTripNum(l.external_load_number) || extractTripNum(l.customer_reference_number) || extractTripNum(l.internal_load_number);
        return {
          line_type: 'trip',
          source_id: l.id,
          source_type: 'load',
          date: l.delivery_date || l.pickup_date || '',
          description: tripNum ? `${tripNum} / ${l.external_load_number || l.internal_load_number}` : `${l.external_load_number || l.internal_load_number}`,
          route: `${l.pickup_city || ''}${l.pickup_state ? `, ${l.pickup_state}` : ''} → ${l.delivery_city || ''}${l.delivery_state ? `, ${l.delivery_state}` : ''}`,
          amount: l.invoice_amount || l.freight_rate || 0,
        };
      });
      setTripLines(newLines);
      toast.success(`Loaded ${newLines.length} trips`);
    } catch (err) {
      toast.error('Failed to load trips');
    } finally {
      setLoadingTrips(false);
    }
  };

  const loadDriverFuel = async () => {
    if (!form.driver_id) return toast.error('Select a driver first');
    setLoadingFuel(true);
    try {
      const txs = await base44.entities.FuelTransaction.filter({ matched_driver_id: form.driver_id });
      const newLines = txs.map(tx => {
        const city = (tx.city && tx.city !== 'null') ? tx.city : '';
        const state = (tx.state && tx.state !== 'null') ? tx.state : '';
        const gallons = (tx.gallons && tx.gallons !== 'null') ? tx.gallons : '';
        const cityState = [city, state].filter(Boolean).join(', ');
        const gallonsPart = gallons ? ` (${gallons} gal)` : '';
        const descParts = ['Fuel', cityState, gallonsPart].filter(Boolean);
        return {
          line_type: 'fuel',
          source_id: tx.id,
          source_type: 'fuel_transaction',
          date: tx.transaction_date || '',
          description: descParts.join(' - '),
          card_number: (tx.card_number && tx.card_number !== 'null') ? tx.card_number : '',
          location_name: (tx.location_name && tx.location_name !== 'null') ? tx.location_name : '',
          city_state: cityState,
          amount: tx.total_amount || tx.fuel_amount || 0,
        };
      });
      setFuelLines(newLines);
      toast.success(`Loaded ${newLines.length} fuel transactions`);
    } catch (err) {
      toast.error('Failed to load fuel');
    } finally {
      setLoadingFuel(false);
    }
  };

  const addDefaultDeduction = (def) => {
    setDeductionLines(prev => [...prev, {
      line_type: 'deduction',
      date: new Date().toISOString().split('T')[0],
      description: def.description,
      amount: def.amount,
    }]);
  };

  const addCustomDeduction = () => {
    setDeductionLines(prev => [...prev, { line_type: 'deduction', date: new Date().toISOString().split('T')[0], description: '', amount: 0 }]);
  };

  const addTripLine = () => setTripLines(prev => [...prev, { line_type: 'trip', date: new Date().toISOString().split('T')[0], description: '', route: '', amount: 0 }]);

  const handleSave = async (finalize = false) => {
    setSaving(true);
    try {
      const driver = drivers.find(d => d.id === form.driver_id);
      const truck = trucks.find(t => t.id === form.truck_id);
      const payload = {
        ...form,
        status: finalize ? 'finalized' : form.status,
        driver_name: driver?.full_name || form.driver_name,
        truck_number: truck?.unit_number || form.truck_number,
      };

      let savedId = statementId;
      if (!statementId) {
        const s = await base44.entities.DriverStatement.create(payload);
        savedId = s.id;
        await logAudit({ action_type: 'create', entity_type: 'DriverStatement', entity_id: savedId, entity_label: `${payload.driver_name} ${payload.period_start}` });
      } else {
        await base44.entities.DriverStatement.update(statementId, payload);
      }

      // Delete old lines and recreate
      const existingLines = savedId ? await base44.entities.StatementLine.filter({ statement_id: savedId }, 'date', 200) : [];
      for (const el of existingLines) {
        await base44.entities.StatementLine.delete(el.id);
      }
      const allLines = [...tripLines, ...deductionLines, ...fuelLines];
      for (const line of allLines) {
        const { id, ...lineData } = line;
        await base44.entities.StatementLine.create({ ...lineData, statement_id: savedId });
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

  const LineRow = ({ line, onChange, onRemove }) => (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b last:border-0">
      <div className="col-span-2">
        <Input type="date" value={line.date || ''} onChange={(e) => onChange('date', e.target.value)} className="h-8 text-xs" />
      </div>
      <div className="col-span-4">
        <Input value={line.description || ''} onChange={(e) => onChange('description', e.target.value)} className="h-8 text-xs" placeholder="Description / Load #" />
      </div>
      <div className="col-span-3">
        <Input value={line.route || ''} onChange={(e) => onChange('route', e.target.value)} className="h-8 text-xs" placeholder="Origin → Dest" />
      </div>
      <div className="col-span-2">
        <Input type="number" value={line.amount || ''} onChange={(e) => onChange('amount', Number(e.target.value))} className="h-8 text-xs text-right font-mono font-semibold" placeholder="0.00" />
      </div>
      <div className="col-span-1 flex justify-center">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
      </div>
    </div>
  );

  const colHeaders = (
    <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-0 mb-1 pb-2 border-b">
      <div className="col-span-2">Date</div>
      <div className="col-span-4">Description / Load #</div>
      <div className="col-span-3">Route</div>
      <div className="col-span-2 text-right">Amount ($)</div>
      <div className="col-span-1"></div>
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => navigate(createPageUrl('DriverStatements'))}>
          <ArrowLeft className="w-3.5 h-3.5" /> Statements
        </Button>
        <h2 className="text-sm font-semibold">{statementId ? `Statement — ${form.driver_name || ''}` : 'New Driver Statement'}</h2>
        <div className="ml-auto flex gap-2">
          <Button 
            variant={form.published ? "default" : "outline"} 
            size="sm" 
            className="h-8 gap-1" 
            onClick={() => set('published', !form.published)}
          >
            {form.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {form.published ? 'Published' : 'Unpublished'}
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Draft
          </Button>
          {form.status !== 'finalized' && (
            <Button size="sm" className="h-8 gap-1" onClick={() => handleSave(true)} disabled={saving}>
              <CheckCircle className="w-3.5 h-3.5" /> Finalize
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className="xl:col-span-3 space-y-5">

          {/* Header */}
          <Card>
            <CardHeader className="py-3.5 px-5 border-b"><CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Statement Header</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 grid grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Driver</Label>
                <Select value={form.driver_id || ''} onValueChange={(v) => {
                  const d = drivers.find(d => d.id === v);
                  set('driver_id', v);
                  set('driver_name', d?.full_name || '');
                  // Auto-set truck from driver's assigned truck
                  if (d?.assigned_truck_id) {
                    const t = trucks.find(t => t.id === d.assigned_truck_id);
                    if (t) { set('truck_id', t.id); set('truck_number', t.unit_number); }
                  }
                }}>
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

          {/* Settlement Items / Trips */}
          <Card>
            <CardHeader className="py-3.5 px-5 flex flex-row items-center justify-between border-b">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Settlement Items ({tripLines.length})</CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={loadDriverTrips} disabled={loadingTrips || !form.driver_id}>
                  {loadingTrips ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />} Load Trips
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addTripLine}><Plus className="w-3 h-3" /> Add</Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {colHeaders}
              <div className="space-y-0">
                {tripLines.map((line, i) => (
                  <LineRow key={i} line={line}
                    onChange={(k, v) => setTripLines(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l))}
                    onRemove={() => setTripLines(prev => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
                {tripLines.length === 0 && <p className="text-xs text-muted-foreground text-center py-5">No trips. Select a driver and click "Load Trips" or add manually.</p>}
              </div>
              {tripLines.length > 0 && (
                <div className="flex justify-end mt-3 pt-2 border-t">
                  <span className="text-sm font-bold text-green-700">
                    Gross: ${tripLines.reduce((s, l) => s + (Number(l.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardHeader className="py-3.5 px-5 flex flex-row items-center justify-between border-b">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Deductions ({deductionLines.length})</CardTitle>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {DEFAULT_DEDUCTIONS.map(def => (
                  <Button key={def.description} variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addDefaultDeduction(def)}>
                    <Plus className="w-3 h-3" /> {def.description} ${def.amount}
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addCustomDeduction}><Plus className="w-3 h-3" /> Custom</Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {colHeaders}
              <div className="space-y-0">
                {deductionLines.map((line, i) => (
                  <LineRow key={i} line={line}
                    onChange={(k, v) => setDeductionLines(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l))}
                    onRemove={() => setDeductionLines(prev => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
                {deductionLines.length === 0 && <p className="text-xs text-muted-foreground text-center py-5">No deductions. Use the quick-add buttons above.</p>}
              </div>
              {deductionLines.length > 0 && (
                <div className="flex justify-end mt-3 pt-2 border-t">
                  <span className="text-sm font-bold text-red-600">
                    Deductions: -${deductionLines.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fuel */}
          <Card>
            <CardHeader className="py-3.5 px-5 flex flex-row items-center justify-between border-b">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fuel ({fuelLines.length})</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={loadDriverFuel} disabled={loadingFuel || !form.driver_id}>
                {loadingFuel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Fuel className="w-3 h-3" />} Load Fuel
              </Button>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {colHeaders}
              <div className="space-y-0">
                {fuelLines.map((line, i) => (
                  <LineRow key={i} line={line}
                    onChange={(k, v) => setFuelLines(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l))}
                    onRemove={() => setFuelLines(prev => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
                {fuelLines.length === 0 && <p className="text-xs text-muted-foreground text-center py-5">No fuel. Select a driver and click "Load Fuel".</p>}
              </div>
              {fuelLines.length > 0 && (
                <div className="flex justify-end mt-3 pt-2 border-t">
                  <span className="text-sm font-bold text-orange-600">
                    Fuel: -${fuelLines.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader className="py-3.5 px-5 border-b"><CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Summary</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Driver</span>
                <span className="font-medium">{form.driver_name || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Truck #</span>
                <span className="font-medium font-mono">{form.truck_number || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Period</span>
                <span>{form.period_start && form.period_end ? `${form.period_start} – ${form.period_end}` : '—'}</span>
              </div>
              <div className="border-t my-2" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Gross ({tripLines.length} trips)</span>
                <span className="font-medium text-green-600">${(form.gross_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Deductions</span>
                <span className="font-medium text-red-600">-${(form.deductions_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fuel</span>
                <span className="font-medium text-orange-600">-${(form.fuel_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-semibold text-sm">Net Pay</span>
                <span className="text-2xl font-bold text-primary">${(form.final_check_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-1 space-y-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${form.status === 'finalized' ? 'bg-green-100 text-green-700' : form.status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {form.status?.toUpperCase()}
                </span>
                {form.published && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Eye className="w-3 h-3" /> Visible to driver
                  </div>
                )}
                {!form.published && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <EyeOff className="w-3 h-3" /> Hidden from driver
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}