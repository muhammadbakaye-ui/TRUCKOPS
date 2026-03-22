import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import SearchInput from '../components/shared/SearchInput';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import { logAudit } from '../components/shared/AuditLogger';

function DriverFormDialog({ open, onClose, editing, trucks, onSave, saving }) {
  const [form, setForm] = useState({});

  React.useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { status: 'active', pay_type: 'percentage' });
  }, [open, editing]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Driver' : 'New Driver'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 py-3">
            <div className="col-span-2">
              <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
              <Input value={form.full_name || ''} onChange={e => set('full_name', e.target.value)} className="h-8 text-xs mt-1" required />
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
              <Label className="text-xs">CDL Number</Label>
              <Input value={form.cdl_number || ''} onChange={e => set('cdl_number', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Assigned Truck</Label>
              <Select value={form.assigned_truck_id || ''} onValueChange={v => set('assigned_truck_id', v || null)}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.unit_number}{t.make ? ` — ${t.make}` : ''}{t.model ? ` ${t.model}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={form.address || ''} onChange={e => set('address', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city || ''} onChange={e => set('city', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={form.state || ''} onChange={e => set('state', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">ZIP</Label>
              <Input value={form.zip || ''} onChange={e => set('zip', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Pay Type</Label>
              <Select value={form.pay_type || 'percentage'} onValueChange={v => set('pay_type', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="per_mile">Per Mile</SelectItem>
                  <SelectItem value="flat_rate">Flat Rate</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Pay Rate</Label>
              <Input type="number" step="0.01" value={form.pay_rate || ''} onChange={e => set('pay_rate', Number(e.target.value))} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">YTD Gross Legacy</Label>
              <Input type="number" step="0.01" value={form.ytd_gross_legacy || ''} onChange={e => set('ytd_gross_legacy', Number(e.target.value))} className="h-8 text-xs mt-1" placeholder="e.g., 24462.38" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status || 'active'} onValueChange={v => set('status', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-20" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Drivers() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 200),
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => base44.entities.Truck.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let driverId;
      if (editing) {
        await base44.entities.Driver.update(editing.id, data);
        driverId = editing.id;
        await logAudit({ action_type: 'update', entity_type: 'Driver', entity_id: editing.id, entity_label: data.full_name });
      } else {
        const created = await base44.entities.Driver.create(data);
        driverId = created.id;
        await logAudit({ action_type: 'create', entity_type: 'Driver', entity_label: data.full_name });
      }

      // Sync truck's assigned_driver_id
      const prevTruckId = editing?.assigned_truck_id;
      if (prevTruckId && prevTruckId !== data.assigned_truck_id) {
        await base44.entities.Truck.update(prevTruckId, { assigned_driver_id: null });
      }
      if (data.assigned_truck_id) {
        await base44.entities.Truck.update(data.assigned_truck_id, { assigned_driver_id: driverId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setDialogOpen(false);
      setEditing(null);
    }
  });

  const filtered = drivers.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [d.full_name, d.phone, d.email, d.cdl_number, d.city]
      .some(v => v && v.toLowerCase().includes(q));
  });

  const columns = [
    { header: 'Name', render: (r) => <span className="font-medium">{r.full_name}</span> },
    { header: 'Phone', accessor: 'phone' },
    { header: 'CDL', accessor: 'cdl_number' },
    { header: 'Truck', render: (r) => {
      const t = trucks.find(t => t.id === r.assigned_truck_id);
      return t ? <span className="font-mono text-xs">{t.unit_number}</span> : <span className="text-muted-foreground text-xs">—</span>;
    }},
    { header: 'Pay Type', render: (r) => r.pay_type ? r.pay_type.replace(/_/g, ' ') : '—' },
    { header: 'Pay Rate', render: (r) => r.pay_rate || '—' },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="p-4">
      <PageHeader
        title="Drivers"
        description={`${drivers.length} total drivers`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Driver
          </Button>
        }
      />
      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search drivers..." className="w-72" />
      </div>
      <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} emptyMessage="No drivers found" />
      <DriverFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        editing={editing}
        trucks={trucks}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}