import React, { useState, useMemo, useEffect } from 'react';
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
import { Plus, Trash2, Pencil, Loader2, Map } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import { toast } from 'sonner';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// Approximate state fuel tax rates (cents per gallon) - 2024 averages
const STATE_TAX_RATES = {
  AL: 0.18, AR: 0.215, AZ: 0.19, CA: 0.5695, CO: 0.22, CT: 0.345, DC: 0.235, DE: 0.235,
  FL: 0.2565, GA: 0.215, IA: 0.309, ID: 0.25, IL: 0.384, IN: 0.315, KS: 0.245, KY: 0.265,
  LA: 0.2, MA: 0.273, MD: 0.235, ME: 0.255, MI: 0.309, MN: 0.285, MO: 0.236, MS: 0.184,
  MT: 0.2725, NC: 0.2995, ND: 0.23, NE: 0.275, NH: 0.247, NJ: 0.225, NM: 0.27, NV: 0.26,
  NY: 0.339, OH: 0.385, OK: 0.195, OR: 0.38, PA: 0.259, RI: 0.31, SC: 0.185, SD: 0.3,
  TN: 0.214, TX: 0.2, UT: 0.245, VA: 0.235, VT: 0.259, WA: 0.375, WI: 0.329, WV: 0.259,
  WY: 0.24, AB: 0.14, BC: 0.145, MB: 0.15, ON: 0.145, QC: 0.155, SK: 0.15
};

function IFTADialog({ open, onClose, editing, trucks, onSave, saving }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { year: currentYear, quarter: 'Q1', miles_driven: 0, gallons_purchased: 0 });
  }, [open, editing]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit IFTA Record' : 'Add IFTA Record'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label className="text-xs">Truck <span className="text-destructive">*</span></Label>
            <Select value={form.truck_id || ''} onValueChange={v => { const t = trucks.find(t => t.id === v); set('truck_id', v); set('truck_number', t?.unit_number || ''); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.unit_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">State / Province <span className="text-destructive">*</span></Label>
            <Input value={form.state || ''} onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))} className="h-8 text-xs mt-1 uppercase" placeholder="TX" maxLength={2} />
          </div>
          <div>
            <Label className="text-xs">Year <span className="text-destructive">*</span></Label>
            <Select value={String(form.year || currentYear)} onValueChange={v => set('year', Number(v))}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Quarter <span className="text-destructive">*</span></Label>
            <Select value={form.quarter || 'Q1'} onValueChange={v => set('quarter', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Miles Driven</Label>
            <Input type="number" value={form.miles_driven || ''} onChange={e => set('miles_driven', Number(e.target.value))} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Gallons Purchased</Label>
            <Input type="number" step="0.001" value={form.gallons_purchased || ''} onChange={e => set('gallons_purchased', Number(e.target.value))} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-12" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving || !form.truck_id || !form.state || !form.year || !form.quarter} onClick={() => onSave(form)}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function IFTAReports() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [truckFilter, setTruckFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks', tenantId],
    queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['ifta', tenantId],
    queryFn: () => tenantId ? base44.entities.IFTARecord.filter({ tenant_id: tenantId }, '-year', 1000) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.IFTARecord.update(editing.id, data)
      : base44.entities.IFTARecord.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ifta'] }); setDialogOpen(false); setEditing(null); toast.success('Saved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.IFTARecord.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ifta'] }); toast.success('Deleted'); },
  });

  const filtered = records.filter(r => {
    if (yearFilter !== 'all' && String(r.year) !== yearFilter) return false;
    if (quarterFilter !== 'all' && r.quarter !== quarterFilter) return false;
    if (truckFilter !== 'all' && r.truck_id !== truckFilter) return false;
    if (search && !r.truck_number?.toLowerCase().includes(search.toLowerCase()) && !r.state?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Summary by state with tax calculation
  const stateSummary = useMemo(() => {
    const m = {};
    filtered.forEach(r => {
      if (!m[r.state]) m[r.state] = { state: r.state, miles: 0, gallons: 0, taxRate: STATE_TAX_RATES[r.state] || 0 };
      m[r.state].miles += r.miles_driven || 0;
      m[r.state].gallons += r.gallons_purchased || 0;
    });
    // Calculate tax: gallons * tax rate
    Object.values(m).forEach(s => {
      s.taxOwed = s.gallons * s.taxRate;
    });
    return Object.values(m).sort((a, b) => b.miles - a.miles);
  }, [filtered]);

  const totalMiles = filtered.reduce((s, r) => s + (r.miles_driven || 0), 0);
  const totalGallons = filtered.reduce((s, r) => s + (r.gallons_purchased || 0), 0);
  const avgMPG = totalGallons > 0 ? (totalMiles / totalGallons).toFixed(2) : '—';
  const totalTax = stateSummary.reduce((s, st) => s + st.taxOwed, 0);

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="IFTA Reports"
        description={`Fuel tax reporting by state — ${totalMiles.toLocaleString()} total miles`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Record
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Miles</p>
          <p className="text-lg font-semibold mt-0.5">{totalMiles.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Gallons</p>
          <p className="text-lg font-semibold mt-0.5">{totalGallons.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground">Avg MPG</p>
          <p className="text-lg font-semibold mt-0.5">{avgMPG}</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground">Est. Total Tax</p>
          <p className="text-lg font-semibold mt-0.5 text-primary">${totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search truck, state..." className="w-48" />
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={quarterFilter} onValueChange={setQuarterFilter}>
          <SelectTrigger className="h-8 text-xs w-24"><SelectValue placeholder="All Qtrs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Qtrs</SelectItem>
            {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={truckFilter} onValueChange={setTruckFilter}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="All Trucks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trucks</SelectItem>
            {trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.unit_number}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* State summary */}
          {stateSummary.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-muted/40 border-b border-border">
                <h3 className="text-xs font-semibold text-muted-foreground">Summary by State</h3>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-muted/20 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground">State</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Miles</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Gallons</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Tax Rate</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Tax Owed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stateSummary.map(s => (
                    <tr key={s.state} className="hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono font-semibold">{s.state}</td>
                      <td className="px-4 py-2 text-right">{s.miles.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{s.gallons.toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">${s.taxRate.toFixed(2)}/gal</td>
                      <td className="px-4 py-2 text-right font-medium text-primary">${s.taxOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Raw records */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground">Records ({filtered.length})</h3>
            </div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Map className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">No IFTA records found. Add records to get started.</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-muted/20 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Truck</th>
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Year/Qtr</th>
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground">State</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Miles</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Gallons</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono">{r.truck_number}</td>
                      <td className="px-4 py-2">{r.year} {r.quarter}</td>
                      <td className="px-4 py-2 font-mono font-semibold">{r.state}</td>
                      <td className="px-4 py-2 text-right">{(r.miles_driven || 0).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{(r.gallons_purchased || 0).toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                      <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Delete Record?</AlertDialogTitle><AlertDialogDescription>This IFTA record will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(r.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                          </td>
                          </tr>
                          ))}
                          </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <IFTADialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} editing={editing} trucks={trucks} onSave={d => saveMutation.mutate(d)} saving={saveMutation.isPending} />
    </div>
  );
}