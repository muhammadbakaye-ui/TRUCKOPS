import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import SearchInput from '../components/shared/SearchInput';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import EntityFormDialog from '../components/shared/EntityFormDialog';
import { logAudit } from '../components/shared/AuditLogger';
import { useNavigate } from 'react-router-dom';
import { usePreviewGate, PreviewFeatureDialog } from '../components/shared/PreviewFeatureGate';
import { useSession } from '../components/shared/AppSession';
import { toast } from 'sonner';

const COMPANY_FIELDS = [
  { name: 'company_name', label: 'Company Name', required: true, fullWidth: true },
  { name: 'company_type', label: 'Type', type: 'select', options: [
    { value: 'broker', label: 'Broker' }, { value: 'customer', label: 'Customer' },
    { value: 'carrier', label: 'Carrier' }, { value: 'other', label: 'Other' }
  ]},
  { name: 'contact_name', label: 'Contact Name' },
  { name: 'email', label: 'Email' },
  { name: 'phone', label: 'Phone' },
  { name: 'address_1', label: 'Address Line 1' },
  { name: 'address_2', label: 'Address Line 2' },
  { name: 'city', label: 'City' },
  { name: 'state', label: 'State' },
  { name: 'zip', label: 'ZIP' },
  { name: 'payment_terms', label: 'Payment Terms', type: 'select', options: [
    { value: 'net_15', label: 'Net 15' }, { value: 'net_30', label: 'Net 30' },
    { value: 'net_45', label: 'Net 45' }, { value: 'net_60', label: 'Net 60' },
    { value: 'due_on_receipt', label: 'Due on Receipt' }, { value: 'other', label: 'Other' }
  ]},
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Companies() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { session } = useSession();
  const { showDialog, checkFeatureAccess, handleSubscribe, handleDismiss } = usePreviewGate();
  const isInPreview = session?.subscription_status !== 'active' && session?.subscription_status !== 'trialing';

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) {
        const result = await base44.entities.Company.update(editing.id, data);
        await logAudit({ action_type: 'update', entity_type: 'Company', entity_id: editing.id, entity_label: data.company_name, before_data: editing, after_data: data });
        return result;
      } else {
        const result = await base44.entities.Company.create({ ...data, tenant_id: session.tenant_id });
        await logAudit({ action_type: 'create', entity_type: 'Company', entity_label: data.company_name, after_data: data });
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDialogOpen(false);
      setEditing(null);
    }
  });

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Company.filter({ tenant_id: session.tenant_id }, '-created_date', 200) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  const filtered = companies.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [c.company_name, c.contact_name, c.email, c.phone, c.city, c.state]
      .some(v => v && v.toLowerCase().includes(q));
  });

  const columns = [
    { header: 'Company', render: (r) => <span className="font-medium">{r.company_name}</span> },
    { header: 'Type', render: (r) => <StatusBadge status={r.company_type} /> },
    { header: 'Contact', accessor: 'contact_name' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Email', accessor: 'email' },
    { header: 'City', render: (r) => r.city ? `${r.city}, ${r.state || ''}` : '—' },
    { header: 'Terms', render: (r) => r.payment_terms ? r.payment_terms.replace(/_/g, ' ') : '—' },
  ];

  return (
    <div className="p-4">
      <PreviewFeatureDialog open={showDialog} onSubscribe={handleSubscribe} onDismiss={handleDismiss} />
      <PageHeader
        title="Companies / Brokers"
        description={`${companies.length} total companies`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { if (!checkFeatureAccess(isInPreview)) return; setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Company
          </Button>
        }
      />
      
      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search companies..." className="w-72" />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        onRowClick={(row) => { if (!checkFeatureAccess(isInPreview)) return; setEditing(row); setDialogOpen(true); }}
        emptyMessage="No companies found"
      />

      <EntityFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        title={editing ? 'Edit Company' : 'New Company'}
        fields={COMPANY_FIELDS}
        initialData={editing}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}