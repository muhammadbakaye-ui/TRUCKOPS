import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Calendar, DollarSign, Handshake } from 'lucide-react';
import { normalizeDispatchStatus } from '../../lib/dispatchStatus';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const COLUMNS = [
  { key: 'available',  label: 'Available',  color: 'border-purple-500', headerColor: 'bg-purple-500/10 text-purple-400', emptyMsg: 'No loads posted yet' },
  { key: 'assigned',   label: 'Upcoming',   color: 'border-yellow-500', headerColor: 'bg-yellow-500/10 text-yellow-600', emptyMsg: 'No upcoming loads' },
  { key: 'in_transit', label: 'In Transit',  color: 'border-blue-500',   headerColor: 'bg-blue-500/10 text-blue-600',   emptyMsg: 'Not currently in transit' },
  { key: 'delivered',  label: 'Delivered',   color: 'border-green-500',  headerColor: 'bg-green-500/10 text-green-600', emptyMsg: 'No delivered loads yet' },
];

function LoadCard({ load, onRequest }) {
  const isRequested = load._requested;

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-semibold text-xs text-primary">{load.internal_load_number}</span>
        {load.invoice_amount > 0 && (
          <span className="text-[11px] font-semibold text-green-600 flex items-center gap-0.5">
            <DollarSign className="w-3 h-3" />{load.invoice_amount.toLocaleString()}
          </span>
        )}
      </div>
      {load.customer_name && (
        <p className="text-xs text-muted-foreground truncate">{load.customer_name}</p>
      )}
      {(load.pickup_city || load.delivery_city) && (
        <div className="flex items-start gap-1 text-xs text-foreground">
          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
          <span>
            {[load.pickup_city, load.pickup_state].filter(Boolean).join(', ')}
            {load.pickup_city && load.delivery_city ? ' → ' : ''}
            {[load.delivery_city, load.delivery_state].filter(Boolean).join(', ')}
          </span>
        </div>
      )}
      {(load.pickup_date || load.delivery_date) && (
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {load.pickup_date && `PU: ${load.pickup_date}`}
            {load.pickup_time ? ` ${load.pickup_time}` : ''}
          </span>
          {load.delivery_date && <span>DEL: {load.delivery_date}</span>}
        </div>
      )}
      {load.commodity && (
        <p className="text-[11px] text-muted-foreground">📦 {load.commodity}</p>
      )}
      {onRequest && (
        <Button
          size="sm"
          variant={isRequested ? "secondary" : "outline"}
          className={`w-full h-7 text-xs ${isRequested ? 'opacity-50' : ''}`}
          onClick={(e) => { e.stopPropagation(); onRequest(load.id); }}
          disabled={isRequested}
        >
          <Handshake className="w-3 h-3 mr-1" />
          {isRequested ? 'Requested' : 'Request Load'}
        </Button>
      )}
    </div>
  );
}

export default function DriverDispatchBoard({ session, driverId: driverIdProp, tenantId: tenantIdProp }) {
  const driverId = driverIdProp || session?.driver_id;
  const tenantId = tenantIdProp || session?.tenant_id;
  const [requestedLoads, setRequestedLoads] = useState(new Set());
  const queryClient = useQueryClient();

  // Loads where THIS driver is explicitly assigned (driver 1 or driver 2)
  const { data: loads1 = [], isLoading: l1 } = useQuery({
    queryKey: ['driver-dispatch-loads1', driverId],
    queryFn: () => base44.entities.Load.filter({ driver_1_id: driverId }, '-pickup_date', 100),
    enabled: !!driverId,
    refetchInterval: 60000,
  });

  const { data: loads2 = [], isLoading: l2 } = useQuery({
    queryKey: ['driver-dispatch-loads2', driverId],
    queryFn: () => base44.entities.Load.filter({ driver_2_id: driverId }, '-pickup_date', 100),
    enabled: !!driverId,
    refetchInterval: 60000,
  });

  // Available loads visible to all drivers (not filtered by driverId)
  const { data: availableRaw = [], isLoading: l3 } = useQuery({
    queryKey: ['driver-dispatch-available', tenantId],
    queryFn: () => base44.entities.Load.filter(
      { tenant_id: tenantId, driver_visibility: true, dispatch_status: 'available' },
      '-pickup_date',
      100
    ),
    enabled: !!tenantId,
    refetchInterval: 60000,
  });

  const isLoading = l1 || l2 || l3;

  // Merge assigned loads — deduplicate, exclude canceled
  const assignedLoads = useMemo(() => {
    const seen = new Set();
    return [...loads1, ...loads2].filter(l => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return l.status !== 'canceled' && !l.canceled;
    });
  }, [loads1, loads2]);

  // Available loads — exclude canceled, mark requested ones
  const availableLoads = useMemo(() => {
    return availableRaw
      .filter(l => l.status !== 'canceled' && !l.canceled)
      .map(l => ({
        ...l,
        _requested: requestedLoads.has(l.id) || (l.metadata?.requested_by_driver_ids || []).includes(driverId)
      }));
  }, [availableRaw, requestedLoads, driverId]);

  const getColumnLoads = (colKey) => {
    if (colKey === 'available') return availableLoads;
    // For all other statuses: ONLY show loads explicitly assigned to this driver
    return assignedLoads.filter(l => normalizeDispatchStatus(l.dispatch_status) === colKey);
  };

  const requestLoadMutation = useMutation({
    mutationFn: async (loadId) => {
      const res = await base44.functions.invoke('handleLoadRequest', {
        action: 'request_load',
        load_id: loadId,
        driver_id: driverId,
        driver_name: session?.driver_name || 'Unknown Driver',
        tenant_id: tenantId
      });
      return res.data;
    },
    onSuccess: (data, loadId) => {
      if (data.success) {
        setRequestedLoads(prev => new Set(prev).add(loadId));
        toast.success('Load requested! You\'ll be notified if accepted.');
        queryClient.invalidateQueries({ queryKey: ['driver-dispatch-available', tenantId] });
      }
    },
    onError: (error) => {
      toast.error('Request failed: ' + error.message);
    }
  });

  const handleRequest = (loadId) => {
    if (!session?.driver_name) {
      toast.error('Driver name not found. Please refresh the page.');
      return;
    }
    requestLoadMutation.mutate(loadId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your loads…
      </div>
    );
  }

  const totalLoads = assignedLoads.length + availableLoads.length;

  if (totalLoads === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm font-medium">No loads assigned to you yet.</p>
        <p className="text-xs mt-1 opacity-70">Your dispatcher will assign loads to you here.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colLoads = getColumnLoads(col.key);
          return (
            <div key={col.key} className={`border-t-2 ${col.color} rounded-lg bg-muted/20 flex flex-col`}>
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${col.headerColor}`}>
                <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                <span className="text-xs font-bold">{colLoads.length}</span>
              </div>
              <div className="p-2 space-y-2 flex-1 min-h-[200px]">
                {colLoads.length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                    {col.emptyMsg}
                  </div>
                ) : (
                  colLoads.map(load => (
                    <LoadCard 
                      key={load.id} 
                      load={load} 
                      onRequest={col.key === 'available' ? handleRequest : null}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}