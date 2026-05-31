import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePreviewGate, PreviewFeatureDialog } from '../components/shared/PreviewFeatureGate';
import { useSession } from '../components/shared/AppSession';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MobileSelect from '@/components/ui/MobileSelect';
import MobilePullRefresh from '../components/mobile/MobilePullRefresh';
import { Plus, Search, Trash2, X, ChevronDown, ChevronRight, Eye, EyeOff, Printer, Loader2, FileText, Settings, Download } from 'lucide-react';
import MobileFAB from '../components/mobile/MobileFAB';
import DefaultDeductionsSettings from '../components/statements/DefaultDeductionsSettings';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import BulkDeleteBar from '../components/shared/BulkDeleteBar';
import { format } from 'date-fns';
import { STATEMENT_PERIODS_2026 } from '../components/shared/statementCalendar';
import { printStatement } from '../components/print/printStatement';

const fmt = (dateStr) => format(new Date(dateStr + 'T12:00:00'), 'MMM d');
const fmtFull = (dateStr) => format(new Date(dateStr + 'T12:00:00'), 'MMM d, yyyy');

const periodLabel = (start, end) => `${fmt(start)} – ${fmtFull(end)}`;

export default function DriverStatements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { showDialog, checkFeatureAccess, handleSubscribe, handleDismiss } = usePreviewGate();
  const isInPreview = session?.subscription_status !== 'active' && session?.subscription_status !== 'trialing';
  const [updatingId, setUpdatingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [showDeductionSettings, setShowDeductionSettings] = useState(false);

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
    queryKey: ['statements', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.DriverStatement.filter({ tenant_id: session.tenant_id }, '-statement_date', 300) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (stmts) => {
      const stmtsArray = Array.isArray(stmts) ? stmts : [stmts];
      for (const stmt of stmtsArray) {
        await base44.entities.DeletedItem.create({
          tenant_id: session?.tenant_id,
          entity_type: 'DriverStatement',
          entity_id: stmt.id,
          entity_label: `${stmt.driver_name} — ${stmt.period_start} to ${stmt.period_end}`,
          deleted_date: new Date().toISOString().split('T')[0],
          original_data: JSON.stringify(stmt),
        });
        await base44.entities.DriverStatement.delete(stmt.id);
      }
      return stmtsArray.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['statements'] });
      toast.success(`${count} statement${count === 1 ? '' : 's'} moved to deleted items`);
      setSelected(new Set());
    },
  });

  const { data: carrierCompany = [] } = useQuery({
    queryKey: ['settings-company', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Company.filter({ company_type: 'carrier', tenant_id: session.tenant_id }, '-created_date', 1) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  const togglePublished = async (stmt, e) => {
    e.stopPropagation();
    setUpdatingId(stmt.id + '_pub');
    try {
      await base44.entities.DriverStatement.update(stmt.id, { published: !stmt.published });
      queryClient.invalidateQueries({ queryKey: ['statements'] });
      toast.success(!stmt.published ? 'Statement published' : 'Statement unpublished');
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleStatus = async (stmt, e) => {
    e.stopPropagation();
    const newStatus = stmt.status === 'draft' ? 'saved' : 'draft';
    setUpdatingId(stmt.id + '_status');
    try {
      await base44.entities.DriverStatement.update(stmt.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['statements'] });
      toast.success(`Status set to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownload = async (stmt, e) => {
    e.stopPropagation();
    setDownloadingId(stmt.id);
    try {
      const lines = await base44.entities.StatementLine.filter({ statement_id: stmt.id }, 'date', 200);
      const company = carrierCompany[0] || {};
      printStatement({ company, statement: stmt, allLines: lines });
    } catch (err) {
      toast.error('Failed to load statement: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

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
    <MobilePullRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['statements'] })}>
    <div className="p-4">
      <PreviewFeatureDialog open={showDialog} onSubscribe={handleSubscribe} onDismiss={handleDismiss} />
      <DefaultDeductionsSettings open={showDeductionSettings} onClose={() => setShowDeductionSettings(false)} tenantId={session?.tenant_id} />
      
      {/* Desktop layout */}
      <div className="hidden md:block space-y-3">
        <PageHeader
          title="Driver Statements"
          description={`${statements.length} total statements`}
          actions={
            <div className="flex gap-2 items-center">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowDeductionSettings(true)} title="Statement Settings">
                <Settings className="w-4 h-4" />
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1 hidden sm:flex" onClick={() => navigate(createPageUrl('StatementBuilder'))}>
                <Plus className="w-3.5 h-3.5" /> New Statement
              </Button>
            </div>
          }
        />

        {/* Desktop Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs w-full sm:w-48" />
          </div>

          <MobileSelect
            value={periodFilter}
            onValueChange={setPeriodFilter}
            triggerClassName="h-8 text-xs w-full sm:w-52 border border-input rounded-md px-2 bg-background"
            options={[
              { value: 'all', label: 'All Periods' },
              ...usedPeriods.map(p => ({ value: p.start, label: periodLabel(p.start, p.end) }))
            ]}
          />

          <MobileSelect
            value={driverFilter}
            onValueChange={setDriverFilter}
            triggerClassName="h-8 text-xs w-full sm:w-44 border border-input rounded-md px-2 bg-background"
            options={[
              { value: 'all', label: 'All Drivers' },
              ...uniqueDrivers.map(d => ({ value: d, label: d }))
            ]}
          />

          <MobileSelect
            value={truckFilter}
            onValueChange={setTruckFilter}
            triggerClassName="h-8 text-xs w-full sm:w-36 border border-input rounded-md px-2 bg-background"
            options={[
              { value: 'all', label: 'All Trucks' },
              ...uniqueTrucks.map(t => ({ value: t, label: t }))
            ]}
          />

          <MobileSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            triggerClassName="h-8 text-xs w-full sm:w-36 border border-input rounded-md px-2 bg-background"
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'saved', label: 'Saved' },
            ]}
          />

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

        {/* Desktop Grouped by period */}
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
                        <th className="text-left p-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stmts.map(stmt => (
                        <tr
                          key={stmt.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => { if (!checkFeatureAccess(isInPreview)) return; navigate(createPageUrl(`StatementBuilder?id=${stmt.id}`)); }}
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
                          <td className="p-2" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost" size="sm"
                              className={`h-6 text-xs px-2 gap-1 ${stmt.status === 'draft' ? 'text-yellow-600 bg-yellow-50' : 'text-green-700 bg-green-50'}`}
                              disabled={updatingId === stmt.id + '_status'}
                              onClick={(e) => toggleStatus(stmt, e)}
                            >
                              {updatingId === stmt.id + '_status' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                              {stmt.status === 'draft' ? 'Draft' : 'Saved'}
                            </Button>
                          </td>
                          <td className="p-2" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost" size="sm"
                              className={`h-6 text-xs px-2 gap-1 ${stmt.published ? 'text-green-600 bg-green-50' : 'text-muted-foreground'}`}
                              disabled={updatingId === stmt.id + '_pub'}
                              onClick={(e) => togglePublished(stmt, e)}
                            >
                              {updatingId === stmt.id + '_pub' ? <Loader2 className="w-3 h-3 animate-spin" /> : stmt.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              {stmt.published ? 'Published' : 'Unpublished'}
                            </Button>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                disabled={downloadingId === stmt.id}
                                onClick={(e) => handleDownload(stmt, e)}
                                title="Download PDF"
                              >
                                {downloadingId === stmt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                              </Button>
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
                            </div>
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

      {/* Mobile card layout */}
      <div className="md:hidden">
        {/* Mobile Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-sm font-semibold text-primary">Driver Statements</h2>
            <p className="text-[11px] text-muted-foreground">{statements.length} total statement{statements.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowDeductionSettings(true)}
            className="p-2.5 text-muted-foreground hover:bg-secondary rounded transition-colors w-9 h-9 flex items-center justify-center"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pl-9 text-xs" />
        </div>

        {/* Mobile 2x2 Filter Grid */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <MobileSelect
            value={periodFilter}
            onValueChange={setPeriodFilter}
            triggerClassName="h-10 text-xs border border-input rounded-md px-3 bg-background w-full"
            options={[
              { value: 'all', label: 'All Periods' },
              ...usedPeriods.map(p => ({ value: p.start, label: periodLabel(p.start, p.end) }))
            ]}
          />
          <MobileSelect
            value={driverFilter}
            onValueChange={setDriverFilter}
            triggerClassName="h-10 text-xs border border-input rounded-md px-3 bg-background w-full"
            options={[
              { value: 'all', label: 'All Drivers' },
              ...uniqueDrivers.map(d => ({ value: d, label: d }))
            ]}
          />
          <MobileSelect
            value={truckFilter}
            onValueChange={setTruckFilter}
            triggerClassName="h-10 text-xs border border-input rounded-md px-3 bg-background w-full"
            options={[
              { value: 'all', label: 'All Trucks' },
              ...uniqueTrucks.map(t => ({ value: t, label: t }))
            ]}
          />
          <MobileSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            triggerClassName="h-10 text-xs border border-input rounded-md px-3 bg-background w-full"
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'saved', label: 'Saved' },
            ]}
          />
        </div>

        {/* Mobile Statement Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13px] text-muted-foreground">No statements found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(stmt => {
              const periodInfo = STATEMENT_PERIODS_2026.find(p => p.start === stmt.period_start);
              const periodText = periodInfo
                ? `${fmt(periodInfo.start)} – ${fmtFull(periodInfo.end)}`
                : stmt.period_start || 'Unknown';
              return (
                <div
                  key={stmt.id}
                  onClick={() => { if (!checkFeatureAccess(isInPreview)) return; navigate(createPageUrl(`StatementBuilder?id=${stmt.id}`)); }}
                  className="bg-card border border-border rounded-[10px] box-border overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
                >
                  {/* Row 1: Title + Status Badge */}
                  <div className="flex justify-between items-start px-3 py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Period: {periodText}</p>
                    </div>
                    <div className={`text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap ${
                      stmt.status === 'draft' ? 'bg-yellow-500/10 text-yellow-600' :
                      stmt.status === 'saved' ? 'bg-green-500/10 text-green-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {stmt.status === 'draft' ? 'Draft' : 'Saved'}
                    </div>
                  </div>

                  {/* Row 2: Driver + Truck chips */}
                  <div className="flex gap-2 px-3 py-2.5 border-t border-border/40 flex-wrap">
                    <span className="text-[11px] px-2 py-1 rounded bg-secondary text-secondary-foreground">{stmt.driver_name || '—'}</span>
                    <span className="text-[11px] px-2 py-1 rounded bg-secondary text-secondary-foreground">{stmt.truck_number || '—'}</span>
                  </div>

                  {/* Row 3: Period + Net Pay */}
                  <div className="flex justify-between items-center px-3 py-2.5 border-t border-border/40">
                    <span className="text-[11px] px-2 py-1 rounded bg-secondary text-secondary-foreground">{periodText}</span>
                    <span className="text-xs font-bold text-primary">${(stmt.final_check_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Footer: Download + Delete */}
                  <div className="flex justify-between items-center px-3 py-2 border-t border-border/40">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(stmt, e); }}
                      className="p-2.5 text-primary hover:bg-primary/10 rounded transition-colors w-10 h-10 flex items-center justify-center"
                      disabled={downloadingId === stmt.id}
                      title="Download PDF"
                    >
                      {downloadingId === stmt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-2.5 text-destructive hover:bg-destructive/10 rounded transition-colors w-10 h-10 flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAB Button */}
        <button
          onClick={() => navigate(createPageUrl('StatementBuilder'))}
          className="fixed right-4 bottom-24 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
    </MobilePullRefresh>
  );
}