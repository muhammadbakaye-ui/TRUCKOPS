import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/components/shared/AppSession';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Container, Receipt, AlertTriangle, Fuel, ClipboardList, 
  Truck, Users, Building2, Upload, ArrowRight
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import StatusBadge from '../components/shared/StatusBadge';
import RevenueCharts from '../components/dashboard/RevenueCharts';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { session } = useSession();
  const tenantId = session?.tenant_id;

  // Load only what the dashboard actually renders — filtered by tenant
  const { data: recentLoads = [] } = useQuery({
    queryKey: ['loads-dash-recent', tenantId],
    queryFn: () => tenantId ? base44.entities.Load.filter({ tenant_id: tenantId }, '-delivery_date', 50) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  // Single query for all invoices — used for charts and unpaid count
  const { data: allInvoices = [] } = useQuery({
    queryKey: ['invoices-dash-all', tenantId],
    queryFn: () => tenantId ? base44.entities.Invoice.filter({ tenant_id: tenantId }, '-created_date', 500) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  // Derive unpaid from the same dataset — no extra network calls
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

  // Alias for chart and stats — use the smaller recent set for display
  const loads = recentLoads;
  const invoices = allInvoices;

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

  const unpaidInvoices = unpaidInvoicesData;
  const displayLoads = recentLoads.slice(0, 8);
  const draftStatements = statements.filter(s => s.status === 'draft');
  const activeDrivers = drivers.filter(d => d.status === 'active');
  const activeTrucks = trucks.filter(t => t.status === 'active');

  return (
    <div className="p-4 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard label="Loads" value={loads.length} icon={Container} color="text-blue-600" onClick={() => navigate(createPageUrl('Loads'))} />
        <StatCard label="Unpaid Invoices" value={unpaidInvoices.length} icon={Receipt} color="text-orange-600" onClick={() => navigate(createPageUrl('Invoices'))} />
        <StatCard label="Active Drivers" value={activeDrivers.length} icon={Users} color="text-green-600" onClick={() => navigate(createPageUrl('Drivers'))} />
        <StatCard label="Active Trucks" value={activeTrucks.length} icon={Truck} color="text-purple-600" onClick={() => navigate(createPageUrl('Trucks'))} />
        <StatCard label="Companies" value={companies.length} icon={Building2} color="text-cyan-600" onClick={() => navigate(createPageUrl('Companies'))} />
        <StatCard label="Draft Statements" value={draftStatements.length} icon={ClipboardList} color="text-yellow-600" onClick={() => navigate(createPageUrl('DriverStatements'))} />
      </div>

      <RevenueCharts loads={loads} drivers={drivers} invoices={invoices} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Loads */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Loads</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate(createPageUrl('Loads'))}>
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {/* Mobile: stacked cards */}
            <div className="md:hidden space-y-2">
              {displayLoads.map(load => (
                <div
                  key={load.id}
                  className="rounded-lg border border-border/50 p-3 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors"
                  onClick={() => navigate(createPageUrl(`LoadDetail?id=${load.id}`))}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-semibold text-primary text-sm">{load.internal_load_number}</span>
                    <StatusBadge status={load.status} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{load.customer_name || 'No customer'}</p>
                  {(load.pickup_city || load.delivery_city) && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {load.pickup_city ? `${load.pickup_city}, ${load.pickup_state}` : '—'} → {load.delivery_city ? `${load.delivery_city}, ${load.delivery_state}` : '—'}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {load.pickup_date ? format(new Date(load.pickup_date), 'MMM d') : ''}
                    </span>
                    {load.invoice_amount ? (
                      <span className="font-semibold text-sm">${load.invoice_amount.toLocaleString()}</span>
                    ) : null}
                  </div>
                </div>
              ))}
              {displayLoads.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No loads yet. <Button variant="link" className="text-sm p-0 h-auto" onClick={() => navigate(createPageUrl('UploadDocument'))}>Upload a document</Button> to get started.
                </div>
              )}
            </div>
            {/* Desktop: row layout */}
            <div className="hidden md:block space-y-1">
              {displayLoads.map(load => (
                <div
                  key={load.id}
                  className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/50 cursor-pointer text-[13px]"
                  onClick={() => navigate(createPageUrl(`LoadDetail?id=${load.id}`))}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-medium text-primary">{load.internal_load_number}</span>
                    <span className="text-muted-foreground truncate">{load.customer_name || 'No customer'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {load.pickup_city && load.delivery_city
                        ? `${load.pickup_city}, ${load.pickup_state} → ${load.delivery_city}, ${load.delivery_state}`
                        : '—'}
                    </span>
                    <StatusBadge status={load.status} />
                    {load.invoice_amount ? (
                      <span className="font-medium text-right w-20">${load.invoice_amount.toLocaleString()}</span>
                    ) : null}
                  </div>
                </div>
              ))}
              {displayLoads.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No loads yet. <Button variant="link" className="text-sm p-0 h-auto" onClick={() => navigate(createPageUrl('UploadDocument'))}>Upload a document</Button> to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions + Recent Activity */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1.5">
              <Button variant="outline" className="w-full justify-start text-xs h-8 gap-2" onClick={() => navigate(createPageUrl('UploadDocument'))}>
                <Upload className="w-3.5 h-3.5" /> Upload BOL / Rate Con
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-8 gap-2" onClick={() => navigate(createPageUrl('Loads?action=new'))}>
                <Container className="w-3.5 h-3.5" /> New Load
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-8 gap-2" onClick={() => navigate(createPageUrl('FuelImport'))}>
                <Fuel className="w-3.5 h-3.5" /> Import Fuel File
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-8 gap-2" onClick={() => navigate(createPageUrl('StatementBuilder'))}>
                <ClipboardList className="w-3.5 h-3.5" /> New Driver Statement
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate(createPageUrl('AuditLogPage'))}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2">
                {auditLogs.slice(0, 6).map(log => (
                  <div key={log.id} className="flex items-start gap-2 text-[12px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-foreground">
                        <span className="font-medium">{log.action_type}</span> {log.entity_type} {log.entity_label && <span className="text-muted-foreground">({log.entity_label})</span>}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {log.user_name} · {log.created_date ? format(new Date(log.created_date), 'MMM d, h:mm a') : ''}
                      </p>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity recorded yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}