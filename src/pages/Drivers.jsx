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

const DRIVER_FIELDS = [
  { name: 'full_name', label: 'Full Name', required: true },
  { name: 'phone', label: 'Phone' },
  { name: 'email', label: 'Email' },
  { name: 'cdl_number', label: 'CDL Number' },
  { name: 'assigned_truck_id', label: 'Truck ID / Unit #', placeholder: 'Enter truck unit number or ID' },
  { name: 'address', label: 'Address' },
  { name: 'city', label: 'City' },
  { name: 'state', label: 'State' },
  { name: 'zip', label: 'ZIP' },
  { name: 'pay_type', label: 'Pay Type', type: 'select', options: [
    { value: 'percentage', label: 'Percentage' }, { value: 'per_mile', label: 'Per Mile' },
    { value: 'flat_rate', label: 'Flat Rate' }, { value: 'custom', label: 'Custom' }
  ]},
  { name: 'pay_rate', label: 'Pay Rate', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
    { value: 'terminated', label: 'Terminated' }
  ]},
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Drivers() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) {
        const result = await base44.entities.Driver.update(editing.id, data);
        await logAudit({ action_type: 'update', entity_type: 'Driver', entity_id: editing.id, entity_label: data.full_name });
        return result;
      } else {
        const result = await base44.entities.Driver.create(data);
        await logAudit({ action_type: 'create', entity_type: 'Driver', entity_label: data.full_name });
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
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
    { header: 'Truck ID/#', render: (r) => r.assigned_truck_id ? <span className="font-mono text-xs">{r.assigned_truck_id}</span> : '—' },
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
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
        </div>
      </div>
      <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} emptyMessage="No drivers found" />
      <EntityFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        title={editing ? 'Edit Driver' : 'New Driver'}
        fields={DRIVER_FIELDS}
        initialData={editing}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}