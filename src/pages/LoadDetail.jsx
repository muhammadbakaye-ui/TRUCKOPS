import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, ArrowLeft, Plus, Trash2, Printer, Cloud, CloudOff } from 'lucide-react';
import StatusBadge from '../components/shared/StatusBadge';
import { logAudit } from '../components/shared/AuditLogger';
import { toast } from 'sonner';
import { printLoad } from '../components/print/printLoad';

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return <Input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-xs" />;
}

function Sel({ value, onChange, options }) {
  const label = options.find(o => o.value === value)?.label || '';
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={label || 'Select...'} /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export default function LoadDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loadId = searchParams.get('id');
  const isNew = searchParams.get('new') === '1';
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [stops, setStops] = useState([]);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const savedLoadIdRef = useRef(loadId); // tracks the ID even for new loads
  const initialLoadRef = useRef(true); // skip first render for autosave

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const { data: load, isLoading } = useQuery({
    queryKey: ['load', loadId],
    queryFn: async () => {
      if (isNew || !loadId) return null;
      const l = await base44.entities.Load.get(loadId);
      setForm(l);
      return l;
    },
    enabled: !isNew && !!loadId,
  });

  const { data: loadStops = [] } = useQuery({
    queryKey: ['load-stops', loadId],
    queryFn: async () => {
      if (!loadId || isNew) return [];
      const s = await base44.entities.LoadStop.filter({ load_id: loadId }, 'stop_order', 20);
      setStops(s);
      return s;
    },
    enabled: !!loadId && !isNew,
  });

  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: () => base44.entities.Truck.list() });
  const { data: trailers = [] } = useQuery({ queryKey: ['trailers'], queryFn: () => base44.entities.Trailer.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: carrierCompany = [] } = useQuery({ queryKey: ['settings-company'], queryFn: () => base44.entities.Company.filter({ company_type: 'carrier' }, '-created_date', 1) });

  const handlePrint = () => {
    printLoad({ company: carrierCompany[0] || {}, load: form, stops, drivers, trucks, trailers: trailers });
  };

  // Initialize empty form for new load
  React.useEffect(() => {
    if (isNew && !form) {
      setForm({
        status: 'draft', invoice_status: 'not_invoiced', dispatch_status: 'delivered',
        load_type: 'FTL', hazmat: false, sealed: false, tonu: false, canceled: false,
      });
      setStops([
        { stop_type: 'pickup', stop_order: 1, company_name: '', city: '', state: '', zip: '', appointment_date: '', time_from: '', time_to: '' },
        { stop_type: 'delivery', stop_order: 2, company_name: '', city: '', state: '', zip: '', appointment_date: '', time_from: '', time_to: '' },
      ]);
    }
  }, [isNew]);

  // Auto-save as draft whenever form/stops change
  const performAutoSave = useCallback(async (currentForm, currentStops) => {
    if (!currentForm) return;
    setAutoSaving(true);
    try {
      const currentId = savedLoadIdRef.current;
        if (!currentId) {
          // First auto-save: create the record
          const existingLoads = await base44.entities.Load.list('-created_date', 1);
          const lastNum = existingLoads.length > 0
            ? parseInt(existingLoads[0].internal_load_number?.replace(/\D/g, '') || '1000')
            : 1000;
          const derived = deriveStopFields(currentForm, currentStops);
          const payload = { ...derived, status: 'draft', internal_load_number: currentForm.internal_load_number || `L-${lastNum + 1}` };
        const savedLoad = await base44.entities.Load.create(payload);
        savedLoadIdRef.current = savedLoad.id;
        for (let i = 0; i < currentStops.length; i++) {
          await base44.entities.LoadStop.create({ ...currentStops[i], load_id: savedLoad.id, stop_order: i + 1 });
        }
        // Navigate to the new ID without losing the "editing" state
        window.history.replaceState({}, '', `?id=${savedLoad.id}`);
      } else {
        // Subsequent auto-saves: update
        await base44.entities.Load.update(currentId, { ...currentForm, status: currentForm.status === 'draft' ? 'draft' : currentForm.status });
        const existingStops = await base44.entities.LoadStop.filter({ load_id: currentId }, 'stop_order', 20);
        for (const es of existingStops) {
          if (!currentStops.find(s => s.id === es.id)) await base44.entities.LoadStop.delete(es.id);
        }
        for (let i = 0; i < currentStops.length; i++) {
          const s = { ...currentStops[i], load_id: currentId, stop_order: i + 1 };
          if (s.id) await base44.entities.LoadStop.update(s.id, s);
          else await base44.entities.LoadStop.create(s);
        }
      }
      setLastAutoSaved(new Date());
    } catch (err) {
      // silent fail for auto-save
    } finally {
      setAutoSaving(false);
    }
  }, []);

  // Debounce: trigger auto-save 2.5s after last change
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    if (!form) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave(form, stops);
    }, 2500);
    return () => clearTimeout(autoSaveTimerRef.current);
  }, [form, stops]);

  // Proper save: promote status from draft to active (or keep whatever status user set)
  const handleSave = async () => {
    setSaving(true);
    try {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      const currentId = savedLoadIdRef.current || loadId;
      const saveStatus = form.status === 'draft' ? 'saved' : form.status;
      const payload = { ...form, status: saveStatus };

      if (!currentId) {
        // Never auto-saved yet
        const existingLoads = await base44.entities.Load.list('-created_date', 1);
        const lastNum = existingLoads.length > 0
          ? parseInt(existingLoads[0].internal_load_number?.replace(/\D/g, '') || '1000')
          : 1000;
        const finalPayload = { ...payload, internal_load_number: form.internal_load_number || `L-${lastNum + 1}` };
        const savedLoad = await base44.entities.Load.create(finalPayload);
        for (let i = 0; i < stops.length; i++) {
          await base44.entities.LoadStop.create({ ...stops[i], load_id: savedLoad.id, stop_order: i + 1 });
        }
        await logAudit({ action_type: 'create', entity_type: 'Load', entity_id: savedLoad.id, entity_label: savedLoad.internal_load_number });
        navigate(createPageUrl(`LoadDetail?id=${savedLoad.id}`));
      } else {
        await base44.entities.Load.update(currentId, payload);
        setForm(prev => ({ ...prev, status: saveStatus }));
        const existingStops = await base44.entities.LoadStop.filter({ load_id: currentId }, 'stop_order', 20);
        for (const es of existingStops) {
          if (!stops.find(s => s.id === es.id)) await base44.entities.LoadStop.delete(es.id);
        }
        for (let i = 0; i < stops.length; i++) {
          const s = { ...stops[i], load_id: currentId, stop_order: i + 1 };
          if (s.id) await base44.entities.LoadStop.update(s.id, s);
          else await base44.entities.LoadStop.create(s);
        }
        await logAudit({ action_type: 'update', entity_type: 'Load', entity_id: currentId, entity_label: form.internal_load_number });
        queryClient.invalidateQueries({ queryKey: ['load', currentId] });
        toast.success('Load saved');
        if (isNew) navigate(createPageUrl(`LoadDetail?id=${currentId}`));
      }
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Derive pickup/delivery fields from stops
  const deriveStopFields = (currentForm, currentStops) => {
    const firstPickup = currentStops.find(s => s.stop_type === 'pickup');
    const lastDelivery = [...currentStops].reverse().find(s => s.stop_type === 'delivery');
    return {
      ...currentForm,
      pickup_date: firstPickup?.appointment_date || currentForm.pickup_date || '',
      pickup_city: firstPickup?.city || currentForm.pickup_city || '',
      pickup_state: firstPickup?.state || currentForm.pickup_state || '',
      delivery_date: lastDelivery?.appointment_date || currentForm.delivery_date || '',
      delivery_city: lastDelivery?.city || currentForm.delivery_city || '',
      delivery_state: lastDelivery?.state || currentForm.delivery_state || '',
    };
  };

  const addStop = () => setStops(prev => [...prev, { stop_type: 'stop', stop_order: prev.length + 1, company_name: '', city: '', state: '' }]);
  const removeStop = (i) => setStops(prev => prev.filter((_, idx) => idx !== i));
  const setStop = (i, key, val) => setStops(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s));

  if (!isNew && isLoading) return <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;
  if (!form) return null;

  return (
    <div className="p-4 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => navigate(createPageUrl('Loads'))}>
          <ArrowLeft className="w-3.5 h-3.5" /> Loads
        </Button>
        <h2 className="text-sm font-semibold">
          {(isNew && !savedLoadIdRef.current) ? 'New Load' : `Load ${form.internal_load_number}`}
        </h2>
        <StatusBadge status={form.status} />
        {/* Auto-save indicator */}
        {form.status === 'draft' && (
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
          <Button size="sm" className="h-8 gap-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {form.status === 'draft' ? 'Save' : 'Save'}
          </Button>
          {(loadId || savedLoadIdRef.current) && (
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Load Info */}
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Load Information</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 grid grid-cols-3 gap-3">
              <Field label="Internal Load #"><TextInput value={form.internal_load_number} onChange={(v) => set('internal_load_number', v)} /></Field>
              <Field label="External / Broker Load #"><TextInput value={form.external_load_number} onChange={(v) => set('external_load_number', v)} /></Field>
              <Field label="Trip #"><TextInput value={form.trip_number} onChange={(v) => set('trip_number', v)} /></Field>
              <Field label="Customer Ref #"><TextInput value={form.customer_reference_number} onChange={(v) => set('customer_reference_number', v)} /></Field>
              <Field label="Customer">
                <Select value={form.customer_id || ''} onValueChange={(v) => {
                  const c = companies.find(c => c.id === v);
                  set('customer_id', v); set('customer_name', c?.company_name || '');
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Status"><Sel value={form.status} onChange={(v) => set('status', v)} options={[{value:'draft',label:'Draft'},{value:'saved',label:'Saved'},{value:'completed',label:'Completed'},{value:'canceled',label:'Canceled'}]} /></Field>
              <Field label="Dispatch Status"><Sel value={form.dispatch_status} onChange={(v) => set('dispatch_status', v)} options={[{value:'pending',label:'Pending'},{value:'dispatched',label:'Dispatched'},{value:'in_transit',label:'In Transit'},{value:'delivered',label:'Delivered'},{value:'completed',label:'Completed'}]} /></Field>
              <Field label="Load Type"><Sel value={form.load_type} onChange={(v) => set('load_type', v)} options={['FTL','LTL','partial','other'].map(v=>({value:v,label:v.toUpperCase()}))} /></Field>
              <Field label="Equipment"><Sel value={form.equipment_type} onChange={(v) => set('equipment_type', v)} options={['dry_van','reefer','flatbed','step_deck','lowboy','tanker','intermodal','other'].map(v=>({value:v,label:v.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}))} /></Field>
              <Field label="Commodity"><TextInput value={form.commodity} onChange={(v) => set('commodity', v)} /></Field>
              <Field label="Weight (lbs)"><Input type="number" value={form.weight || ''} onChange={(e) => set('weight', Number(e.target.value))} className="h-8 text-xs" /></Field>
            </CardContent>
          </Card>

          {/* Stops */}
          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stops</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addStop}><Plus className="w-3 h-3" /> Add Stop</Button>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {stops.map((stop, i) => (
                <div key={i} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold uppercase ${stop.stop_type === 'pickup' ? 'text-blue-600' : stop.stop_type === 'delivery' ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {stop.stop_type} #{i + 1}
                    </span>
                    {stops.length > 2 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeStop(i)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-[10px]">Type</Label>
                      <Sel value={stop.stop_type} onChange={(v) => setStop(i, 'stop_type', v)} options={[{value:'pickup',label:'Pickup'},{value:'delivery',label:'Delivery'},{value:'stop',label:'Stop'}]} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-[10px]">Company</Label>
                      <TextInput value={stop.company_name} onChange={(v) => setStop(i, 'company_name', v)} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Date</Label>
                      <Input type="date" value={stop.appointment_date || ''} onChange={(e) => setStop(i, 'appointment_date', e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Time From</Label>
                      <TextInput value={stop.time_from} onChange={(v) => setStop(i, 'time_from', v)} placeholder="08:00" />
                    </div>
                    <div>
                      <Label className="text-[10px]">City</Label>
                      <TextInput value={stop.city} onChange={(v) => setStop(i, 'city', v)} />
                    </div>
                    <div>
                      <Label className="text-[10px]">State</Label>
                      <TextInput value={stop.state} onChange={(v) => setStop(i, 'state', v)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px]">Reference / BOL #</Label>
                      <TextInput value={stop.reference_number} onChange={(v) => setStop(i, 'reference_number', v)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px]">Directions / Notes</Label>
                      <TextInput value={stop.memo} onChange={(v) => setStop(i, 'memo', v)} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignment</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <Field label="Driver 1">
                <Select value={form.driver_1_id || ''} onValueChange={(v) => {
                  const d = drivers.find(d => d.id === v);
                  set('driver_1_id', v); set('driver_1_name', d?.full_name || '');
                  // Auto-select truck if driver has assigned truck
                  if (d?.assigned_truck_id) {
                    const t = trucks.find(t => t.id === d.assigned_truck_id);
                    if (t) {
                      set('truck_id', t.id);
                      set('truck_number', t.unit_number);
                    }
                  }
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Driver 2">
                <Select value={form.driver_2_id || ''} onValueChange={(v) => {
                  const d = drivers.find(d => d.id === v);
                  set('driver_2_id', v); set('driver_2_name', d?.full_name || '');
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select driver (optional)" /></SelectTrigger>
                  <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Truck">
                <Select value={form.truck_id || ''} onValueChange={(v) => {
                  const t = trucks.find(t => t.id === v);
                  set('truck_id', v); set('truck_number', t?.unit_number || '');
                  // Auto-select driver if truck has assigned driver
                  if (t?.assigned_driver_id) {
                    const d = drivers.find(d => d.id === t.assigned_driver_id);
                    if (d && !form.driver_1_id) {
                      set('driver_1_id', d.id);
                      set('driver_1_name', d.full_name);
                    }
                  }
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select truck" /></SelectTrigger>
                  <SelectContent>{trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.unit_number} {t.make} {t.model}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Trailer">
                <Select value={form.trailer_id || ''} onValueChange={(v) => {
                  const t = trailers.find(t => t.id === v);
                  set('trailer_id', v); set('trailer_number', t?.unit_number || '');
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select trailer" /></SelectTrigger>
                  <SelectContent>{trailers.map(t => <SelectItem key={t.id} value={t.id}>{t.unit_number} ({t.trailer_type})</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financials</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <Field label="Freight Rate ($)"><Input type="number" value={form.freight_rate || ''} onChange={(e) => { set('freight_rate', Number(e.target.value)); set('invoice_amount', Number(e.target.value) + (form.fuel_surcharge || 0)); }} className="h-8 text-xs" /></Field>
              <Field label="Fuel Surcharge ($)"><Input type="number" value={form.fuel_surcharge || ''} onChange={(e) => { set('fuel_surcharge', Number(e.target.value)); set('invoice_amount', (form.freight_rate || 0) + Number(e.target.value)); }} className="h-8 text-xs" /></Field>
              <Field label="Extra Charges ($)"><Input type="number" value={form.extra_charges || ''} onChange={(e) => set('extra_charges', Number(e.target.value))} className="h-8 text-xs" /></Field>
              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground">Invoice Total</p>
                <p className="text-xl font-bold">${((form.freight_rate || 0) + (form.fuel_surcharge || 0) + (form.extra_charges || 0)).toLocaleString()}</p>
              </div>
              <Field label="Invoice Status"><Sel value={form.invoice_status} onChange={(v) => set('invoice_status', v)} options={['not_invoiced','invoiced','sent','partial','paid','overdue','canceled'].map(v=>({value:v,label:v.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}))} /></Field>
              <Field label="Billable Miles"><Input type="number" value={form.billable_miles || ''} onChange={(e) => set('billable_miles', Number(e.target.value))} className="h-8 text-xs" /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4">
              <Textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} className="text-xs h-24" placeholder="Internal notes..." />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}