import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, X, Check, Loader2, Copy } from 'lucide-react';
import SearchInput from '../components/shared/SearchInput';
import { useSession } from '../components/shared/AppSession';
import { toast } from 'sonner';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';

import { format } from 'date-fns';
import { useEntitySubscription } from '../hooks/useEntitySubscription';
import QuickActionSettings from '../components/shared/QuickActionSettings';
import MobileInvoiceCard from '../components/invoices/MobileInvoiceCard';
import MobilePullRefresh from '../components/mobile/MobilePullRefresh';
import MobileSelect from '@/components/ui/MobileSelect';

const INV_STATUS_STYLES = {
  draft:    'bg-muted text-muted-foreground border-border',
  priority: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  sent:     'bg-blue-500/10 text-blue-400 border-blue-500/30',
  partial:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  paid:     'bg-green-500/10 text-green-400 border-green-500/30',
  overdue:  'bg-red-500/10 text-red-400 border-red-500/30',
  canceled: 'bg-muted text-muted-foreground border-border',
};

const INV_STATUS_CHEVRON = {
  draft:    'border-border/60 bg-muted/50',
  priority: 'border-orange-500/20 bg-orange-500/5',
  sent:     'border-blue-500/20 bg-blue-500/5',
  partial:  'border-yellow-500/20 bg-yellow-500/5',
  paid:     'border-green-500/20 bg-green-500/5',
  overdue:  'border-red-500/20 bg-red-500/5',
  canceled: 'border-border/60 bg-muted/50',
};

