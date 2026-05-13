import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import SearchInput from '../components/shared/SearchInput';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import { logAudit } from '../components/shared/AuditLogger';
import { useHasSubscription } from '../components/shared/SubscriptionGate';
import { usePreviewGate, PreviewFeatureDialog } from '../components/shared/PreviewFeatureGate';
import { useSession } from '../components/shared/AppSession';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'in_shop', label: 'In Shop' },
  { value: 'out_of_service', label: 'Out of Service' },
  { value: 'sold', label: 'Sold' },
];

function TruckFormDialog({ open, onClose, editing, drivers, onSave, saving }) {
  const [form, setForm] = useState({});

  React.useEffect(() => {
    if (open) {
      setForm(editing ? { ...editing } : { status: 'active' });
    }
  }, [open, editing]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Also sync driver's assigned_truck_id when saving
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Truck' : 'New Truck'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 py-3">
            <div>
              <Label className="text-xs">Unit Number <span className="text-destructive">*</span></Label>
              <Input value={form.unit_number || ''} onChange={e => set('unit_number', e.target.value)} className="h-8 text-xs mt-1" required />
            </div>
            <div>
              <Label className="text-xs">Assigned Driver</Label>
              <Select value={form.assigned_driver_id || ''} onValueChange={v => {
                const d = drivers.find(d => d.id === v);
                set('assigned_driver_id', v || null);
              }}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Make</Label>
              <Input value={form.make || ''} onChange={e => set('make', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Model</Label>
              <Input value={form.model || ''} onChange={e => set('model', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Year</Label>
              <Input type="number" value={form.year || ''} onChange={e => set('year', Number(e.target.value))} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Plate Number</Label>
              <Input value={form.plate_number || ''} onChange={e => set('plate_number', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">VIN</Label>
              <Input value={form.vin || ''} onChange={e => set('vin', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status || 'active'} onValueChange={v => set('status', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
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

export default function Trucks() {
   const [search, setSearch] = useState('');
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editing, setEditing] = useState(null);
   const queryClient = useQueryClient();
   const navigate = useNavigate();
   const { session } = useSession();
   const { showDialog, checkFeatureAccess, handleSubscribe, handleDismiss } = usePreviewGate();
   const isInPreview = session?.subscription_status !== 'active' && session?.subscription_status !== 'trialing';

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => base44.entities.Truck.list('-created_date', 200),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let truckId;
      const isNewTruck = !editing;
      if (editing) {
        await base44.entities.Truck.update(editing.id, data);
        truckId = editing.id;
        await logAudit({ action_type: 'update', entity_type: 'Truck', entity_id: editing.id, entity_label: data.unit_number });
      } else {
        const created = await base44.entities.Truck.create(data);
        truckId = created.id;
        await logAudit({ action_type: 'create', entity_type: 'Truck', entity_label: data.unit_number });
      }

      // Sync driver's assigned_truck_id
      // First clear any driver who previously had this truck assigned
      const prevDriverId = editing?.assigned_driver_id;
      if (prevDriverId && prevDriverId !== data.assigned_driver_id) {
        await base44.entities.Driver.update(prevDriverId, { assigned_truck_id: null });
      }
      // Set new driver's assigned_truck_id
      if (data.assigned_driver_id) {
        await base44.entities.Driver.update(data.assigned_driver_id, { assigned_truck_id: truckId });
      }

      return { isNewTruck };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setDialogOpen(false);
      setEditing(null);

      // Show subscription popup only after creating new truck in preview mode
      if (result.isNewTruck && isInPreview) {
        handleSubscribe();
      }
    }
  });

  const filtered = trucks.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [t.unit_number, t.plate_number, t.make, t.model, t.vin]
      .some(v => v && v.toLowerCase().includes(q));
  });

  const columns = [
    { header: 'Unit #', render: (r) => <span className="font-mono font-medium">{r.unit_number}</span> },
    { header: 'Assigned Driver', render: (r) => {
      const d = drivers.find(d => d.id === r.assigned_driver_id);
      return d ? <span className="text-xs">{d.full_name}</span> : <span className="text-muted-foreground text-xs">—</span>;
    }},
    { header: 'Make', accessor: 'make' },
    { header: 'Model', accessor: 'model' },
    { header: 'Year', accessor: 'year' },
    { header: 'Plate', accessor: 'plate_number' },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="p-4">
      <PreviewFeatureDialog open={showDialog} onSubscribe={handleSubscribe} onDismiss={handleDismiss} />
      <PageHeader
        title="Trucks"
        description={`${trucks.length} total trucks`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Truck
          </Button>
        }
      />
      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search trucks..." className="w-72" />
      </div>
      <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} emptyMessage="No trucks found" />
      <TruckFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} editing={editing} drivers={drivers} onSave={(data) => saveMutation.mutate(data)} saving={saveMutation.isPending} />
    </div>
  );
}