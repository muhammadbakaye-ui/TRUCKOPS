import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import SearchInput from '../components/shared/SearchInput';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';

import EntityFormDialog from '../components/shared/EntityFormDialog';
import { logAudit } from '../components/shared/AuditLogger';
import { useNavigate } from 'react-router-dom';
import { usePreviewGate, PreviewFeatureDialog } from '../components/shared/PreviewFeatureGate';
import { useSession } from '../components/shared/AppSession';
import { useEntitySubscription } from '../hooks/useEntitySubscription';
import { toast } from 'sonner';

const COMPANY_FIELDS = [
  { name: 'company_name', label: 'Company Name', required: true, fullWidth: true },
  { name: 'company_type', label: 'Type', type: 'select', options: [
    { value: 'owner_operator', label: 'Owner Operator' },
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { session, login } = useSession();
  const { showDialog, checkFeatureAccess, handleSubscribe, handleDismiss } = usePreviewGate();
  const isInPreview = session?.subscription_status !== 'active' && session?.subscription_status !== 'trialing';

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const isOwnerType = data.company_type === 'owner_operator';
      if (editing) {
        const result = await base44.entities.Company.update(editing.id, {
          ...data,
          ...(isOwnerType ? { is_owner_profile: true } : {}),
        });
        await logAudit({ action_type: 'update', entity_type: 'Company', entity_id: editing.id, entity_label: data.company_name, before_data: editing, after_data: data });
        return { result, isOwnerType, name: data.company_name };
      } else {
        // If creating as owner_operator, find existing and update instead of creating new
        if (isOwnerType) {
          const existing = await base44.entities.Company.filter({ tenant_id: session.tenant_id }, '-created_date', 200)
            .then(all => all.find(c => c.is_owner_profile || c.company_type === 'owner_operator'));
          if (existing) {
            const result = await base44.entities.Company.update(existing.id, { ...data, is_owner_profile: true });
            await logAudit({ action_type: 'update', entity_type: 'Company', entity_id: existing.id, entity_label: data.company_name, before_data: existing, after_data: data });
            return { result, isOwnerType, name: data.company_name };
          }
        }
        const result = await base44.entities.Company.create({ ...data, tenant_id: session.tenant_id, ...(isOwnerType ? { is_owner_profile: true } : {}) });
        await logAudit({ action_type: 'create', entity_type: 'Company', entity_label: data.company_name, after_data: data });
        return { result, isOwnerType, name: data.company_name };
      }
    },
    onSuccess: ({ isOwnerType, name }) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      if (isOwnerType) {
        queryClient.invalidateQueries({ queryKey: ['settings-company', session?.tenant_id] });
        if (session) login({ ...session, company_name: name || '' });
      }
      setDialogOpen(false);
      setEditing(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (company) => {
      await base44.entities.Company.delete(company.id);
      await logAudit({ action_type: 'delete', entity_type: 'Company', entity_id: company.id, entity_label: company.company_name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDeleteTarget(null);
      toast.success('Company deleted');
    }
  });

  useEntitySubscription('Company', ['companies', session?.tenant_id], !!session?.tenant_id);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', session?.tenant_id],
    queryFn: async () => {
      if (!session?.tenant_id) return [];
      return base44.entities.Company.filter({ tenant_id: session.tenant_id }, '-created_date', 200);
    },
    enabled: !!session?.tenant_id,
  });

  const filtered = companies.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [c.company_name, c.contact_name, c.email, c.phone, c.city, c.state]
      .some(v => v && v.toLowerCase().includes(q));
  });

  const TYPE_BADGE = {
    owner_operator: 'bg-purple-500/10 text-purple-400 border border-purple-500/25',
    broker:         'bg-blue-500/10 text-blue-400 border border-blue-500/25',
    customer:       'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25',
    carrier:        'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    other:          'bg-muted text-muted-foreground border border-border',
  };
  const TYPE_LABEL = {
    owner_operator: 'Owner Operator',
    broker: 'Broker',
    customer: 'Customer',
    carrier: 'Carrier',
    other: 'Other',
  };

  const dim = <span className="text-muted-foreground/40">—</span>;

  const columns = [
    { header: 'Company', render: (r) => <span className="font-semibold text-foreground">{r.company_name}</span> },
    { header: 'Type', render: (r) => r.company_type ? (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGE[r.company_type] || TYPE_BADGE.other}`}>
        {TYPE_LABEL[r.company_type] || r.company_type}
      </span>
    ) : dim },
    { header: 'Contact', render: (r) => r.contact_name ? <span className="text-foreground/80">{r.contact_name}</span> : dim },
    { header: 'Phone', render: (r) => r.phone ? <span className="text-foreground/80">{r.phone}</span> : dim },
    { header: 'Email', render: (r) => r.email ? (
      <a href={`mailto:${r.email}`} onClick={e => e.stopPropagation()} className="text-blue-400 hover:text-blue-300 transition-colors">{r.email}</a>
    ) : dim },
    { header: 'City', render: (r) => r.city ? <span className="text-foreground/80">{r.city}{r.state ? `, ${r.state}` : ''}</span> : dim },
    { header: 'Terms', render: (r) => r.payment_terms ? <span className="text-foreground/80">{r.payment_terms.replace(/_/g, ' ')}</span> : dim },
    { header: '', render: (r) => (
      <div className="group">
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
          className="p-1 text-muted-foreground/30 group-hover:text-destructive transition-colors rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    ), width: '40px' },
  ];

  return (
    <div className="p-4">
      <PreviewFeatureDialog open={showDialog} onSubscribe={handleSubscribe} onDismiss={handleDismiss} />
      
      {/* Desktop layout */}
      <div className="hidden md:block">
        {/* Compact single-row toolbar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0">
            <h2 className="text-sm font-semibold text-foreground leading-tight">Companies / Brokers</h2>
            <p className="text-[10px] text-muted-foreground leading-tight">{companies.length} total companies</p>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search companies..." className="h-7 text-xs w-52" />
          <div className="flex-1" />
          <Button size="sm" className="h-7 text-xs gap-1 flex-shrink-0" onClick={() => { if (!checkFeatureAccess(isInPreview)) return; setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Company
          </Button>
        </div>

        <style>{`
          .companies-table table { border-collapse: collapse; width: 100%; }
          .companies-table thead tr { border-bottom: 1px solid hsl(var(--border)); }
          .companies-table thead th { padding: 5px 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: hsl(var(--muted-foreground)); }
          .companies-table tbody td { padding: 7px 10px; font-size: 12.5px; border-bottom: 1px solid hsl(var(--border) / 0.35); }
          .companies-table tbody tr:last-child td { border-bottom: none; }
          .companies-table tbody tr:hover td { background: hsl(var(--muted) / 0.4); }
        `}</style>
        <div className="companies-table">
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            onRowClick={(row) => { if (!checkFeatureAccess(isInPreview)) return; setEditing(row); setDialogOpen(true); }}
            emptyMessage="No companies found"
          />
        </div>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-primary mb-0.5">Companies / Brokers</h2>
          <p className="text-xs text-muted-foreground mb-3">{companies.length} total companies</p>
          <SearchInput value={search} onChange={setSearch} placeholder="Search companies..." className="w-full" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">No companies found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((company) => (
              <div
                key={company.id}
                onClick={() => { if (!checkFeatureAccess(isInPreview)) return; setEditing(company); setDialogOpen(true); }}
                className="tap-card bg-card border border-border rounded-[10px] box-border overflow-hidden p-3 relative"
              >
                {/* Delete button - top right */}
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(company); }}
                  className="absolute top-2 right-2 p-2.5 text-destructive hover:bg-destructive/10 rounded transition-colors w-10 h-10 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {/* Row 1: Name + Type */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-sm font-bold text-primary">{company.company_name}</span>
                  <StatusBadge status={company.company_type} />
                </div>

                {/* Row 2: Contact & Terms Grid */}
                <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3px] mb-0.5">Contact</p>
                    <p className="text-xs text-muted-foreground">{company.contact_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3px] mb-0.5">Terms</p>
                    <p className="text-xs text-secondary-foreground">{company.payment_terms ? company.payment_terms.replace(/_/g, ' ') : '—'}</p>
                  </div>
                </div>

                {/* Row 3: Info Chips */}
                <div className="flex gap-1 flex-wrap">
                  {company.phone && (
                    <div className="bg-secondary text-muted-foreground text-[11px] px-2 py-0.5 rounded flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {!company.phone && (
                    <div className="bg-secondary text-muted-foreground text-[11px] px-2 py-0.5 rounded flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>—</span>
                    </div>
                  )}

                  {company.email && (
                    <div className="bg-secondary text-muted-foreground text-[11px] px-2 py-0.5 rounded flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{company.email}</span>
                    </div>
                  )}
                  {!company.email && (
                    <div className="bg-secondary text-muted-foreground text-[11px] px-2 py-0.5 rounded flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>—</span>
                    </div>
                  )}

                  {(company.city || company.state) && (
                    <div className="bg-secondary text-muted-foreground text-[11px] px-2 py-0.5 rounded flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{company.city ? `${company.city}, ${company.state || ''}` : '—'}</span>
                    </div>
                  )}
                  {!company.city && !company.state && (
                    <div className="bg-secondary text-muted-foreground text-[11px] px-2 py-0.5 rounded flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>—</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.company_name}</strong>? This cannot be undone.
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