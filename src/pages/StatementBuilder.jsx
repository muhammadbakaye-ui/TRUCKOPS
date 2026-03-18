import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Cloud, CloudOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, ArrowLeft, Plus, Trash2, CheckCircle, Fuel, Truck, Printer, Eye, EyeOff } from 'lucide-react';
import { logAudit } from '../components/shared/AuditLogger';
import { toast } from 'sonner';
import { printStatement } from '../components/print/printStatement';
import { format, parse } from 'date-fns';
import { getPeriodByDueDate, getAllDueDates } from '@/components/shared/statementCalendar';

const LineRow = React.memo(({ line, onChange, onRemove }) => (
  <div className="grid grid-cols-12 gap-2 items-center py-2 border-b last:border-0">
    <div className="col-span-2">
      <Input type="date" value={line.date || ''} onChange={(e) => onChange('date', e.target.value)} className="h-8 text-xs" />
    </div>
    <div className="col-span-4 flex items-center gap-1">
      <Input value={line.description || ''} onChange={(e) => onChange('description', e.target.value)} className="h-8 text-xs flex-1" placeholder="Description / Load #" />
      {line.internal_load_number && (
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">{line.internal_load_number}</span>
      )}
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
));

const DEFAULT_DEDUCTIONS = [
  { description: 'Insurance', amount: 425 },
  { description: 'IFTA', amount: 50 },
  { description: 'ELD', amount: 15 },
];

