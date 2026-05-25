import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DAY_NAMES, getRecentPeriods } from '@/components/shared/statementCalendar';
import { format, parseISO } from 'date-fns';
import { Truck, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function OnboardingFlow({ session, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Company Info
  const [co, setCo] = useState({
    company_name: '', dot_number: '', mc_number: '',
    address_1: '', city: '', state: '', zip: '',
    phone: '', email: '', po_box: '',
  });
  const setCoField = (k, v) => setCo(prev => ({ ...prev, [k]: v }));

  // Step 2 — Statement Settings
  const [weekStart, setWeekStart] = useState(0);
  const [dueDay, setDueDay] = useState(2);
  const preview = getRecentPeriods(0, 3, { weekStart, dueDay });
  const periodEndDay = DAY_NAMES[(weekStart + 6) % 7];

  const callAuthAdmin = async (payload) => {
    const res = await base44.functions.invoke('authAdmin', {
      email: session.admin_email,
      session_token: session.session_token,
      ...payload,
    });
    return res.data;
  };

  const markComplete = async () => {
    await callAuthAdmin({ action: 'update_settings', onboarding_completed: true });
    onComplete();
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await markComplete();
      toast.info('You can complete your setup anytime in Settings.');
    } finally { setSaving(false); }
  };

  const handleNext = () => {
    if (!co.company_name.trim()) {
      toast.error('Please enter your company name.');
      return;
    }
    setStep(2);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (co.company_name.trim()) {
        const existing = await base44.entities.Company.filter(
          { company_type: 'carrier', tenant_id: session.tenant_id }, '-created_date', 1
        );
        const payload = { ...co, company_type: 'carrier', tenant_id: session.tenant_id };
        if (existing.length) {
          await base44.entities.Company.update(existing[0].id, payload);
        } else {
          await base44.entities.Company.create(payload);
        }
      }
      await callAuthAdmin({
        action: 'update_settings',
        statement_week_start: weekStart,
        statement_due_day: dueDay,
        onboarding_completed: true,
      });
      // Persist statement settings cache
      try {
        localStorage.setItem('truckops_statement_settings', JSON.stringify({ weekStart, dueDay }));
      } catch {}
      onComplete();
      toast.success('Welcome to TruckOps! Your account is all set.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-sidebar flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-sidebar px-8 pt-8 pb-6 text-center border-b border-sidebar-border">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-sidebar-foreground tracking-tight">TruckOps</span>
          </div>
          <h1 className="text-lg font-semibold text-sidebar-foreground">Let's get your account set up</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Just two quick steps and you're ready to go.</p>

          {/* Progress */}
          <div className="flex items-center justify-center gap-3 mt-5">
            {[1, 2].map(n => (
              <div key={n} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > n ? 'bg-green-600 text-white' :
                  step === n ? 'bg-sidebar-primary text-white' :
                  'bg-sidebar-accent text-sidebar-foreground/40'
                }`}>
                  {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
                </div>
                <span className={`text-xs ${step === n ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/40'}`}>
                  {n === 1 ? 'Company Info' : 'Statement Settings'}
                </span>
                {n < 2 && <div className={`w-8 h-px ${step > n ? 'bg-green-600' : 'bg-sidebar-border'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
          {step === 1 ? (
            <div className="space-y-4">
              <Field label="Company Name" required>
                <Input value={co.company_name} onChange={e => setCoField('company_name', e.target.value)} placeholder="Unity Transportation LLC" className="h-9 text-sm" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="DOT Number">
                  <Input value={co.dot_number} onChange={e => setCoField('dot_number', e.target.value)} placeholder="1234567" className="h-9 text-sm" />
                </Field>
                <Field label="MC Number">
                  <Input value={co.mc_number} onChange={e => setCoField('mc_number', e.target.value)} placeholder="MC-123456" className="h-9 text-sm" />
                </Field>
              </div>
              <Field label="Company Address">
                <Input value={co.address_1} onChange={e => setCoField('address_1', e.target.value)} placeholder="123 Main St" className="h-9 text-sm" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <Field label="City">
                    <Input value={co.city} onChange={e => setCoField('city', e.target.value)} className="h-9 text-sm" />
                  </Field>
                </div>
                <div className="col-span-1">
                  <Field label="State">
                    <Select value={co.state} onValueChange={v => setCoField('state', v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="col-span-1">
                  <Field label="ZIP">
                    <Input value={co.zip} onChange={e => setCoField('zip', e.target.value)} className="h-9 text-sm" />
                  </Field>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone Number">
                  <Input value={co.phone} onChange={e => setCoField('phone', e.target.value)} placeholder="(555) 123-4567" className="h-9 text-sm" />
                </Field>
                <Field label="P.O. Box">
                  <Input value={co.po_box} onChange={e => setCoField('po_box', e.target.value)} placeholder="P.O. Box 1234" className="h-9 text-sm" />
                </Field>
              </div>
              <Field label="Email">
                <Input type="email" value={co.email} onChange={e => setCoField('email', e.target.value)} placeholder="dispatch@company.com" className="h-9 text-sm" />
              </Field>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Period Starts On">
                  <Select value={String(weekStart)} onValueChange={v => setWeekStart(Number(v))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">Ends on {periodEndDay}</p>
                </Field>
                <Field label="Statement Due Day">
                  <Select value={String(dueDay)} onValueChange={v => setDueDay(Number(v))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">Following week</p>
                </Field>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Preview — Next 4 Periods</p>
                <div className="border rounded-lg divide-y text-xs overflow-hidden">
                  <div className="grid grid-cols-3 bg-muted px-3 py-2 font-semibold text-muted-foreground">
                    <span>Period Start</span><span>Period End</span><span>Due Date</span>
                  </div>
                  {preview.map((p, i) => (
                    <div key={i} className={`grid grid-cols-3 px-3 py-2 ${i === 0 ? 'bg-primary/5 font-medium' : ''}`}>
                      <span>{format(parseISO(p.start), 'MMM d, yyyy')}</span>
                      <span>{format(parseISO(p.end), 'MMM d, yyyy')}</span>
                      <span className="text-primary font-semibold">{format(parseISO(p.due), 'MMM d, yyyy')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 pt-4 border-t border-border bg-card flex flex-col items-center gap-3">
          <div className="flex w-full gap-3">
            {step === 2 && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setStep(1)} disabled={saving}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
            )}
            <Button
              size="sm"
              className="h-9 flex-1"
              onClick={step === 1 ? handleNext : handleFinish}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (step === 1 ? 'Next →' : 'Finish Setup')}
            </Button>
          </div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            onClick={handleSkip}
            disabled={saving}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}