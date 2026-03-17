import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import BulkDeleteBar from '../components/shared/BulkDeleteBar';
import { format } from 'date-fns';

export default function DriverStatements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(() => localStorage.getItem('statements_search') || '');
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('statements_status') || 'all');
  const [selected, setSelected] = useState(new Set());
  useEffect(() => {
    localStorage.setItem('statements_search', search);
  }, [search]);

  useEffect(() => {
    localStorage.setItem('statements_status', statusFilter);
  }, [statusFilter]);

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
        {(search || statusFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs gap-1" 
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
            }}
          >
            <X className="w-3.5 h-3.5" /> Clear Filters
          </Button>
        )}
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
      
      <div className="space-y-3">
        {sortedPeriods.map(periodKey => {
          const periodStatements = groupedByPeriod[periodKey];
          const isExpanded = expandedPeriods.has(periodKey);
          const [startDate, endDate] = periodKey.split(' – ');
          
          return (
            <Card key={periodKey}>
              <CardHeader 
                className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => togglePeriod(periodKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <CardTitle className="text-sm font-semibold">
                      {format(new Date(startDate), 'MMM d')} – {format(new Date(endDate), 'MMM d, yyyy')} (Sun–Sat)
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">({periodStatements.length} statement{periodStatements.length === 1 ? '' : 's'})</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span>Total Net Pay: <span className="font-semibold">${periodStatements.reduce((sum, s) => sum + (s.final_check_amount || 0), 0).toLocaleString()}</span></span>
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-y">
                        <tr>
                          <th className="text-left p-2 font-medium">
                            <Checkbox
                              checked={periodStatements.every(s => selected.has(s.id))}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selected);
                                periodStatements.forEach(s => {
                                  if (checked) {
                                    newSelected.add(s.id);
                                  } else {
                                    newSelected.delete(s.id);
                                  }
                                });
                                setSelected(newSelected);
                              }}
                            />
                          </th>
                          <th className="text-left p-2 font-medium">Driver</th>
                          <th className="text-left p-2 font-medium">Truck</th>
                          <th className="text-left p-2 font-medium">Gross</th>
                          <th className="text-left p-2 font-medium">Deductions</th>
                          <th className="text-left p-2 font-medium">Net Pay</th>
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Published</th>
                          <th className="text-left p-2 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodStatements.map(stmt => (
                          <tr 
                            key={stmt.id} 
                            className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => navigate(createPageUrl(`StatementBuilder?id=${stmt.id}`))}
                          >
                            <td className="p-2">
                              <Checkbox
                                checked={selected.has(stmt.id)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selected);
                                  if (checked) {
                                    newSelected.add(stmt.id);
                                  } else {
                                    newSelected.delete(stmt.id);
                                  }
                                  setSelected(newSelected);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="p-2 font-medium">{stmt.driver_name || '—'}</td>
                            <td className="p-2 font-mono">{stmt.truck_number || '—'}</td>
                            <td className="p-2">{stmt.gross_total ? `$${stmt.gross_total.toLocaleString()}` : '—'}</td>
                            <td className="p-2">{stmt.deductions_total ? `$${stmt.deductions_total.toLocaleString()}` : '—'}</td>
                            <td className="p-2 font-semibold">{stmt.final_check_amount != null ? `$${stmt.final_check_amount.toLocaleString()}` : '—'}</td>
                            <td className="p-2"><StatusBadge status={stmt.status} /></td>
                            <td className="p-2">
                              {stmt.published 
                                ? <span className="text-green-600 font-medium">✓ Published</span>
                                : <span className="text-muted-foreground">Draft</span>
                              }
                            </td>
                            <td className="p-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => e.stopPropagation()}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Statement?</AlertDialogTitle>
                                    <AlertDialogDescription>{stmt.driver_name}'s statement will be moved to Deleted Items and kept for 30 days.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={(e) => {
                                      e.stopPropagation();
                                      deleteMutation.mutate(stmt);
                                    }}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        {sortedPeriods.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No statements found. Create a new driver statement.
          </div>
        )}
      </div>
    </div>
  );
}