import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';
import PageHeader from '@/components/shared/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, LayoutGrid, AlertTriangle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { computeDispatchStatus, normalizeDispatchStatus } from '../lib/dispatchStatus';
import { getTimezone } from '../lib/useTimezone';

const COLUMNS = [
  { key: 'available',  label: 'Available',  color: 'border-blue-500',   headerColor: 'bg-blue-500/10 text-blue-400' },
  { key: 'assigned',   label: 'Assigned',   color: 'border-yellow-500', headerColor: 'bg-yellow-500/10 text-yellow-400' },
  { key: 'in_transit', label: 'In Transit', color: 'border-orange-500', headerColor: 'bg-orange-500/10 text-orange-400' },
  { key: 'delivered',  label: 'Delivered',  color: 'border-green-500',  headerColor: 'bg-green-500/10 text-green-400' },
];

function LoadCard({ load, drivers, trucks, onClick, noDriverWarning }) {
  const driver = drivers.find(d => d.id === load.driver_1_id);
  const truck = trucks.find(t => t.id === load.truck_id);

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-all space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-semibold text-xs text-primary">{load.internal_load_number}</span>
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
      {noDriverWarning && (
        <div className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-500/10 rounded px-1.5 py-1">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          No driver assigned
        </div>
      )}
    </div>
  );
}

export default function DispatchBoard() {
  const navigate = useNavigate();
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [driverFilter, setDriverFilter] = useState('all');
  const [noDriverWarnings, setNoDriverWarnings] = useState(new Set());

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads-dispatch', tenantId],
    queryFn: () => tenantId
      ? base44.entities.Load.filter({ tenant_id: tenantId }, '-updated_date', 500)
      : Promise.resolve([]),
    enabled: !!tenantId,
    refetchInterval: 60000,
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

  // Feature 1 + 2: Background automation — evaluate all loads and fix stale dispatch statuses
  useEffect(() => {
    if (!loads.length || !tenantId) return;
    const tz = getTimezone();
    const toUpdate = loads.filter(l => {
      const expected = computeDispatchStatus(l, tz);
      const current = normalizeDispatchStatus(l.dispatch_status);
      return expected !== current;
    });
    if (!toUpdate.length) return;

    // Optimistic cache update
    queryClient.setQueryData(['loads-dispatch', tenantId], (old) =>
      (old || []).map(load => {
        const expected = computeDispatchStatus(load, tz);
        const current = normalizeDispatchStatus(load.dispatch_status);
        return expected !== current ? { ...load, dispatch_status: expected } : load;
      })
    );
    // Also update the main loads cache
    queryClient.setQueryData(['loads', tenantId], (old) =>
      Array.isArray(old)
        ? old.map(load => {
            const expected = computeDispatchStatus(load, tz);
            const current = normalizeDispatchStatus(load.dispatch_status);
            return expected !== current ? { ...load, dispatch_status: expected } : load;
          })
        : old
    );
    // Persist to server
    toUpdate.forEach(l => {
      const expected = computeDispatchStatus(l, tz);
      base44.entities.Load.update(l.id, { dispatch_status: expected });
    });
  }, [loads, tenantId]);

  const activeLoads = useMemo(() =>
    loads.filter(l => !l.canceled && l.status !== 'canceled'),
    [loads]
  );

  const filteredLoads = useMemo(() => {
    if (driverFilter === 'all') return activeLoads;
    return activeLoads.filter(l => l.driver_1_id === driverFilter || l.driver_2_id === driverFilter);
  }, [activeLoads, driverFilter]);

  const getColumnLoads = useCallback((key) =>
    filteredLoads.filter(l => normalizeDispatchStatus(l.dispatch_status) === key),
    [filteredLoads]
  );

  // Feature 4: Drag and drop handler
  const handleDragEnd = useCallback(({ draggableId, source, destination }) => {
    if (!destination || source.droppableId === destination.droppableId) return;
    const load = loads.find(l => l.id === draggableId);
    if (!load) return;
    const newStatus = destination.droppableId;
    const currentStatus = normalizeDispatchStatus(load.dispatch_status);

    // Rule: Delivered cannot go back to Available
    if (currentStatus === 'delivered' && newStatus === 'available') {
      toast.error("A delivered load can't be moved back to Available");
      return;
    }

    // Optimistic update
    queryClient.setQueryData(['loads-dispatch', tenantId], (old) =>
      (old || []).map(l => l.id === draggableId ? { ...l, dispatch_status: newStatus } : l)
    );

    // In Transit with no driver — allow but show inline warning
    if (newStatus === 'in_transit' && !load.driver_1_id) {
      setNoDriverWarnings(prev => new Set([...prev, draggableId]));
    } else {
      setNoDriverWarnings(prev => { const n = new Set(prev); n.delete(draggableId); return n; });
    }

    // Persist
    base44.entities.Load.update(draggableId, { dispatch_status: newStatus });

    // Assigned with no driver → open load detail so user can assign one
    if (newStatus === 'assigned' && !load.driver_1_id) {
      toast.info('Opening load to assign a driver…');
      setTimeout(() => navigate(createPageUrl(`LoadDetail?id=${draggableId}`)), 400);
    }
  }, [loads, tenantId, queryClient, navigate]);

  if (isLoading) {
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
          <p className="text-xs mt-1">Loads will appear here once they are created.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNS.map(col => {
              const colLoads = getColumnLoads(col.key);
              return (
                <div key={col.key} className={`border-t-2 ${col.color} rounded-lg bg-muted/20 flex flex-col`}>
                  <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${col.headerColor}`}>
                    <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                    <span className="text-xs font-bold">{colLoads.length}</span>
                  </div>
                  <Droppable droppableId={col.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-2 space-y-2 flex-1 min-h-[200px] rounded-b-lg transition-colors ${snapshot.isDraggingOver ? 'bg-primary/10 ring-1 ring-primary/20' : ''}`}
                      >
                        {colLoads.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                            Drop loads here
                          </div>
                        )}
                        {colLoads.map((load, idx) => (
                          <Draggable key={load.id} draggableId={load.id} index={idx}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`select-none cursor-grab active:cursor-grabbing transition-transform ${snapshot.isDragging ? 'rotate-1 scale-105 shadow-xl' : ''}`}
                              >
                                <LoadCard
                                  load={load}
                                  drivers={drivers}
                                  trucks={trucks}
                                  onClick={() => !snapshot.isDragging && navigate(createPageUrl(`LoadDetail?id=${load.id}`))}
                                  noDriverWarning={noDriverWarnings.has(load.id)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}