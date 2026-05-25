import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, LayoutGrid } from 'lucide-react';

const COLUMNS = [
  {
    key: 'available',
    label: 'Available',
    color: 'border-blue-500',
    headerColor: 'bg-blue-500/10 text-blue-400',
    statuses: ['pending'],
    noDriver: true,
  },
  {
    key: 'assigned',
    label: 'Assigned',
    color: 'border-yellow-500',
    headerColor: 'bg-yellow-500/10 text-yellow-400',
    statuses: ['dispatched'],
  },
  {
    key: 'in_transit',
    label: 'In Transit',
    color: 'border-orange-500',
    headerColor: 'bg-orange-500/10 text-orange-400',
    statuses: ['in_transit', 'at_pickup', 'at_delivery'],
  },
  {
    key: 'delivered',
    label: 'Delivered',
    color: 'border-green-500',
    headerColor: 'bg-green-500/10 text-green-400',
    statuses: ['delivered', 'completed'],
  },
];

function LoadCard({ load, drivers, trucks, onClick }) {
  const driver = drivers.find(d => d.id === load.driver_1_id);
  const truck = trucks.find(t => t.id === load.truck_id);

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-all space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-semibold text-xs text-primary">{load.internal_load_number}</span>
        <StatusBadge status={load.dispatch_status} />
      </div>
      {load.customer_name && (
        <p className="text-xs text-muted-foreground truncate">{load.customer_name}</p>
      )}
      {(load.pickup_city || load.delivery_city) && (
        <p className="text-xs text-foreground">
          {[load.pickup_city, load.pickup_state].filter(Boolean).join(', ')}
          {load.pickup_city && load.delivery_city ? ' → ' : ''}
          {[load.delivery_city, load.delivery_state].filter(Boolean).join(', ')}
        </p>
      )}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {driver && <span>👤 {driver.full_name}</span>}
        {truck && <span>🚛 {truck.unit_number}</span>}
      </div>
      {(load.pickup_date || load.delivery_date) && (
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          {load.pickup_date && <span>PU: {load.pickup_date}</span>}
          {load.delivery_date && <span>DEL: {load.delivery_date}</span>}
        </div>
      )}
      {load.invoice_amount > 0 && (
        <p className="text-xs font-medium text-green-600">${load.invoice_amount.toLocaleString()}</p>
      )}
    </div>
  );
}

export default function DispatchBoard() {
  const navigate = useNavigate();
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const [driverFilter, setDriverFilter] = useState('all');

  const { data: loads = [], isLoading: loadsLoading } = useQuery({
    queryKey: ['loads-dispatch', tenantId],
    queryFn: () => tenantId
      ? base44.entities.Load.filter({ tenant_id: tenantId }, '-updated_date', 500)
      : Promise.resolve([]),
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', tenantId],
    queryFn: () => tenantId ? base44.entities.Driver.filter({ tenant_id: tenantId }, 'full_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks', tenantId],
    queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const activeLoads = useMemo(() =>
    loads.filter(l => !l.canceled && l.status !== 'canceled'),
    [loads]
  );

  const filteredLoads = useMemo(() => {
    if (driverFilter === 'all') return activeLoads;
    return activeLoads.filter(l => l.driver_1_id === driverFilter || l.driver_2_id === driverFilter);
  }, [activeLoads, driverFilter]);

  const getColumnLoads = (col) => {
    return filteredLoads.filter(l => {
      const statusMatch = col.statuses.includes(l.dispatch_status);
      if (col.noDriver) {
        return statusMatch || (!l.driver_1_id && !l.dispatch_status);
      }
      return statusMatch;
    });
  };

  if (loadsLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading dispatch board…
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Dispatch Board"
        description={`${filteredLoads.length} active loads`}
        actions={
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="All Drivers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {filteredLoads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <LayoutGrid className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No active loads found.</p>
          <p className="text-xs mt-1">Loads will appear here once they are created and dispatched.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const colLoads = getColumnLoads(col);
            return (
              <div key={col.key} className={`border-t-2 ${col.color} rounded-lg bg-muted/20 flex flex-col`}>
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${col.headerColor}`}>
                  <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-bold">{colLoads.length}</span>
                </div>
                <div className="p-2 space-y-2 flex-1 min-h-[200px]">
                  {colLoads.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">No loads</div>
                  ) : (
                    colLoads.map(load => (
                      <LoadCard
                        key={load.id}
                        load={load}
                        drivers={drivers}
                        trucks={trucks}
                        onClick={() => navigate(createPageUrl(`LoadDetail?id=${load.id}`))}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}