export default function StatementBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statementId = searchParams.get('id');
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ status: 'draft', gross_total: 0, deductions_total: 0, fuel_total: 0, final_check_amount: 0 });
  const [tripLines, setTripLines] = useState([]);
  const [deductionLines, setDeductionLines] = useState([]);
  const [fuelLines, setFuelLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingFuel, setLoadingFuel] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const savedIdRef = useRef(statementId);
  const initialLoadRef = useRef(true);

  const updateTripLine = useCallback((index, key, value) => {
    setTripLines(prev => { const n = [...prev]; n[index] = { ...n[index], [key]: value }; return n; });
  }, []);
  const updateDeductionLine = useCallback((index, key, value) => {
    setDeductionLines(prev => { const n = [...prev]; n[index] = { ...n[index], [key]: value }; return n; });
  }, []);
  const updateFuelLine = useCallback((index, key, value) => {
    setFuelLines(prev => { const n = [...prev]; n[index] = { ...n[index], [key]: value }; return n; });
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: () => base44.entities.Truck.list() });
  const { data: carrierCompany = [] } = useQuery({ queryKey: ['settings-company'], queryFn: () => base44.entities.Company.filter({ company_type: 'carrier' }, '-created_date', 1) });

  const handleDateSelect = (date) => {
    if (!date) return;
    if (date.getDay() !== 2) { toast.error('Please select a Tuesday (the due date)'); return; }
    const dateStr = format(date, 'yyyy-MM-dd');
    const period = getPeriodByDueDate(dateStr);
    if (!period) { toast.error('This Tuesday is not a valid statement due date'); return; }
    set('statement_date', period.due);
    set('period_start', period.start);
    set('period_end', period.end);
  };

  const handlePrint = () => {
    const company = carrierCompany[0] || {};
    const allLines = [...tripLines, ...deductionLines, ...fuelLines];
    const driver = drivers.find(d => d.id === form.driver_id);
    const statementWithGross = { ...form, gross_total: (driver?.ytd_gross_legacy || 0) + (tripLines.reduce((s, l) => s + (Number(l.amount) || 0), 0)) };
    printStatement({ company, statement: statementWithGross, allLines });
  };

  // Load existing statement
  useQuery({
    queryKey: ['statement', statementId],
    queryFn: async () => {
      if (!statementId) return null;
      const s = await base44.entities.DriverStatement.get(statementId);
      setForm(s);
      savedIdRef.current = s.id;
      initialLoadRef.current = true;
      const lines = await base44.entities.StatementLine.filter({ statement_id: statementId }, 'date', 200);
      setTripLines(lines.filter(l => ['trip','credit','adjustment'].includes(l.line_type)).sort((a, b) => (a.date||'').localeCompare(b.date||'')).map((l, i) => ({ ...l, _key: l.id || `trip_${i}` })));
      setDeductionLines(lines.filter(l => ['deduction','advance'].includes(l.line_type)).sort((a, b) => (a.date||'').localeCompare(b.date||'')).map((l, i) => ({ ...l, _key: l.id || `ded_${i}` })));
      setFuelLines(lines.filter(l => l.line_type === 'fuel').sort((a, b) => (a.date||'').localeCompare(b.date||'')).map((l, i) => ({ ...l, _key: l.id || `fuel_${i}` })));
      return s;
    },
    enabled: !!statementId,
  });

  // Auto-calculate totals
  useEffect(() => {
    const driver = drivers.find(d => d.id === form.driver_id);
    const legacyGross = driver?.ytd_gross_legacy || 0;
    const newGross = tripLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const deductions = deductionLines.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0);
    const fuel = fuelLines.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0);
    setForm(prev => ({
      ...prev,
      gross_total: legacyGross + newGross,
      deductions_total: deductions,
      fuel_total: fuel,
      final_check_amount: newGross - deductions - fuel,
    }));
  }, [tripLines, deductionLines, fuelLines, form.driver_id, drivers]);

  const persistStatement = useCallback(async (currentForm, currentTrips, currentDeductions, currentFuel, overrideStatus) => {
    const driver = drivers.find(d => d.id === currentForm.driver_id);
    const truck = trucks.find(t => t.id === currentForm.truck_id);
    const payload = {
      ...currentForm,
      status: overrideStatus || currentForm.status,
      driver_name: driver?.full_name || currentForm.driver_name,
      truck_number: truck?.unit_number || currentForm.truck_number,
    };

    let savedId = savedIdRef.current;
    if (!savedId) {
      const s = await base44.entities.DriverStatement.create(payload);
      savedId = s.id;
      savedIdRef.current = savedId;
      window.history.replaceState({}, '', `?id=${savedId}`);
      await logAudit({ action_type: 'create', entity_type: 'DriverStatement', entity_id: savedId, entity_label: `${payload.driver_name} ${payload.period_start}` });
    } else {
      await base44.entities.DriverStatement.update(savedId, payload);
    }

    const existingLines = await base44.entities.StatementLine.filter({ statement_id: savedId }, 'date', 200);
    for (const el of existingLines) await base44.entities.StatementLine.delete(el.id);
    const allLines = [...currentTrips, ...currentDeductions, ...currentFuel];
    for (const line of allLines) {
      const { id, _key, ...lineData } = line;
      await base44.entities.StatementLine.create({ ...lineData, statement_id: savedId });
    }
    return savedId;
  }, [drivers, trucks]);

  // Auto-save: debounce 2.5s, keep status as draft
  useEffect(() => {
    if (initialLoadRef.current) { initialLoadRef.current = false; return; }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        await persistStatement(form, tripLines, deductionLines, fuelLines);
        setLastAutoSaved(new Date());
      } catch (e) { /* silent */ } finally {
        setAutoSaving(false);
      }
    }, 2500);
    return () => clearTimeout(autoSaveTimerRef.current);
  }, [form, tripLines, deductionLines, fuelLines]);

  const handleSave = async (finalize = false) => {
    setSaving(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    try {
      const newStatus = finalize ? 'finalized' : form.status;
      await persistStatement(form, tripLines, deductionLines, fuelLines, newStatus);
      if (finalize) {
        setForm(prev => ({ ...prev, status: 'finalized' }));
        await logAudit({ action_type: 'finalize', entity_type: 'DriverStatement', entity_id: savedIdRef.current });
      }
      queryClient.invalidateQueries({ queryKey: ['statements'] });
      toast.success(finalize ? 'Statement finalized' : 'Statement saved');
      setLastAutoSaved(new Date());
      if (!statementId && savedIdRef.current) navigate(createPageUrl(`StatementBuilder?id=${savedIdRef.current}`));
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const loadDriverTrips = async () => {
    if (!form.driver_id) return toast.error('Select a driver first');
    if (!form.period_start || !form.period_end) return toast.error('Select a statement date first');
    setLoadingTrips(true);
    try {
      const driver = drivers.find(d => d.id === form.driver_id);
      const loads = await base44.entities.Load.filter({ driver_1_id: form.driver_id }, '-created_date', 500);
      const extractTripNum = (desc) => { if (!desc) return null; const m = desc.match(/_(\d{3})_/); return m ? m[1] : null; };
      const filteredLoads = loads.filter(l => { const d = l.delivery_date || l.pickup_date; return d && d >= form.period_start && d <= form.period_end; });
      const newLines = filteredLoads.sort((a, b) => (a.delivery_date||a.pickup_date||'').localeCompare(b.delivery_date||b.pickup_date||'')).map((l, idx) => {
        const tripNum = l.trip_number || extractTripNum(l.external_load_number) || extractTripNum(l.customer_reference_number) || extractTripNum(l.internal_load_number);
        const loadRevenue = l.invoice_amount || l.freight_rate || 0;
        let driverPay = loadRevenue;
        if (driver?.pay_type && driver?.pay_rate) {
          if (driver.pay_type === 'percentage') driverPay = loadRevenue * (driver.pay_rate / 100);
          else if (driver.pay_type === 'per_mile' && l.billable_miles) driverPay = l.billable_miles * driver.pay_rate;
          else if (driver.pay_type === 'flat_rate') driverPay = driver.pay_rate;
        }
        const externalNum = l.external_load_number || '';
        const loadRef = tripNum ? `${tripNum} / ${externalNum || l.internal_load_number}` : (externalNum || l.internal_load_number || '');
        return {
          _key: l.id || `trip_${Date.now()}_${idx}`,
          line_type: 'trip', source_id: l.id, source_type: 'load',
          date: l.delivery_date || l.pickup_date || '',
          description: l.customer_name ? `${loadRef} — ${l.customer_name}` : loadRef,
          route: `${l.pickup_city || ''}${l.pickup_state ? `, ${l.pickup_state}` : ''} → ${l.delivery_city || ''}${l.delivery_state ? `, ${l.delivery_state}` : ''}`,
          amount: driverPay, internal_load_number: l.internal_load_number || '',
        };
      });
      setTripLines(newLines);
      toast.success(`Loaded ${newLines.length} trips`);
    } catch (err) { toast.error('Failed to load trips'); } finally { setLoadingTrips(false); }
  };

  const loadDriverFuel = async () => {
    if (!form.driver_id) return toast.error('Select a driver first');
    if (!form.period_start || !form.period_end) return toast.error('Select a statement date first');
    setLoadingFuel(true);
    try {
      const txs = await base44.entities.FuelTransaction.filter({ matched_driver_id: form.driver_id }, '-created_date', 500);
      const filteredTxs = txs.filter(tx => tx.transaction_date && tx.transaction_date >= form.period_start && tx.transaction_date <= form.period_end);
      const existingIds = new Set(fuelLines.map(l => l.source_id));
      const newLines = filteredTxs.filter(tx => !existingIds.has(tx.id))
        .sort((a, b) => (a.transaction_date||'').localeCompare(b.transaction_date||''))
        .map(tx => {
          const city = (tx.city && tx.city !== 'null') ? tx.city : '';
          const state = (tx.state && tx.state !== 'null') ? tx.state : '';
          const gallons = (tx.gallons && tx.gallons !== 'null') ? tx.gallons : '';
          const cityState = [city, state].filter(Boolean).join(', ');
          const fuelCost = (tx.fuel_amount && tx.fuel_amount > 0) ? tx.fuel_amount : (tx.total_amount || 0);
          return {
            _key: tx.id || `fuel_${Date.now()}_${Math.random()}`,
            line_type: 'fuel', source_id: tx.id, source_type: 'fuel_transaction',
            date: tx.transaction_date || '',
            description: ['Fuel', cityState, gallons ? `(${gallons} gal)` : ''].filter(Boolean).join(' - '),
            card_number: (tx.card_number && tx.card_number !== 'null') ? tx.card_number : '',
            location_name: (tx.location_name && tx.location_name !== 'null') ? tx.location_name : '',
            city_state: cityState, amount: fuelCost,
          };
        });
      setFuelLines(prev => [...prev, ...newLines]);
      toast.success(`Loaded ${newLines.length} fuel transaction${newLines.length !== 1 ? 's' : ''}`);
    } catch (err) { toast.error('Failed to load fuel'); } finally { setLoadingFuel(false); }
  };

  const addDefaultDeduction = (def) => setDeductionLines(prev => [...prev, { _key: `ded_${Date.now()}`, line_type: 'deduction', date: form.statement_date || new Date().toISOString().split('T')[0], description: def.description, amount: def.amount }]);
  const addCustomDeduction = () => setDeductionLines(prev => [...prev, { _key: `ded_${Date.now()}`, line_type: 'deduction', date: new Date().toISOString().split('T')[0], description: '', amount: 0 }]);
  const addTripLine = () => setTripLines(prev => [...prev, { _key: `trip_${Date.now()}`, line_type: 'trip', date: new Date().toISOString().split('T')[0], description: '', route: '', amount: 0 }]);
  const addCustomFuel = () => setFuelLines(prev => [...prev, { _key: `fuel_${Date.now()}`, line_type: 'fuel', date: form.statement_date || new Date().toISOString().split('T')[0], description: '', card_number: '', location_name: '', city_state: '', amount: 0 }]);

  const colHeaders = (
    <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-0 mb-1 pb-2 border-b">
      <div className="col-span-2">Date</div>
      <div className="col-span-4">Description / Load #</div>
      <div className="col-span-3">Route</div>
      <div className="col-span-2 text-right">Amount ($)</div>
      <div className="col-span-1"></div>
    </div>
  );

  const isDraft = form.status === 'draft';

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => navigate(createPageUrl('DriverStatements'))}>
          <ArrowLeft className="w-3.5 h-3.5" /> Statements
        </Button>
        <h2 className="text-sm font-semibold">{(statementId || savedIdRef.current) ? `Statement — ${form.driver_name || ''}` : 'New Driver Statement'}</h2>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${form.status === 'saved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {form.status?.toUpperCase()}
        </span>
        {isDraft && (
          <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            {autoSaving
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Auto-saving…</>
              : lastAutoSaved
              ? <><Cloud className="w-3 h-3" /> Draft auto-saved</>
              : <><CloudOff className="w-3 h-3" /> Unsaved draft</>
            }
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            variant={form.published ? "default" : "outline"}
            size="sm" className="h-8 gap-1"
            onClick={async () => { set('published', !form.published); await handleSave(false); }}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (form.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />)}
            {form.published ? 'Published' : 'Unpublished'}
          </Button>
          <Button size="sm" className="h-8 gap-1" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </Button>
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
                  const d = drivers.find(dr => dr.id === v);
                  setForm(prev => {
                    const updates = { ...prev, driver_id: v, driver_name: d?.full_name || '' };
                    if (d?.assigned_truck_id) {
                      const t = trucks.find(tr => tr.id === d.assigned_truck_id);
                      if (t) { updates.truck_id = t.id; updates.truck_number = t.unit_number; }
                    }
                    return updates;
                  });
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
                <Label className="text-xs">Due Date (Tuesday)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 text-xs mt-1 w-full justify-start font-normal">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {form.statement_date ? format(parse(form.statement_date, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy') : 'Select Tuesday Due Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.statement_date ? parse(form.statement_date, 'yyyy-MM-dd', new Date()) : undefined}
                      onSelect={handleDateSelect}
                      modifiers={{ validTuesday: (date) => getAllDueDates().includes(format(date, 'yyyy-MM-dd')) }}
                      modifiersClassNames={{ validTuesday: 'bg-primary/10 font-bold text-primary' }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">Period Start (Sunday)</Label>
                <Input type="text" value={form.period_start ? `${format(parse(form.period_start, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')} (Sun)` : ''} readOnly className="h-8 text-xs mt-1 bg-muted" />
              </div>
              <div>
                <Label className="text-xs">Period End (Saturday)</Label>
                <Input type="text" value={form.period_end ? `${format(parse(form.period_end, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')} (Sat)` : ''} readOnly className="h-8 text-xs mt-1 bg-muted" />
              </div>
            </CardContent>
          </Card>

          {/* Settlement Items */}
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
              {tripLines.map((line, i) => <LineRow key={line._key || i} line={line} onChange={(k, v) => updateTripLine(i, k, v)} onRemove={() => setTripLines(prev => prev.filter((_, idx) => idx !== i))} />)}
              {tripLines.length === 0 && <p className="text-xs text-muted-foreground text-center py-5">No trips. Select a driver and click "Load Trips" or add manually.</p>}
              {tripLines.length > 0 && <div className="flex justify-end mt-3 pt-2 border-t"><span className="text-sm font-bold text-green-700">Gross: ${tripLines.reduce((s, l) => s + (Number(l.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
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
              {deductionLines.map((line, i) => <LineRow key={line._key || i} line={line} onChange={(k, v) => updateDeductionLine(i, k, v)} onRemove={() => setDeductionLines(prev => prev.filter((_, idx) => idx !== i))} />)}
              {deductionLines.length === 0 && <p className="text-xs text-muted-foreground text-center py-5">No deductions. Use the quick-add buttons above.</p>}
              {deductionLines.length > 0 && <div className="flex justify-end mt-3 pt-2 border-t"><span className="text-sm font-bold text-red-600">Deductions: -${deductionLines.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            </CardContent>
          </Card>

          {/* Fuel */}
          <Card>
            <CardHeader className="py-3.5 px-5 flex flex-row items-center justify-between border-b">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fuel ({fuelLines.length})</CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={loadDriverFuel} disabled={loadingFuel || !form.driver_id}>
                  {loadingFuel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Fuel className="w-3 h-3" />} Load Fuel
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addCustomFuel}><Plus className="w-3 h-3" /> Add</Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {colHeaders}
              {fuelLines.map((line, i) => <LineRow key={line._key || i} line={line} onChange={(k, v) => updateFuelLine(i, k, v)} onRemove={() => setFuelLines(prev => prev.filter((_, idx) => idx !== i))} />)}
              {fuelLines.length === 0 && <p className="text-xs text-muted-foreground text-center py-5">No fuel. Select a driver and click "Load Fuel".</p>}
              {fuelLines.length > 0 && <div className="flex justify-end mt-3 pt-2 border-t"><span className="text-sm font-bold text-orange-600">Fuel: -${fuelLines.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader className="py-3.5 px-5 border-b"><CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Summary</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Driver</span><span className="font-medium">{form.driver_name || '—'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Truck #</span><span className="font-medium font-mono">{form.truck_number || '—'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Period</span><span>{form.period_start && form.period_end ? `${form.period_start} – ${form.period_end}` : '—'}</span></div>
              <div className="border-t my-2" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Gross ({tripLines.length} trips)</span>
                <div className="text-right">
                  <span className="font-medium text-green-600">${tripLines.reduce((s, l) => s + (Number(l.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  {drivers.find(d => d.id === form.driver_id)?.ytd_gross_legacy > 0 && (
                    <div className="text-[10px] text-muted-foreground">Legacy: ${(drivers.find(d => d.id === form.driver_id).ytd_gross_legacy || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} + New: ${tripLines.reduce((s, l) => s + (Number(l.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Deductions</span><span className="font-medium text-red-600">-${(form.deductions_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Fuel</span><span className="font-medium text-orange-600">-${(form.fuel_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-semibold text-sm">Net Pay</span>
                <span className="text-2xl font-bold text-primary">${(form.final_check_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-1 space-y-2">
                {form.published
                  ? <div className="flex items-center gap-1 text-xs text-green-600"><Eye className="w-3 h-3" /> Visible to driver</div>
                  : <div className="flex items-center gap-1 text-xs text-muted-foreground"><EyeOff className="w-3 h-3" /> Hidden from driver</div>
                }
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}