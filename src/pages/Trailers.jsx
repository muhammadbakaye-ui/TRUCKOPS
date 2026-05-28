import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import SearchInput from '../components/shared/SearchInput';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import EntityFormDialog from '../components/shared/EntityFormDialog';
import { logAudit } from '../components/shared/AuditLogger';
import { useSession } from '../components/shared/AppSession';
import { useEntitySubscription } from '../hooks/useEntitySubscription';

const TRAILER_FIELDS = [
  { name: 'unit_number', label: 'Unit Number', required: true },
  { name: 'trailer_type', label: 'Type', type: 'select', options: [
    { value: 'dry_van', label: 'Dry Van' }, { value: 'reefer', label: 'Reefer' },
    { value: 'flatbed', label: 'Flatbed' }, { value: 'step_deck', label: 'Step Deck' },
    { value: 'lowboy', label: 'Lowboy' }, { value: 'tanker', label: 'Tanker' },
    { value: 'intermodal', label: 'Intermodal' }, { value: 'other', label: 'Other' },
  ]},
  { name: 'plate_number', label: 'Plate Number' },
  { name: 'vin', label: 'VIN' },
  { name: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'Active' }, { value: 'in_shop', label: 'In Shop' },
    { value: 'out_of_service', label: 'Out of Service' }, { value: 'sold', label: 'Sold' },
  ]},
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Trailers() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();
  const { session } = useSession();

  useEntitySubscription('Trailer', ['trailers', session?.tenant_id], !!session?.tenant_id);

  const { data: trailers = [], isLoading } = useQuery({
    queryKey: ['trailers', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Trailer.filter({ tenant_id: session.tenant_id }, '-created_date', 200) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) {
        await base44.entities.Trailer.update(editing.id, data);
        await logAudit({ action_type: 'update', entity_type: 'Trailer', entity_id: editing.id, entity_label: data.unit_number });
      } else {
        await base44.entities.Trailer.create({ ...data, tenant_id: session?.tenant_id });
        await logAudit({ action_type: 'create', entity_type: 'Trailer', entity_label: data.unit_number });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailers'] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const filtered = trailers.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [t.unit_number, t.plate_number, t.trailer_type, t.vin].some(v => v && v.toLowerCase().includes(q));
  });

  const columns = [
    { header: 'Unit #', render: (r) => <span className="font-mono font-medium">{r.unit_number}</span> },
    { header: 'Type', render: (r) => r.trailer_type ? r.trailer_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—' },
    { header: 'Plate', accessor: 'plate_number' },
    { header: 'VIN', render: (r) => r.vin ? <span className="font-mono text-[11px]">{r.vin}</span> : '—' },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="p-4">
      <PageHeader
        title="Trailers"
        description={`${trailers.length} total trailers`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Trailer
          </Button>
        }
      />
      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search trailers..." className="w-72" />
      </div>
      <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} emptyMessage="No trailers found" />
      <EntityFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? 'Edit Trailer' : 'New Trailer'} fields={TRAILER_FIELDS} initialData={editing} onSave={(data) => saveMutation.mutate(data)} saving={saveMutation.isPending} />
    </div>
  );
}