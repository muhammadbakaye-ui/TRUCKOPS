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
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import SearchInput from '@/components/shared/SearchInput';
import { differenceInDays, parseISO } from 'date-fns';

const today = () => new Date();

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const days = differenceInDays(parseISO(dateStr), today());
  if (days < 0) return { label: 'Expired', className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400', days };
  if (days <= 60) return { label: `Expires in ${days}d`, className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400', days };
  return { label: 'Valid', className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400', days };
}

function QualDialog({ open, onClose, driver, qual, onSave, saving }) {
  const [form, setForm] = useState({});
  React.useEffect(() => {
    if (open) setForm(qual ? { ...qual } : { driver_id: driver?.id, driver_name: driver?.full_name });
  }, [open, qual, driver]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Qualifications — {driver?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label className="text-xs">CDL Class</Label>
            <Select value={form.cdl_class || ''} onValueChange={v => set('cdl_class', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Class A</SelectItem>
                <SelectItem value="B">Class B</SelectItem>
                <SelectItem value="C">Class C</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">CDL Number</Label>
            <Input value={form.cdl_number || ''} onChange={e => set('cdl_number', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">CDL Expiration Date</Label>
            <Input type="date" value={form.cdl_expiration_date || ''} onChange={e => set('cdl_expiration_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Medical Card Expiration</Label>
            <Input type="date" value={form.medical_card_expiration_date || ''} onChange={e => set('medical_card_expiration_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Endorsements</Label>
            <Input value={form.endorsements || ''} onChange={e => set('endorsements', e.target.value)} className="h-8 text-xs mt-1" placeholder="H, N, T, X" />
          </div>
          <div>
            <Label className="text-xs">Hire Date</Label>
            <Input type="date" value={form.hire_date || ''} onChange={e => set('hire_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-16" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={() => onSave(form)}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DriverQualifications() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers', tenantId],
    queryFn: () => tenantId ? base44.entities.Driver.filter({ tenant_id: tenantId }, 'full_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: quals = [], isLoading: qualsLoading } = useQuery({
    queryKey: ['driver-quals', tenantId],
    queryFn: () => tenantId ? base44.entities.DriverQualification.filter({ tenant_id: tenantId }, 'driver_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const qualMap = useMemo(() => {
    const m = {};
    quals.forEach(q => { m[q.driver_id] = q; });
    return m;
  }, [quals]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existing = qualMap[data.driver_id];
      if (existing) {
        return base44.entities.DriverQualification.update(existing.id, data);
      } else {
        return base44.entities.DriverQualification.create({ ...data, tenant_id: tenantId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-quals'] });
      setDialogOpen(false);
      toast.success('Qualifications saved');
    },
  });

  const filtered = drivers.filter(d =>
    !search || d.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = driversLoading || qualsLoading;

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Driver Qualifications" description={`${drivers.length} drivers`} />
      <SearchInput value={search} onChange={setSearch} placeholder="Search drivers..." className="w-72" />

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ShieldCheck className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No drivers found.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Driver</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">CDL Class</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">CDL #</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">CDL Expiration</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Medical Card Exp.</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Endorsements</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Hire Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(d => {
                const q = qualMap[d.id];
                const cdlStatus = expiryStatus(q?.cdl_expiration_date);
                const medStatus = expiryStatus(q?.medical_card_expiration_date);
                const hasWarning = cdlStatus?.days < 60 || medStatus?.days < 60;
                return (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{d.full_name}</td>
                    <td className="px-4 py-3">{q?.cdl_class ? <Badge variant="outline" className="text-[10px]">Class {q.cdl_class}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{q?.cdl_number || '—'}</td>
                    <td className="px-4 py-3">
                      {q?.cdl_expiration_date ? (
                        <div className="flex flex-col gap-1">
                          <span>{q.cdl_expiration_date}</span>
                          {cdlStatus && <Badge variant="outline" className={`text-[10px] ${cdlStatus.className}`}>{cdlStatus.label}</Badge>}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {q?.medical_card_expiration_date ? (
                        <div className="flex flex-col gap-1">
                          <span>{q.medical_card_expiration_date}</span>
                          {medStatus && <Badge variant="outline" className={`text-[10px] ${medStatus.className}`}>{medStatus.label}</Badge>}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{q?.endorsements || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{q?.hire_date || '—'}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                        onClick={() => { setSelectedDriver(d); setDialogOpen(true); }}>
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <QualDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        driver={selectedDriver}
        qual={selectedDriver ? qualMap[selectedDriver.id] : null}
        onSave={data => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}