import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Plus, Container, Trash2 } from 'lucide-react';
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();
  const { session } = useSession();

  useEntitySubscription('Trailer', ['trailers', session?.tenant_id], !!session?.tenant_id);

  const { data: trailers = [], isLoading } = useQuery({
    queryKey: ['trailers', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Trailer.filter({ tenant_id: session.tenant_id }, '-created_date', 200) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (trailer) => {
      await base44.entities.Trailer.delete(trailer.id);
      await logAudit({ action_type: 'delete', entity_type: 'Trailer', entity_id: trailer.id, entity_label: trailer.unit_number });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailers'] });
      setDeleteTarget(null);
    }
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
      {/* Desktop layout */}
      <div className="hidden md:block">
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
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-primary mb-0.5">Trailers</h2>
          <p className="text-[11px] text-muted-foreground mb-3">{trailers.length} total trailer{trailers.length !== 1 ? 's' : ''}</p>
          <SearchInput value={search} onChange={setSearch} placeholder="Search trailers..." className="w-full" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[11px] text-muted-foreground">No trailers found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((trailer) => {
              const typeLabel = trailer.trailer_type ? trailer.trailer_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—';
              return (
                <div
                  key={trailer.id}
                  onClick={() => { setEditing(trailer); setDialogOpen(true); }}
                  className="bg-card border border-border rounded-[10px] box-border overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
                >
                  {/* Row 1: Icon + Unit # + Type + Status */}
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <div className="flex-shrink-0 w-8.5 h-8.5 rounded-full bg-secondary flex items-center justify-center">
                      <Container className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-primary">Unit #{trailer.unit_number}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{typeLabel}</p>
                    </div>
                    <div className={`text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap ${
                      trailer.status === 'active' ? 'bg-green-500/10 text-green-600' :
                      trailer.status === 'in_shop' ? 'bg-yellow-500/10 text-yellow-600' :
                      trailer.status === 'out_of_service' ? 'bg-orange-500/10 text-orange-600' :
                      trailer.status === 'sold' ? 'bg-red-500/10 text-red-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {trailer.status?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                  </div>

                  {/* Row 2: 2-column info grid */}
                  <div className="grid grid-cols-2 gap-1.5 px-3 py-2.5 border-t border-border/40">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3px] mb-0.5">Plate</p>
                      <p className="text-xs text-secondary-foreground">{trailer.plate_number || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3px] mb-0.5">VIN</p>
                      <p className="text-xs text-secondary-foreground">{trailer.vin || '—'}</p>
                    </div>
                  </div>

                  {/* Footer: Delete button */}
                  <div className="flex justify-end px-3 py-2 border-t border-border/40">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(trailer); }}
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
          onClick={() => { setEditing(null); setDialogOpen(true); }}
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
              <AlertDialogTitle>Delete Trailer</AlertDialogTitle>
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

      <EntityFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? 'Edit Trailer' : 'New Trailer'} fields={TRAILER_FIELDS} initialData={editing} onSave={(data) => saveMutation.mutate(data)} saving={saveMutation.isPending} />
    </div>
  );
}