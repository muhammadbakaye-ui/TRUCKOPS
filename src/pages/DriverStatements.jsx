import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import BulkDeleteBar from '../components/shared/BulkDeleteBar';
import { format } from 'date-fns';

export default function DriverStatements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());

  const { data: statements = [], isLoading } = useQuery({
    queryKey: ['statements'],
    queryFn: () => base44.entities.DriverStatement.list('-created_date', 300),
  });

  const deleteMutation = useMutation({
    mutationFn: async (stmts) => {
      const stmtsArray = Array.isArray(stmts) ? stmts : [stmts];
      for (const stmt of stmtsArray) {
        await base44.entities.DeletedItem.create({
          entity_type: 'DriverStatement',
          entity_id: stmt.id,
          entity_label: `${stmt.driver_name} — ${stmt.period_start} to ${stmt.period_end}`,
          deleted_date: new Date().toISOString().split('T')[0],
          original_data: JSON.stringify(stmt),
        });
        await base44.entities.DriverStatement.delete(stmt.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements'] });
      const count = selected.size;
      toast.success(`${count} statement${count === 1 ? '' : 's'} moved to deleted items`);
      setSelected(new Set());
    },
  });

  const filtered = statements.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !search || [s.driver_name, s.truck_number]
      .some(v => v && v.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      header: (
        <Checkbox
          checked={selected.size > 0 && selected.size === filtered.length}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelected(new Set(filtered.map(s => s.id)));
            } else {
              setSelected(new Set());
            }
          }}
        />
      ),
      render: (r) => (
        <Checkbox
          checked={selected.has(r.id)}
          onCheckedChange={(checked) => {
            const newSelected = new Set(selected);
            if (checked) {
              newSelected.add(r.id);
            } else {
              newSelected.delete(r.id);
            }
            setSelected(newSelected);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
    { header: 'Driver', render: (r) => <span className="font-medium">{r.driver_name || '—'}</span> },
    { header: 'Truck', render: (r) => r.truck_number ? <span className="font-mono">{r.truck_number}</span> : '—' },
    { header: 'Period', render: (r) => r.period_start && r.period_end
      ? `${format(new Date(r.period_start), 'MMM d')} – ${format(new Date(r.period_end), 'MMM d, yyyy')}`
      : '—'
    },
    { header: 'Gross', render: (r) => r.gross_total ? `$${r.gross_total.toLocaleString()}` : '—' },
    { header: 'Deductions', render: (r) => r.deductions_total ? `$${r.deductions_total.toLocaleString()}` : '—' },
    { header: 'Net Pay', render: (r) => r.final_check_amount != null
      ? <span className="font-semibold">${r.final_check_amount.toLocaleString()}</span>
      : '—'
    },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { 
      header: 'Published', 
      render: (r) => r.published 
        ? <span className="text-xs font-medium text-green-600">✓ Published</span>
        : <span className="text-xs text-muted-foreground">Draft</span>
    },
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
              <AlertDialogTitle>Delete Statement?</AlertDialogTitle>
              <AlertDialogDescription>{r.driver_name}'s statement will be moved to Deleted Items and kept for 30 days.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(r);
              }}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
    },
  ];

  return (
    <div className="p-4">
      <PageHeader
        title="Driver Statements"
        description={`${statements.length} total statements`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => navigate(createPageUrl('StatementBuilder'))}>
            <Plus className="w-3.5 h-3.5" /> New Statement
          </Button>
        }
      />
      <div className="flex gap-2 mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search by driver..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs w-64" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="finalized">Finalized</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {selected.size > 0 && (
        <BulkDeleteBar
          selectedCount={selected.size}
          allCount={filtered.length}
          onSelectAll={() => setSelected(new Set(filtered.map(s => s.id)))}
          onClearSelection={() => setSelected(new Set())}
          onConfirmDelete={() => {
            const stmtsToDelete = filtered.filter(s => selected.has(s.id));
            deleteMutation.mutate(stmtsToDelete);
          }}
          isDeleting={deleteMutation.isPending}
          isAllSelected={selected.size === filtered.length}
        />
      )}
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        onRowClick={(row) => navigate(createPageUrl(`StatementBuilder?id=${row.id}`))}
        emptyMessage="No statements found. Create a new driver statement."
      />
    </div>
  );
}