function InvoiceStatusSelect({ invoice, queryClient }) {
  const [saving, setSaving] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState(null);
  const current = optimisticStatus ?? (invoice.status || 'draft');

  const handleChange = async (value) => {
    setOptimisticStatus(value);
    setSaving(true);
    try {
      await base44.entities.Invoice.update(invoice.id, { status: value });
      if (invoice.load_id) {
        const statusMap = { draft: 'invoiced', priority: 'priority', sent: 'sent', partial: 'partial', paid: 'paid', overdue: 'overdue', canceled: 'canceled' };
        await base44.entities.Load.update(invoice.load_id, { invoice_status: statusMap[value] || 'invoiced' });
        queryClient.invalidateQueries({ queryKey: ['loads'] });
      }
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setOptimisticStatus(null);
      toast.success('Status updated');
    } catch (err) {
      setOptimisticStatus(null);
      toast.error('Failed to update status: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const options = [
    { value: 'draft', label: 'Draft' },
    { value: 'priority', label: 'Priority' },
    { value: 'sent', label: 'Sent' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'canceled', label: 'Canceled' },
  ];

  const label = options.find(o => o.value === current)?.label || current;
  const badgeCls = INV_STATUS_STYLES[current] || INV_STATUS_STYLES.draft;
  const chevronCls = INV_STATUS_CHEVRON[current] || INV_STATUS_CHEVRON.draft;

  return (
    <>
      {/* Desktop: custom split-badge Radix Select */}
      <div className="hidden md:block">
        <Select value={current} onValueChange={handleChange} disabled={saving}>
          <SelectTrigger className={`h-6 px-0 border rounded-md font-medium w-28 text-xs overflow-hidden flex items-stretch [&>svg]:hidden ${badgeCls}`}>
            <span className="flex-1 flex items-center justify-center px-2 truncate">
              <SelectValue>{label}</SelectValue>
            </span>
            <span className={`flex items-center justify-center px-1.5 border-l ${chevronCls}`}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 3L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Mobile: sheet-based select */}
      <div className="md:hidden">
        <MobileSelect
          value={current}
          onValueChange={handleChange}
          disabled={saving}
          options={options}
          triggerClassName={`h-6 text-xs px-2 border rounded-md font-medium w-28 ${badgeCls}`}
        />
      </div>
    </>
  );
}

export default function Invoices() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [bulkStatusMode, setBulkStatusMode] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [copiedId, setCopiedId] = useState(null);
  const [qaEnabled, setQaEnabled] = useState(() => localStorage.getItem('inv_qa_enabled') === 'true');
  const [qaAction, setQaAction] = useState(() => localStorage.getItem('inv_qa_action') || 'paid');

  const handleQaToggle = (v) => { setQaEnabled(v); localStorage.setItem('inv_qa_enabled', v); };
  const handleQaAction = (v) => { setQaAction(v); localStorage.setItem('inv_qa_action', v); };

  const qaOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'priority', label: 'Priority' },
    { value: 'sent', label: 'Sent' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'canceled', label: 'Canceled' },
  ];

  const handleQuickAction = async (inv) => {
    try {
      await base44.entities.Invoice.update(inv.id, { status: qaAction });
      if (inv.load_id) {
        const statusMap = { draft: 'invoiced', priority: 'priority', sent: 'sent', partial: 'partial', paid: 'paid', overdue: 'overdue', canceled: 'canceled' };
        await base44.entities.Load.update(inv.load_id, { invoice_status: statusMap[qaAction] || 'invoiced' });
        queryClient.invalidateQueries({ queryKey: ['loads'] });
      }
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const label = qaOptions.find(o => o.value === qaAction)?.label || qaAction;
      toast.success(`Invoice marked as ${label}`);
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  };

  useEntitySubscription('Invoice', ['invoices', session?.tenant_id], !!session?.tenant_id);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Invoice.filter({ tenant_id: session.tenant_id }, '-created_date', 500) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  const { data: loads = [] } = useQuery({
    queryKey: ['loads-for-invoices', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Load.filter({ tenant_id: session.tenant_id }, '-created_date', 500) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  const loadsMap = useMemo(() => {
    const m = {};
    loads.forEach(l => { m[l.id] = l; });
    return m;
  }, [loads]);

  const handleCopyLoadNumber = (e, loadNumber) => {
    e.stopPropagation();
    navigator.clipboard.writeText(loadNumber);
    setCopiedId(loadNumber);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const deleteMutation = useMutation({
    mutationFn: async (inv) => {
      await base44.entities.DeletedItem.create({
        tenant_id: session?.tenant_id,
        entity_type: 'Invoice',
        entity_id: inv.id,
        entity_label: `Invoice #${inv.invoice_number} — ${inv.customer_name || ''}`,
        deleted_date: new Date().toISOString().split('T')[0],
        original_data: JSON.stringify(inv),
      });
      await base44.entities.Invoice.delete(inv.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice moved to deleted items');
    },
  });

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const load = loadsMap[inv.load_id];
    const matchesSearch = !search || [inv.invoice_number, inv.customer_name, inv.load_number, load?.external_load_number]
      .some(v => v && v.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalUnpaid = invoices
    .filter(i => ['draft', 'sent', 'partial', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + (i.total || 0), 0);

  const handleBulkStatusUpdate = async (newStatus) => {
    setBulkSaving(true);
    const idsToUpdate = [...selected];
    try {
      await Promise.all(
        idsToUpdate.map(async (id) => {
          const inv = invoices.find(i => i.id === id);
          await base44.entities.Invoice.update(id, { status: newStatus });
          if (inv?.load_id) {
            const statusMap = { draft: 'invoiced', priority: 'priority', sent: 'sent', partial: 'partial', paid: 'paid', overdue: 'overdue', canceled: 'canceled' };
            await base44.entities.Load.update(inv.load_id, { invoice_status: statusMap[newStatus] || 'invoiced' });
          }
        })
      );
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast.success(`Updated ${idsToUpdate.length} invoice${idsToUpdate.length !== 1 ? 's' : ''}`);
      setSelected(new Set());
      setBulkStatusMode(null);
    } catch (err) {
      toast.error('Bulk update failed: ' + err.message);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // intentionally leave bulkStatusMode open so user can retry
    } finally {
      setBulkSaving(false);
    }
  };

  const columns = [
    {
      header: <Checkbox
        checked={filtered.every(r => selected.has(r.id))}
        onCheckedChange={(checked) => {
          if (checked) {
            setSelected(new Set(filtered.map(r => r.id)));
          } else {
            setSelected(new Set());
          }
        }}
      />,
      render: (r) => (
        <Checkbox
          checked={selected.has(r.id)}
          onCheckedChange={(checked) => {
            const next = new Set(selected);
            checked ? next.add(r.id) : next.delete(r.id);
            setSelected(next);
          }}
          onClick={e => e.stopPropagation()}
        />
      )
    },
    { header: 'Invoice #', render: (r) => <span className="font-mono font-semibold text-foreground">{r.invoice_number}</span> },
    {
      header: 'Broker Load #',
      render: (r) => {
        const load = loadsMap[r.load_id];
        const loadNum = load?.external_load_number;
        const copied = copiedId === loadNum;
        return (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {loadNum ? (
              <>
                <span className="font-mono text-blue-400 text-xs">{loadNum}</span>
                <button
                  onClick={(e) => handleCopyLoadNumber(e, loadNum)}
                  className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground/50 hover:text-muted-foreground"
                  title="Copy load number"
                >
                  {copied
                    ? <Check className="w-3 h-3 text-green-400" />
                    : <Copy className="w-3 h-3" />}
                </button>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
            {qaEnabled && (
              <button
                onClick={() => handleQuickAction(r)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors whitespace-nowrap ${INV_STATUS_STYLES[qaAction] || 'bg-primary/10 text-primary border-primary/20'}`}
              >
                {qaOptions.find(o => o.value === qaAction)?.label || qaAction}
              </button>
            )}
          </div>
        );
      }
    },
    { header: 'Customer', render: (r) => <span className="font-medium text-foreground">{r.customer_name || '—'}</span> },
    {
      header: 'Invoice Date',
      render: (r) => {
        const date = r.invoice_date;
        if (!date) return <span className="text-muted-foreground">—</span>;
        const d = new Date(date + 'T12:00:00');
        return isNaN(d.getTime()) ? '—' : <span className="text-muted-foreground">{format(d, 'MMM d, yyyy')}</span>;
      }
    },
    {
      header: 'Delivered',
      render: (r) => {
        const load = loadsMap[r.load_id];
        const date = load?.delivery_date;
        if (!date) return <span className="text-muted-foreground">—</span>;
        const d = new Date(date + 'T12:00:00');
        return isNaN(d.getTime()) ? '—' : <span className="text-muted-foreground">{format(d, 'MMM d, yyyy')}</span>;
      }
    },
    { header: 'Amount', render: (r) => r.total ? <span className="font-semibold text-foreground">${r.total.toLocaleString()}</span> : '—' },
    { header: 'Status', width: '110px', render: (r) => <div onClick={e => e.stopPropagation()}><InvoiceStatusSelect invoice={r} queryClient={queryClient} /></div> },
    {
      header: '', render: (r) => (
        <div className="flex items-center gap-1 group" onClick={e => e.stopPropagation()}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/30 group-hover:text-destructive transition-colors" onClick={e => e.stopPropagation()}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                <AlertDialogDescription>Invoice #{r.invoice_number} will be moved to Deleted Items and kept for 30 days.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(r)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      )
    },
  ];

  return (
    <MobilePullRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}>
    <div className="p-3">
      {/* Toolbar — desktop: single compact row */}
      <div className="hidden md:flex items-center gap-2 mb-3">
        <h1 className="text-sm font-semibold text-foreground whitespace-nowrap mr-1">Invoices</h1>
        <SearchInput value={search} onChange={setSearch} placeholder="Search invoices..." className="w-52 h-7 text-xs" />
        <MobileSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          triggerClassName="h-7 text-xs w-32 border border-input rounded-md px-2 bg-background"
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'priority', label: 'Priority' },
            { value: 'sent', label: 'Sent' },
            { value: 'partial', label: 'Partial' },
            { value: 'paid', label: 'Paid' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'canceled', label: 'Canceled' },
          ]}
        />
        <div className="flex-1" />
        <QuickActionSettings
          enabled={qaEnabled}
          onToggle={handleQaToggle}
          action={qaAction}
          onActionChange={handleQaAction}
          options={qaOptions}
        />
      </div>

      {/* Toolbar — mobile: original layout */}
      <div className="flex md:hidden gap-2 mb-3">
         <SearchInput value={search} onChange={setSearch} placeholder="Search invoices..." className="w-64" />
         <MobileSelect
           value={statusFilter}
           onValueChange={setStatusFilter}
           triggerClassName="h-8 text-xs w-36 border border-input rounded-md px-2 bg-background"
           options={[
             { value: 'all', label: 'All Statuses' },
             { value: 'draft', label: 'Draft' },
             { value: 'priority', label: 'Priority' },
             { value: 'sent', label: 'Sent' },
             { value: 'partial', label: 'Partial' },
             { value: 'paid', label: 'Paid' },
             { value: 'overdue', label: 'Overdue' },
             { value: 'canceled', label: 'Canceled' },
           ]}
         />
         <QuickActionSettings
           enabled={qaEnabled}
           onToggle={handleQaToggle}
           action={qaAction}
           onActionChange={handleQaAction}
           options={qaOptions}
         />
       </div>

       {selected.size > 0 && (
         <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs dark:bg-blue-900/20 dark:border-blue-700">
           <span className="font-medium text-blue-800 dark:text-blue-300">
             {selected.size} invoice{selected.size !== 1 ? 's' : ''} selected
           </span>
           {bulkStatusMode ? (
             <>
               <span className="text-blue-700 dark:text-blue-400">Change status to:</span>
               <Select value={bulkStatusMode} onValueChange={setBulkStatusMode} disabled={bulkSaving}>
                 <SelectTrigger className="h-7 text-xs w-28">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="draft">Draft</SelectItem>
                   <SelectItem value="priority">Priority</SelectItem>
                   <SelectItem value="sent">Sent</SelectItem>
                   <SelectItem value="partial">Partial</SelectItem>
                   <SelectItem value="paid">Paid</SelectItem>
                   <SelectItem value="overdue">Overdue</SelectItem>
                   <SelectItem value="canceled">Canceled</SelectItem>
                 </SelectContent>
               </Select>
               <div className="flex-1" />
               <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setBulkStatusMode(null)} disabled={bulkSaving}>Cancel</Button>
               <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleBulkStatusUpdate(bulkStatusMode)} disabled={bulkSaving}>
                 {bulkSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                 Update
               </Button>
             </>
           ) : (
             <>
               <div className="flex-1" />
               <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setBulkStatusMode('sent')}>Change Status</Button>
               <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Clear</Button>
             </>
           )}
         </div>
       )}
      {/* Desktop table */}
      <div className="hidden md:block">
        <style>{`
          .invoices-desktop-table table { border-collapse: collapse; width: 100%; }
          .invoices-desktop-table thead tr { border-bottom: 1px solid hsl(var(--border)); }
          .invoices-desktop-table thead th { padding: 6px 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: hsl(var(--muted-foreground)); }
          .invoices-desktop-table tbody td { padding: 7px 10px; font-size: 12.5px; border-bottom: 1px solid hsl(var(--border) / 0.4); }
          .invoices-desktop-table tbody tr:last-child td { border-bottom: none; }
          .invoices-desktop-table tbody tr:hover td { background: hsl(var(--muted) / 0.4); }
        `}</style>
        <div className="invoices-desktop-table">
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          onRowClick={(row) => navigate(createPageUrl(`InvoiceDetail?id=${row.id}`))}
          emptyMessage="No invoices found"
        />
        </div>
      </div>
      
      {/* Mobile cards */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No invoices found
          </div>
        ) : (
          filtered.map(inv => (
            <MobileInvoiceCard
              key={inv.id}
              invoice={inv}
              selected={selected}
              onToggleSelect={(id, checked) => {
                const next = new Set(selected);
                checked ? next.add(id) : next.delete(id);
                setSelected(next);
              }}
              onNavigate={(id) => navigate(createPageUrl(`InvoiceDetail?id=${id}`))}
              onDelete={deleteMutation.mutate}
              loadsMap={loadsMap}
              copiedId={copiedId}
              onCopy={handleCopyLoadNumber}
              qaEnabled={qaEnabled}
              qaAction={qaAction}
              onQuickAction={handleQuickAction}
            />
          ))
        )}
      </div>
    </div>
    </MobilePullRefresh>
  );
}