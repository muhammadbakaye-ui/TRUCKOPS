import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/shared/AppSession';
import { base44 } from '@/api/base44Client';
import {
  Container, Receipt, Fuel, ClipboardList, MapPin,
  Truck, Users, Building2, Upload, ArrowRight,
  Calendar, User, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import RevenueCharts from '../components/dashboard/RevenueCharts';
import MobilePullRefresh from '../components/mobile/MobilePullRefresh';
import MobileLoadCard from '../components/mobile/MobileLoadCard';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useEntitySubscription } from '../hooks/useEntitySubscription';

// ─── Desktop-only helpers ────────────────────────────────────────────────────

const fmtDollar = (v) =>
  '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (v) =>
  '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function LoadStatusBadge({ status }) {
  const styles = {
    draft:     'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    saved:     'bg-green-500/10 text-green-400 border border-green-500/30',
    completed: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    canceled:  'bg-red-500/10 text-red-400 border border-red-500/30',
  };
  if (!status) return null;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${styles[status] || 'bg-muted text-muted-foreground'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function InvoiceStatusBadge({ status }) {
  const styles = {
    not_invoiced: 'text-muted-foreground border border-border/50',
    invoiced:     'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    priority:     'bg-orange-500/10 text-orange-400 border border-orange-500/30',
    sent:         'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    paid:         'bg-green-500/10 text-green-400 border border-green-500/30',
    overdue:      'bg-red-500/10 text-red-400 border border-red-500/30',
    partial:      'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
    canceled:     'text-muted-foreground border border-border/50',
  };
  if (!status) return null;
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${styles[status] || 'text-muted-foreground border border-border/50'}`}>
      {label}
    </span>
  );
}

function DesktopLoadCard({ load, onClick }) {
  const route =
    load.pickup_city && load.delivery_city
      ? `${load.pickup_city}, ${load.pickup_state || ''} → ${load.delivery_city}, ${load.delivery_state || ''}`
      : null;
  const pickupDate = load.pickup_date
    ? (() => { try { return format(new Date(load.pickup_date), 'MMM d'); } catch { return null; } })()
    : null;

  return (
    <div
      className="bg-card border border-border/60 rounded-lg p-3.5 cursor-pointer hover:bg-muted/20 hover:border-border transition-colors"
      onClick={onClick}
    >
      {/* Row 1: Load # / Broker # + Status badge */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs min-w-0">
          <span className="font-mono font-semibold text-primary shrink-0">{load.internal_load_number}</span>
          {load.external_load_number && (
            <>
              <span className="text-muted-foreground/50 shrink-0">/</span>
              <span className="text-muted-foreground truncate">{load.external_load_number}</span>
            </>
          )}
        </div>
        <LoadStatusBadge status={load.status} />
      </div>

      {/* Row 2: Customer name */}
      <p className="font-bold text-sm text-foreground mb-1.5 leading-tight">
        {load.customer_name || 'No customer'}
      </p>

      {/* Row 3: Route */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate">{route || 'No route assigned'}</span>
      </div>

      {/* Row 4: Date + Driver + Truck */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        {pickupDate && (
          <span className="flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3" />
            {pickupDate}
          </span>
        )}
        <span className="flex items-center gap-1 truncate">
          <User className="w-3 h-3 shrink-0" />
          {load.driver_1_name || 'Unassigned'}
        </span>
        {load.truck_number && (
          <span className="flex items-center gap-1 shrink-0">
            <Truck className="w-3 h-3" />
            {load.truck_number}
          </span>
        )}
      </div>

      {/* Divider + Amount + Invoice status */}
      <div className="border-t border-border/40 pt-2.5 flex items-center justify-between">
        <span className="font-bold text-sm text-foreground">{fmtDollar(load.invoice_amount || 0)}</span>
        <InvoiceStatusBadge status={load.invoice_status || 'not_invoiced'} />
      </div>
    </div>
  );
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-2.5 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-muted-foreground">
        Revenue: <span className="font-medium text-foreground">{fmtShort(payload[0]?.value)}</span>
      </p>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const handleRefresh = () => queryClient.invalidateQueries();

  const { data: recentLoads = [] } = useQuery({
    queryKey: ['loads-dash-recent', tenantId],
    queryFn: () => tenantId ? base44.entities.Load.filter({ tenant_id: tenantId }, '-delivery_date', 50) : Promise.resolve([]),
    enabled: !!tenantId,
    refetchInterval: 60000,
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ['invoices-dash-all', tenantId],
    queryFn: () => tenantId ? base44.entities.Invoice.filter({ tenant_id: tenantId }, '-created_date', 500) : Promise.resolve([]),
    enabled: !!tenantId,
    refetchInterval: 60000,
  });

  const unpaidInvoicesData = allInvoices.filter(i => ['draft', 'sent', 'overdue', 'partial'].includes(i.status));

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-dash', tenantId],
    queryFn: () => tenantId ? base44.entities.Driver.filter({ tenant_id: tenantId }, 'full_name', 300) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks-dash', tenantId],
    queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 300) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-dash', tenantId],
    queryFn: () => tenantId ? base44.entities.Company.filter({ tenant_id: tenantId }, 'company_name', 500) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: fuelBatches = [] } = useQuery({
    queryKey: ['fuel-dash', tenantId],
    queryFn: () => tenantId ? base44.entities.FuelBatch.filter({ tenant_id: tenantId }, '-created_date', 10) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: statements = [] } = useQuery({
    queryKey: ['statements-dash', tenantId],
    queryFn: () => tenantId ? base44.entities.DriverStatement.filter({ tenant_id: tenantId }, '-created_date', 10) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-dash', tenantId],
    queryFn: () => tenantId ? base44.entities.AuditLog.filter({ tenant_id: tenantId }, '-created_date', 10) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  useEntitySubscription('Load',            ['loads-dash-recent',   tenantId], !!tenantId);
  useEntitySubscription('Invoice',         ['invoices-dash-all',   tenantId], !!tenantId);
  useEntitySubscription('Driver',          ['drivers-dash',        tenantId], !!tenantId);
  useEntitySubscription('Truck',           ['trucks-dash',         tenantId], !!tenantId);
  useEntitySubscription('Company',         ['companies-dash',      tenantId], !!tenantId);
  useEntitySubscription('DriverStatement', ['statements-dash',     tenantId], !!tenantId);
  useEntitySubscription('AuditLog',        ['audit-dash',          tenantId], !!tenantId);

  const loads = recentLoads;
  const invoices = allInvoices;
  const unpaidInvoices = unpaidInvoicesData;
  const displayLoads = recentLoads.slice(0, 8);
  const draftStatements = statements.filter(s => s.status === 'draft');
  const activeDrivers = drivers.filter(d => d.status === 'active');
  const activeTrucks = trucks.filter(t => t.status === 'active');

  // ── Desktop chart data ────────────────────────────────────────────────────

  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = format(startOfMonth(date), 'yyyy-MM-dd');
      const end = format(endOfMonth(date), 'yyyy-MM-dd');
      const ml = loads.filter(l => { const d = l.pickup_date || ''; return d >= start && d <= end && !l.canceled; });
      months.push({ label: format(date, 'MMM yy'), revenue: ml.reduce((s, l) => s + (Number(l.invoice_amount) || 0), 0) });
    }
    return months;
  }, [loads]);

  const curMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
  const prevMonthRevenue = monthlyData[monthlyData.length - 2]?.revenue || 0;
  const pctChange = prevMonthRevenue > 0 ? ((curMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : null;

  const invoiceStatusData = useMemo(() => [
    { name: 'Paid',         value: invoices.filter(i => i.status === 'paid').length,    color: '#10B981' },
    { name: 'Sent',         value: invoices.filter(i => i.status === 'sent').length,    color: '#3B82F6' },
    { name: 'Not Invoiced', value: loads.filter(l => !l.invoice_status || l.invoice_status === 'not_invoiced').length, color: '#F59E0B' },
    { name: 'Overdue',      value: invoices.filter(i => i.status === 'overdue').length, color: '#EF4444' },
  ].filter(d => d.value > 0), [invoices, loads]);

  const topDriversData = useMemo(() => {
    const last2Start = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
    const recent = loads.filter(l => (l.pickup_date || '') >= last2Start && !l.canceled);
    const map = {};
    recent.forEach(l => {
      if (!l.driver_1_name) return;
      map[l.driver_1_name] = (map[l.driver_1_name] || 0) + (Number(l.invoice_amount) || 0);
    });
    return Object.entries(map)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [loads]);

  const quickActions = [
    { label: 'Upload BOL / Rate Con',  icon: Upload,       color: 'bg-blue-500/10 text-blue-400',   path: 'UploadDocument' },
    { label: 'New Load',               icon: Container,    color: 'bg-green-500/10 text-green-400', path: 'Loads?action=new' },
    { label: 'Import Fuel File',       icon: Fuel,         color: 'bg-orange-500/10 text-orange-400', path: 'FuelImport' },
    { label: 'New Driver Statement',   icon: ClipboardList,color: 'bg-purple-500/10 text-purple-400', path: 'StatementBuilder' },
  ];

  const statCards = [
    { label: 'Loads',            value: loads.length,           icon: Container,    color: 'bg-blue-500/10 text-blue-400',    path: 'Loads' },
    { label: 'Unpaid Invoices',  value: unpaidInvoices.length,  icon: Receipt,      color: 'bg-orange-500/10 text-orange-400', path: 'Invoices' },
    { label: 'Active Drivers',   value: activeDrivers.length,   icon: Users,        color: 'bg-green-500/10 text-green-400',  path: 'Drivers' },
    { label: 'Active Trucks',    value: activeTrucks.length,    icon: Truck,        color: 'bg-purple-500/10 text-purple-400', path: 'Trucks' },
    { label: 'Companies',        value: companies.length,       icon: Building2,    color: 'bg-teal-500/10 text-teal-400',    path: 'Companies' },
    { label: 'Draft Statements', value: draftStatements.length, icon: ClipboardList,color: 'bg-amber-500/10 text-amber-400',  path: 'DriverStatements' },
  ];

  return (
    <MobilePullRefresh onRefresh={handleRefresh}>

      {/* ══════════════ MOBILE LAYOUT ══════════════ */}
      <div className="md:hidden p-3 space-y-3">

        {/* Stat cards 2×3 */}
        <div className="grid grid-cols-2 gap-2">
          {statCards.map(({ label, value, icon: Icon, color, path }) => (
            <div
              key={label}
              className="bg-card border border-border/60 rounded-lg p-3 flex items-center justify-between cursor-pointer active:bg-muted/30 transition-colors"
              onClick={() => navigate(createPageUrl(path))}
            >
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Monthly Gross Revenue */}
        <div className="bg-card border border-border/60 rounded-lg p-3">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Monthly Gross Revenue</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Last 6 months</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">{fmtShort(curMonthRevenue)}</p>
              {pctChange !== null && (
                <div className={`flex items-center justify-end gap-1 text-[11px] font-medium mt-0.5 ${pctChange > 0 ? 'text-green-500' : pctChange < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {pctChange > 0 ? <TrendingUp className="w-3 h-3" /> : pctChange < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}% vs last month
                </div>
              )}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 280 }}>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={monthlyData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border/60 rounded-lg p-3">
          <p className="text-sm font-semibold text-foreground mb-2">Quick Actions</p>
          <div className="space-y-0.5">
            {quickActions.map(({ label, icon: Icon, color, path }) => (
              <button
                key={label}
                onClick={() => navigate(createPageUrl(path))}
                className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-md active:bg-muted/50 transition-colors text-left"
              >
                <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Loads */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Recent Loads</span>
            <button onClick={() => navigate(createPageUrl('Loads'))} className="text-primary text-xs flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {displayLoads.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">No loads yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayLoads.map(load => (
                <DesktopLoadCard
                  key={load.id}
                  load={load}
                  onClick={() => navigate(createPageUrl(`LoadDetail?id=${load.id}`))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Recent Activity</span>
            <button onClick={() => navigate(createPageUrl('AuditLogPage'))} className="text-primary text-xs flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="bg-card border border-border/60 rounded-lg p-3">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No activity recorded yet</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.slice(0, 8).map(log => (
                  <div key={log.id} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-foreground leading-snug">
                        <span className="font-semibold capitalize">{log.action_type}</span>
                        {' '}{log.entity_type}
                        {log.entity_label && <span className="text-muted-foreground"> ({log.entity_label})</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {log.user_name && `${log.user_name} · `}
                        {log.created_date ? format(new Date(log.created_date), 'MMM d, h:mm a') : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ══════════════ DESKTOP LAYOUT ══════════════ */}
      <div className="hidden md:flex flex-col gap-4 p-4">

        {/* ── Section 1: Stat cards row ── */}
        <div className="grid grid-cols-6 gap-3">
          {statCards.map(({ label, value, icon: Icon, color, path }) => (
            <div
              key={label}
              className="bg-card border border-border/60 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-border transition-colors"
              onClick={() => navigate(createPageUrl(path))}
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
                <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 2: Revenue (left) + Invoice Status (right) ── */}
        <div className="flex gap-4">
          {/* Monthly Gross Revenue */}
          <div className="flex-1 min-w-0 bg-card border border-border/60 rounded-lg p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Monthly Gross Revenue</p>
                <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground">{fmtShort(curMonthRevenue)}</p>
                {pctChange !== null && (
                  <div className={`flex items-center justify-end gap-1 text-xs font-medium mt-0.5 ${pctChange > 0 ? 'text-green-500' : pctChange < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {pctChange > 0 ? <TrendingUp className="w-3 h-3" /> : pctChange < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}% vs last month
                  </div>
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Invoice Status */}
          <div className="w-[320px] shrink-0 bg-card border border-border/60 rounded-lg p-4">
            <p className="text-sm font-semibold text-foreground mb-4">Invoice Status</p>
            {invoiceStatusData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-16">No invoice data yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie data={invoiceStatusData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={2}>
                      {invoiceStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => v} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5 flex-1 min-w-0">
                  {invoiceStatusData.map(entry => (
                    <div key={entry.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
                        <span className="text-xs text-muted-foreground truncate">{entry.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-foreground shrink-0">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Bottom 3-column row ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 295px 275px' }}>

          {/* ── Recent Loads ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Recent Loads</span>
              <button
                onClick={() => navigate(createPageUrl('Loads'))}
                className="text-primary text-xs hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {displayLoads.length === 0 ? (
              <div className="bg-card border border-border/60 rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">No loads yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayLoads.map(load => (
                  <DesktopLoadCard
                    key={load.id}
                    load={load}
                    onClick={() => navigate(createPageUrl(`LoadDetail?id=${load.id}`))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Top Drivers + Quick Actions ── */}
          <div className="space-y-4">
            {/* Top Drivers */}
            <div className="bg-card border border-border/60 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Top Drivers</span>
                <span className="text-[10px] text-muted-foreground">Last 2 months</span>
              </div>
              {topDriversData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {topDriversData.map((d) => {
                    const max = topDriversData[0].revenue;
                    const pct = max > 0 ? (d.revenue / max) * 100 : 0;
                    const initials = d.name.split(' ').map(p => p[0] || '').join('').toUpperCase().slice(0, 2);
                    return (
                      <div key={d.name} className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium truncate">{d.name}</span>
                            <span className="text-xs font-semibold text-foreground ml-2 shrink-0">{fmtShort(d.revenue)}</span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border/60 rounded-lg p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Quick Actions</p>
              <div className="space-y-0.5">
                {quickActions.map(({ label, icon: Icon, color, path }) => (
                  <button
                    key={label}
                    onClick={() => navigate(createPageUrl(path))}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Recent Activity ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Recent Activity</span>
              <button
                onClick={() => navigate(createPageUrl('AuditLogPage'))}
                className="text-primary text-xs hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-card border border-border/60 rounded-lg p-4">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No activity recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.slice(0, 8).map(log => (
                    <div key={log.id} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-foreground leading-snug">
                          <span className="font-semibold capitalize">{log.action_type}</span>
                          {' '}{log.entity_type}
                          {log.entity_label && (
                            <span className="text-muted-foreground"> ({log.entity_label})</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {log.user_name && `${log.user_name} · `}
                          {log.created_date ? format(new Date(log.created_date), 'MMM d, h:mm a') : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </MobilePullRefresh>
  );
}