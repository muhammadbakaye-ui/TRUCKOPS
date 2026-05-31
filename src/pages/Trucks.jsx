import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Truck, Trash2, User } from 'lucide-react';
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
import { useEntitySubscription } from '../hooks/useEntitySubscription';

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
   const [deleteTarget, setDeleteTarget] = useState(null);
   const queryClient = useQueryClient();
   const { session } = useSession();
   const navigate = useNavigate();
   const { showDialog, setShowDialog, checkFeatureAccess, handleDismiss, navigate: previewNavigate } = usePreviewGate();
   const isInPreview = session?.subscription_status !== 'active' && session?.subscription_status !== 'trialing';

  useEntitySubscription('Truck', ['trucks', session?.tenant_id], !!session?.tenant_id);

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ['trucks', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Truck.filter({ tenant_id: session.tenant_id }, '-created_date', 200) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Driver.filter({ tenant_id: session.tenant_id }, '-created_date', 200) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (truck) => {
      await base44.entities.Truck.delete(truck.id);
      // Clear driver's assigned_truck_id if truck was assigned
      const driver = drivers.find(d => d.assigned_truck_id === truck.id);
      if (driver) {
        await base44.entities.Driver.update(driver.id, { assigned_truck_id: null });
      }
      await logAudit({ action_type: 'delete', entity_type: 'Truck', entity_id: truck.id, entity_label: truck.unit_number });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setDeleteTarget(null);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const isNewTruck = !editing;
      // Block creation of new truck in preview mode
      if (isNewTruck && isInPreview) {
        throw new Error('preview_mode');
      }

      let truckId;
      if (editing) {
        await base44.entities.Truck.update(editing.id, data);
        truckId = editing.id;
        await logAudit({ action_type: 'update', entity_type: 'Truck', entity_id: editing.id, entity_label: data.unit_number });
      } else {
        const created = await base44.entities.Truck.create({ ...data, tenant_id: session.tenant_id });
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
    },
    onError: (error) => {
      if (error.message === 'preview_mode') {
        setShowDialog(true);
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
      <PreviewFeatureDialog open={showDialog} onSubscribe={() => previewNavigate('/pricing')} onDismiss={handleDismiss} />
      
      {/* Desktop layout */}
      <div className="hidden md:block">
        <PageHeader
          title="Trucks"
          description={`${trucks.length} total trucks`}
          actions={
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { if (!checkFeatureAccess(isInPreview)) return; setEditing(null); setDialogOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Add Truck
            </Button>
          }
        />
        <div className="mb-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search trucks..." className="w-72" />
        </div>
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} emptyMessage="No trucks found" />
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-primary mb-0.5">Trucks</h2>
          <p className="text-[11px] text-muted-foreground mb-3">{trucks.length} total truck{trucks.length !== 1 ? 's' : ''}</p>
          <SearchInput value={search} onChange={setSearch} placeholder="Search trucks..." className="w-full" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[11px] text-muted-foreground">No trucks found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((truck) => {
              const assignedDriver = drivers.find(d => d.id === truck.assigned_driver_id);
              return (
                <div
                  key={truck.id}
                  onClick={() => { setEditing(truck); setDialogOpen(true); }}
                  className="bg-card border border-border rounded-[10px] box-border overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
                >
                  {/* Row 1: Icon + Unit # + Driver + Status */}
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <div className="flex-shrink-0 w-8.5 h-8.5 rounded-full bg-secondary flex items-center justify-center">
                      <Truck className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-primary">Unit #{truck.unit_number}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <p className="text-[11px] text-muted-foreground">{assignedDriver ? assignedDriver.full_name : 'Unassigned'}</p>
                      </div>
                    </div>
                    <div className={`text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap ${
                      truck.status === 'active' ? 'bg-green-500/10 text-green-600' :
                      truck.status === 'in_shop' ? 'bg-yellow-500/10 text-yellow-600' :
                      truck.status === 'out_of_service' ? 'bg-orange-500/10 text-orange-600' :
                      truck.status === 'sold' ? 'bg-red-500/10 text-red-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {truck.status?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                  </div>

                  {/* Row 2: 4-column info grid */}
                  <div className="grid grid-cols-4 gap-1.5 px-3 py-2.5 border-t border-border/40">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3px] mb-0.5">Make</p>
                      <p className="text-xs text-secondary-foreground">{truck.make || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3px] mb-0.5">Model</p>
                      <p className="text-xs text-secondary-foreground">{truck.model || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3px] mb-0.5">Year</p>
                      <p className="text-xs text-secondary-foreground">{truck.year || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3px] mb-0.5">Plate</p>
                      <p className="text-xs text-secondary-foreground">{truck.plate_number || '—'}</p>
                    </div>
                  </div>

                  {/* Footer: Delete button */}
                  <div className="flex justify-end px-3 py-2 border-t border-border/40">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(truck); }}
                      className="p-2.5 text-destructive hover:bg-destructive/10 rounded transition-colors w-10 h-10 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAB Button */}
        <button
          onClick={() => { if (!checkFeatureAccess(isInPreview)) return; setEditing(null); setDialogOpen(true); }}
          className="fixed right-4 bottom-20 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Truck</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>Unit #{deleteTarget.unit_number}</strong>? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate(deleteTarget)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <TruckFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} editing={editing} drivers={drivers} onSave={(data) => saveMutation.mutate(data)} saving={saveMutation.isPending} />
    </div>
  );
}