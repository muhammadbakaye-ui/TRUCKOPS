import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import EntityFormDialog from '../components/shared/EntityFormDialog';
import { logAudit } from '../components/shared/AuditLogger';

const TRUCK_FIELDS = [
  { name: 'unit_number', label: 'Unit Number', required: true },
  { name: 'plate_number', label: 'Plate Number' },
  { name: 'vin', label: 'VIN' },
  { name: 'make', label: 'Make' },
  { name: 'model', label: 'Model' },
  { name: 'year', label: 'Year', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'Active' }, { value: 'in_shop', label: 'In Shop' },
    { value: 'out_of_service', label: 'Out of Service' }, { value: 'sold', label: 'Sold' }
  ]},
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Trucks() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => base44.entities.Truck.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) {
        await base44.entities.Truck.update(editing.id, data);
        await logAudit({ action_type: 'update', entity_type: 'Truck', entity_id: editing.id, entity_label: data.unit_number });
      } else {
        await base44.entities.Truck.create(data);
        await logAudit({ action_type: 'create', entity_type: 'Truck', entity_label: data.unit_number });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setDialogOpen(false);
      setEditing(null);
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
    { header: 'Make', accessor: 'make' },
    { header: 'Model', accessor: 'model' },
    { header: 'Year', accessor: 'year' },
    { header: 'Plate', accessor: 'plate_number' },
    { header: 'VIN', render: (r) => r.vin ? <span className="font-mono text-[11px]">{r.vin}</span> : '—' },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="p-4">
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
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search trucks..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
        </div>
      </div>
      <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} emptyMessage="No trucks found" />
      <EntityFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? 'Edit Truck' : 'New Truck'} fields={TRUCK_FIELDS} initialData={editing} onSave={(data) => saveMutation.mutate(data)} saving={saveMutation.isPending} />
    </div>
  );
}