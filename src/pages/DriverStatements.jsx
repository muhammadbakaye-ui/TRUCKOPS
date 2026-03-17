import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import BulkDeleteBar from '../components/shared/BulkDeleteBar';
import { format } from 'date-fns';
import { STATEMENT_PERIODS_2026 } from '../components/shared/statementCalendar';

const fmt = (dateStr) => format(new Date(dateStr + 'T12:00:00'), 'MMM d');
const fmtFull = (dateStr) => format(new Date(dateStr + 'T12:00:00'), 'MMM d, yyyy');

const periodLabel = (start, end) => `${fmt(start)} – ${fmtFull(end)}`;

export default function DriverStatements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(() => localStorage.getItem('statements_search') || '');
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('statements_status') || 'all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [truckFilter, setTruckFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [collapsedPeriods, setCollapsedPeriods] = useState(new Set());

  useEffect(() => { localStorage.setItem('statements_search', search); }, [search]);
  useEffect(() => { localStorage.setItem('statements_status', statusFilter); }, [statusFilter]);

  const { data: statements = [] } = useQuery({
    queryKey: ['statements'],
    queryFn: () => base44.entities.DriverStatement.list('-statement_date', 300),
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

  // Unique drivers and trucks for filter dropdowns
  const uniqueDrivers = useMemo(() => [...new Set(statements.map(s => s.driver_name).filter(Boolean))].sort(), [statements]);
  const uniqueTrucks = useMemo(() => [...new Set(statements.map(s => s.truck_number).filter(Boolean))].sort(), [statements]);

  // Periods that actually have statements
  const usedPeriods = useMemo(() => {
    const keys = new Set(statements.map(s => s.period_start));
    return STATEMENT_PERIODS_2026.filter(p => keys.has(p.start));
  }, [statements]);

  const filtered = useMemo(() => statements.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !search || [s.driver_name, s.truck_number].some(v => v && v.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesPeriod = periodFilter === 'all' || s.period_start === periodFilter;
    const matchesDriver = driverFilter === 'all' || s.driver_name === driverFilter;
    const matchesTruck = truckFilter === 'all' || s.truck_number === truckFilter;
    return matchesSearch && matchesStatus && matchesPeriod && matchesDriver && matchesTruck;
  }), [statements, search, statusFilter, periodFilter, driverFilter, truckFilter]);

  // Group filtered statements by period_start
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const key = s.period_start || 'unknown';
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    // Sort periods descending
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const togglePeriod = (key) => {
    setCollapsedPeriods(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const hasFilters = search || statusFilter !== 'all' || periodFilter !== 'all' || driverFilter !== 'all' || truckFilter !== 'all';

  return (
    <div className="p-4 space-y-3">
      <PageHeader
        title="Driver Statements"
        description={`${statements.length} total statements`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => navigate(createPageUrl('StatementBuilder'))}>
            <Plus className="w-3.5 h-3.5" /> New Statement
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs w-48" />
        </div>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="h-8 text-xs w-52">
            <SelectValue placeholder="All Periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            {usedPeriods.map(p => (
              <SelectItem key={p.start} value={p.start}>{periodLabel(p.start, p.end)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={driverFilter} onValueChange={setDriverFilter}>
          <SelectTrigger className="h-8 text-xs w-44">
            <SelectValue placeholder="All Drivers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drivers</SelectItem>
            {uniqueDrivers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={truckFilter} onValueChange={setTruckFilter}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="All Trucks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trucks</SelectItem>
            {uniqueTrucks.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

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

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => {
            setSearch(''); setStatusFilter('all'); setPeriodFilter('all'); setDriverFilter('all'); setTruckFilter('all');
          }}>
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      {selected.size > 0 && (
        <BulkDeleteBar
          selectedCount={selected.size}
          allCount={filtered.length}
          onSelectAll={() => setSelected(new Set(filtered.map(s => s.id)))}
          onClearSelection={() => setSelected(new Set())}
          onConfirmDelete={() => deleteMutation.mutate(filtered.filter(s => selected.has(s.id)))}
          isDeleting={deleteMutation.isPending}
          isAllSelected={selected.size === filtered.length}
        />
      )}

      {/* Grouped by period */}
      <div className="space-y-3">
        {grouped.map(([periodKey, stmts]) => {
          const isCollapsed = collapsedPeriods.has(periodKey);
          const periodInfo = STATEMENT_PERIODS_2026.find(p => p.start === periodKey);
          const label = periodInfo
            ? `${fmt(periodInfo.start)} – ${fmtFull(periodInfo.end)}`
            : periodKey || 'Unknown Period';
          const netTotal = stmts.reduce((s, st) => s + (st.final_check_amount || 0), 0);

          return (
            <Card key={periodKey}>
              <CardHeader
                className="py-2.5 px-4 cursor-pointer hover:bg-muted/40 transition-colors border-b"
                onClick={() => togglePeriod(periodKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs text-muted-foreground">({stmts.length} statement{stmts.length !== 1 ? 's' : ''})</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Total Net Pay: <span className="font-semibold text-foreground">${netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </span>
                </div>
              </CardHeader>

              {!isCollapsed && (
                <CardContent className="p-0">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30 border-b">
                      <tr>
                        <th className="text-left p-2 font-medium w-8">
                          <Checkbox
                            checked={stmts.every(s => selected.has(s.id))}
                            onCheckedChange={(checked) => {
                              const next = new Set(selected);
                              stmts.forEach(s => checked ? next.add(s.id) : next.delete(s.id));
                              setSelected(next);
                            }}
                          />
                        </th>
                        <th className="text-left p-2 font-medium">Driver</th>
                        <th className="text-left p-2 font-medium">Truck</th>
                        <th className="text-left p-2 font-medium">Gross</th>
                        <th className="text-left p-2 font-medium">Deductions</th>
                        <th className="text-left p-2 font-medium">Fuel</th>
                        <th className="text-left p-2 font-medium">Net Pay</th>
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="text-left p-2 font-medium">Published</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stmts.map(stmt => (
                        <tr
                          key={stmt.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => navigate(createPageUrl(`StatementBuilder?id=${stmt.id}`))}
                        >
                          <td className="p-2">
                            <Checkbox
                              checked={selected.has(stmt.id)}
                              onCheckedChange={(checked) => {
                                const next = new Set(selected);
                                checked ? next.add(stmt.id) : next.delete(stmt.id);
                                setSelected(next);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="p-2 font-medium">{stmt.driver_name || '—'}</td>
                          <td className="p-2 font-mono">{stmt.truck_number || '—'}</td>
                          <td className="p-2 text-green-700">{stmt.gross_total ? `$${stmt.gross_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                          <td className="p-2 text-red-600">{stmt.deductions_total ? `-$${stmt.deductions_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                          <td className="p-2 text-orange-600">{stmt.fuel_total ? `-$${stmt.fuel_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                          <td className="p-2 font-semibold">{stmt.final_check_amount != null ? `$${stmt.final_check_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
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
                                  <AlertDialogDescription>{stmt.driver_name}'s statement will be moved to Deleted Items.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(stmt); }}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              )}
            </Card>
          );
        })}

        {grouped.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No statements found.
          </div>
        )}
      </div>
    </div>
  );
}