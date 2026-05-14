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
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';

const INV_STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  priority: 'bg-orange-50 text-orange-700 border-orange-300',
  sent: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  partial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  canceled: 'bg-gray-100 text-gray-400 border-gray-200',
};

function InvoiceStatusSelect({ invoice, queryClient }) {
  const [saving, setSaving] = useState(false);
  const handleChange = async (value) => {
    setSaving(true);
    try {
      await base44.entities.Invoice.update(invoice.id, { status: value });
      if (invoice.load_id) {
        const statusMap = { draft: 'invoiced', priority: 'priority', sent: 'sent', partial: 'partial', paid: 'paid', overdue: 'overdue', canceled: 'canceled' };
        await base44.entities.Load.update(invoice.load_id, { invoice_status: statusMap[value] || 'invoiced' });
        queryClient.invalidateQueries({ queryKey: ['loads'] });
      }
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  const current = invoice.status || 'draft';
  return (
    <Select value={current} onValueChange={handleChange} disabled={saving}>
      <SelectTrigger className={`h-6 text-xs px-2 border rounded-md font-medium w-28 ${INV_STATUS_STYLES[current] || ''}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[7rem] w-28">
        <SelectItem value="draft" className="text-xs">Draft</SelectItem>
        <SelectItem value="priority" className="text-xs">Priority</SelectItem>
        <SelectItem value="sent" className="text-xs">Sent</SelectItem>
        <SelectItem value="partial" className="text-xs">Partial</SelectItem>
        <SelectItem value="paid" className="text-xs">Paid</SelectItem>
        <SelectItem value="overdue" className="text-xs">Overdue</SelectItem>
        <SelectItem value="canceled" className="text-xs">Canceled</SelectItem>
      </SelectContent>

    </Select>
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
    { header: 'Invoice #', render: (r) => <span className="font-mono font-semibold">{r.invoice_number}</span> },
    {
      header: 'Broker Load #',
      render: (r) => {
        const load = loadsMap[r.load_id];
        const loadNum = load?.external_load_number;
        if (!loadNum) return <span className="text-muted-foreground">—</span>;
        const copied = copiedId === loadNum;
        return (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <span className="font-mono text-primary">{loadNum}</span>
            <button
              onClick={(e) => handleCopyLoadNumber(e, loadNum)}
              className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Copy load number"
            >
              {copied
                ? <Check className="w-3 h-3 text-green-600" />
                : <Copy className="w-3 h-3" />}
            </button>
          </div>
        );
      }
    },
    { header: 'Customer', render: (r) => <span className="font-medium">{r.customer_name || '—'}</span> },
    {
      header: 'Invoice Date',
      render: (r) => {
        const date = r.invoice_date;
        if (!date) return '—';
        const d = new Date(date + 'T12:00:00');
        return isNaN(d.getTime()) ? '—' : format(d, 'MMM d, yyyy');
      }
    },
    {
      header: 'Delivered',
      render: (r) => {
        const load = loadsMap[r.load_id];
        const date = load?.delivery_date;
        if (!date) return '—';
        const d = new Date(date + 'T12:00:00');
        return isNaN(d.getTime()) ? '—' : format(d, 'MMM d, yyyy');
      }
    },
    { header: 'Amount', render: (r) => r.total ? <span className="font-medium">${r.total.toLocaleString()}</span> : '—' },
    { header: 'Status', width: '110px', render: (r) => <div onClick={e => e.stopPropagation()}><InvoiceStatusSelect invoice={r} queryClient={queryClient} /></div> },
    {
      header: '', render: (r) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => e.stopPropagation()}>
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
      )
    },
  ];

  return (
    <div className="p-4">
      <PageHeader
        title="Invoices"
        description={
          <span>
            {filtered.length} invoices · <span className="text-orange-600 font-medium">${totalUnpaid.toLocaleString()} unpaid</span>
          </span>
        }
      />
      <div className="flex gap-2 mb-3">
         <SearchInput value={search} onChange={setSearch} placeholder="Search invoices..." className="w-64" />
         <Select value={statusFilter} onValueChange={setStatusFilter}>
           <SelectTrigger className="h-8 text-xs w-36">
             <SelectValue placeholder="Status" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Statuses</SelectItem>
             <SelectItem value="draft">Draft</SelectItem>
             <SelectItem value="priority">Priority</SelectItem>
             <SelectItem value="sent">Sent</SelectItem>
             <SelectItem value="partial">Partial</SelectItem>
             <SelectItem value="paid">Paid</SelectItem>
             <SelectItem value="overdue">Overdue</SelectItem>
             <SelectItem value="canceled">Canceled</SelectItem>
           </SelectContent>
         </Select>
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
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        onRowClick={(row) => navigate(createPageUrl(`InvoiceDetail?id=${row.id}`))}
        emptyMessage="No invoices found"
      />
    </div>
  );
}