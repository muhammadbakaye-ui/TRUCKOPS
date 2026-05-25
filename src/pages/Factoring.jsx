import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Loader2, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import SearchInput from '@/components/shared/SearchInput';

function FactoringDialog({ open, onClose, editing, onSave, saving }) {
  const [form, setForm] = useState({});
  React.useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { active: true });
  }, [open, editing]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Factoring Company' : 'New Factoring Company'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label className="text-xs">Company Name <span className="text-destructive">*</span></Label>
            <Input value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} className="h-8 text-xs mt-1" required />
          </div>
          <div>
            <Label className="text-xs">Contact Name</Label>
            <Input value={form.contact_name || ''} onChange={e => set('contact_name', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Fee % (e.g. 3.5)</Label>
            <Input type="number" step="0.1" min="0" max="100" value={form.fee_percentage || ''} onChange={e => set('fee_percentage', Number(e.target.value))} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-16" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving || !form.company_name} onClick={() => onSave(form)}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {editing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Factoring() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['factoring-companies', tenantId],
    queryFn: () => tenantId ? base44.entities.FactoringCompany.filter({ tenant_id: tenantId }, 'company_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  // Load invoices to compute factoring stats
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', tenantId],
    queryFn: () => tenantId ? base44.entities.Invoice.filter({ tenant_id: tenantId }, '-created_date', 500) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const factoredInvoices = invoices.filter(i => i.factored && i.factoring_company_id);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) {
        return base44.entities.FactoringCompany.update(editing.id, data);
      } else {
        return base44.entities.FactoringCompany.create({ ...data, tenant_id: tenantId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factoring-companies'] });
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? 'Updated' : 'Factoring company added');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FactoringCompany.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factoring-companies'] });
      toast.success('Removed');
    },
  });

  const filtered = companies.filter(c =>
    !search || [c.company_name, c.contact_name, c.email].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  // Summary stats per company
  const statsMap = React.useMemo(() => {
    const m = {};
    factoredInvoices.forEach(inv => {
      const cid = inv.factoring_company_id;
      if (!cid) return;
      const fc = companies.find(c => c.id === cid);
      if (!m[cid]) m[cid] = { totalFactored: 0, totalFees: 0, netReceived: 0 };
      const amt = inv.total || 0;
      const feeRate = fc?.fee_percentage || 0;
      const fee = amt * (feeRate / 100);
      m[cid].totalFactored += amt;
      m[cid].totalFees += fee;
      m[cid].netReceived += amt - fee;
    });
    return m;
  }, [factoredInvoices, companies]);

  const totalFactored = Object.values(statsMap).reduce((s, v) => s + v.totalFactored, 0);
  const totalFees = Object.values(statsMap).reduce((s, v) => s + v.totalFees, 0);

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Factoring"
        description={`${companies.length} factoring compan${companies.length !== 1 ? 'ies' : 'y'}`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Factoring Company
          </Button>
        }
      />

      {/* Summary stats */}
      {totalFactored > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Factored</p>
            <p className="text-xl font-bold text-primary mt-1">${totalFactored.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Fees Paid</p>
            <p className="text-xl font-bold text-red-500 mt-1">${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Net Received</p>
            <p className="text-xl font-bold text-green-600 mt-1">${(totalFactored - totalFees).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search factoring companies..." className="w-72" />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Banknote className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No factoring companies yet.</p>
          <p className="text-xs mt-1">Add a factoring company to track relationships and fees.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Fee %</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total Factored</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Fees Paid</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Net Received</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(c => {
                const s = statsMap[c.id] || { totalFactored: 0, totalFees: 0, netReceived: 0 };
                return (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => { setEditing(c); setDialogOpen(true); }}>
                    <td className="px-4 py-3 font-medium">{c.company_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.contact_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{c.fee_percentage != null ? `${c.fee_percentage}%` : '—'}</td>
                    <td className="px-4 py-3 text-right text-primary">${s.totalFactored.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-red-500">-${s.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">${s.netReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Factoring Company?</AlertDialogTitle>
                            <AlertDialogDescription>This will remove {c.company_name} from your records.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(c.id)}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FactoringDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        editing={editing}
        onSave={data => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}