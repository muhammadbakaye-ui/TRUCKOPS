import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';

export default function Invoices() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 500),
  });

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
    const matchesSearch = !search || [inv.invoice_number, inv.customer_name, inv.load_number]
      .some(v => v && v.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalUnpaid = invoices
    .filter(i => ['draft', 'sent', 'partial', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + (i.total || 0), 0);

  const columns = [
    { header: 'Invoice #', render: (r) => <span className="font-mono font-semibold">{r.invoice_number}</span> },
    { header: 'Load #', render: (r) => <span className="font-mono text-primary">{r.load_number || '—'}</span> },
    { header: 'Customer', render: (r) => <span className="font-medium">{r.customer_name || '—'}</span> },
    { header: 'Invoice Date', render: (r) => r.invoice_date ? format(new Date(r.invoice_date), 'MMM d, yyyy') : '—' },
    { header: 'Due Date', render: (r) => r.due_date ? format(new Date(r.due_date), 'MMM d, yyyy') : '—' },
    { header: 'Amount', render: (r) => r.total ? <span className="font-medium">${r.total.toLocaleString()}</span> : '—' },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
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
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs w-64" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>
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