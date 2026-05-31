import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';
import PageHeader from '@/components/shared/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, LayoutGrid, AlertTriangle, Lock, Eye, EyeOff, Bell, Truck, CheckCircle2, XCircle, MapPin, Calendar, User } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { computeDispatchStatus, normalizeDispatchStatus } from '../lib/dispatchStatus';

import { getTimezone } from '../lib/useTimezone';
import UndoToast from '../components/shared/UndoToast';

const COLUMNS = [
  { key: 'available',  label: 'Available',  color: 'border-blue-500',   headerColor: 'bg-blue-500/10 text-blue-400' },
  { key: 'assigned',   label: 'Assigned',   color: 'border-yellow-500', headerColor: 'bg-yellow-500/10 text-yellow-400' },
  { key: 'in_transit', label: 'In Transit', color: 'border-orange-500', headerColor: 'bg-orange-500/10 text-orange-400' },
  { key: 'delivered',  label: 'Delivered',  color: 'border-green-500',  headerColor: 'bg-green-500/10 text-green-400' },
];

const STATUS_OPTIONS = [
  { key: 'available', label: 'Available' },
  { key: 'assigned',  label: 'Assigned' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
];

function LoadCard({ load, drivers, trucks, onClick, noDriverWarning, selectMode, isSelected, onSelect, onToggleVisibility }) {
  const driver = drivers.find(d => d.id === load.driver_1_id);
  const truck = trucks.find(t => t.id === load.truck_id);
  const colKey = normalizeDispatchStatus(load.dispatch_status);
  const pickupDate = load.pickup_date
    ? new Date(load.pickup_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const hasRoute = load.pickup_city || load.delivery_city;
  const originParts = [load.pickup_city, load.pickup_state].filter(Boolean);
  const destParts = [load.delivery_city, load.delivery_state].filter(Boolean);
  const brokerNum = load.external_load_number || null;
  const truncBroker = brokerNum && brokerNum.length > 12 ? '/' + brokerNum.slice(0, 12) + '...' : brokerNum ? '/' + brokerNum : null;

  return (
    <div
      onClick={selectMode ? onSelect : onClick}
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', boxSizing: 'border-box', width: '100%', overflow: 'hidden', cursor: 'pointer' }}
    >
      {/* Mobile layout */}
      <div className="block md:hidden" style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            {selectMode && <Checkbox checked={isSelected} onCheckedChange={onSelect} onClick={e => e.stopPropagation()} className="flex-shrink-0 mr-1" />}
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'hsl(var(--primary))', whiteSpace: 'nowrap', flexShrink: 0 }}>{load.internal_load_number}</span>
            {truncBroker && <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px' }}>{truncBroker}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
            {load.manual_dispatch_override && <Lock style={{ width: '11px', height: '11px', color: '#f59e0b' }} />}
            {colKey === 'available' && !selectMode && (
              <button onClick={e => { e.stopPropagation(); onToggleVisibility(); }} style={{ padding: '2px', background: 'none', border: 'none', cursor: 'pointer' }}>
                {load.driver_visibility ? <Eye style={{ width: '11px', height: '11px', color: '#22c55e' }} /> : <EyeOff style={{ width: '11px', height: '11px' }} />}
              </button>
            )}
            <StatusBadge status={load.status || 'draft'} />
          </div>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{load.customer_name || '—'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginBottom: '7px' }}>
          <MapPin style={{ width: '11px', height: '11px', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hasRoute ? `${originParts.join(', ')} → ${destParts.join(', ')}` : 'No route assigned'}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}><Calendar style={{ width: '10px', height: '10px' }} /><span>{pickupDate || 'No date'}</span></div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}><User style={{ width: '10px', height: '10px' }} /><span>{load.driver_1_name || 'Unassigned'}</span></div>
          {truck && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}><Truck style={{ width: '10px', height: '10px' }} /><span>{truck.unit_number}</span></div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>${(load.invoice_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          <StatusBadge status={load.invoice_status || 'not_invoiced'} />
        </div>
        {noDriverWarning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#d97706', background: 'rgba(245,158,11,0.1)', borderRadius: '4px', padding: '4px 6px', marginTop: '6px' }}>
            <AlertTriangle style={{ width: '12px', height: '12px', flexShrink: 0 }} /> No driver assigned
          </div>
        )}
      </div>

      {/* Desktop layout - matching mobile card design */}
      <div className="hidden md:block" style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            {selectMode && <Checkbox checked={isSelected} onCheckedChange={onSelect} onClick={e => e.stopPropagation()} className="flex-shrink-0 mr-1" />}
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'hsl(var(--primary))', whiteSpace: 'nowrap', flexShrink: 0 }}>{load.internal_load_number}</span>
            {truncBroker && <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px' }}>{truncBroker}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
            {load.manual_dispatch_override && <Lock style={{ width: '11px', height: '11px', color: '#f59e0b' }} />}
            {colKey === 'available' && !selectMode && (
              <button onClick={e => { e.stopPropagation(); onToggleVisibility(); }} style={{ padding: '2px', background: 'none', border: 'none', cursor: 'pointer' }}>
                {load.driver_visibility ? <Eye style={{ width: '11px', height: '11px', color: '#22c55e' }} /> : <EyeOff style={{ width: '11px', height: '11px' }} />}
              </button>
            )}
            <StatusBadge status={load.status || 'draft'} />
          </div>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{load.customer_name || '—'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginBottom: '7px' }}>
          <MapPin style={{ width: '11px', height: '11px', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hasRoute ? `${originParts.join(', ')} → ${destParts.join(', ')}` : 'No route assigned'}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}><Calendar style={{ width: '10px', height: '10px' }} /><span>{pickupDate || 'No date'}</span></div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}><User style={{ width: '10px', height: '10px' }} /><span>{load.driver_1_name || 'Unassigned'}</span></div>
          {truck && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}><Truck style={{ width: '10px', height: '10px' }} /><span>{truck.unit_number}</span></div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>${(load.invoice_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          <StatusBadge status={load.invoice_status || 'not_invoiced'} />
        </div>
        {noDriverWarning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#d97706', background: 'rgba(245,158,11,0.1)', borderRadius: '4px', padding: '4px 6px', marginTop: '6px' }}>
            <AlertTriangle style={{ width: '12px', height: '12px', flexShrink: 0 }} /> No driver assigned
          </div>
        )}
      </div>
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
  const [undoToast, setUndoToast] = useState(null);
  // Feature 6: Bulk select state
  const [selectModeColumn, setSelectModeColumn] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmVisibility, setConfirmVisibility] = useState(null); // { loadId, currentValue }
  const [showRequests, setShowRequests] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmClearDriver, setConfirmClearDriver] = useState(null); // { load, oldStatus, wasManual, oldHistory }

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads-dispatch', tenantId],
    queryFn: () => tenantId
      ? base44.entities.Load.filter({ tenant_id: tenantId }, '-updated_date', 500)
      : Promise.resolve([]),
    enabled: !!tenantId,
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', tenantId],
    queryFn: () => tenantId ? base44.entities.Driver.filter({ tenant_id: tenantId }, 'full_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks', tenantId],
    queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]),
    enabled: !!tenantId,
    staleTime: 300000,
  });

  // Load request notifications
  const { data: requestNotifications = [], refetch: refetchRequests } = useQuery({
    queryKey: ['load-requests', tenantId],
    queryFn: () => base44.entities.Notification.filter(
      { tenant_id: tenantId, notification_type: 'load_request', deleted: false },
      '-created_date',
      50
    ),
    enabled: !!tenantId,
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const executeAcceptRequest = async (notificationId, loadId, driverId, driverName, loadNumber) => {
    try {
      const res = await base44.functions.invoke('handleLoadRequest', {
        action: 'accept',
        load_id: loadId,
        driver_id: driverId,
        driver_name: driverName,
        tenant_id: tenantId,
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'Accept failed');
      await base44.entities.Notification.update(notificationId, { deleted: true });
      toast.success(`${driverName} assigned to Load #${loadNumber}`);
      refetchRequests();
      queryClient.invalidateQueries({ queryKey: ['loads-dispatch', tenantId] });
    } catch (err) {
      toast.error('Failed to accept: ' + err.message);
    }
  };

  const handleAcceptRequest = (notification) => {
    setConfirmDialog({
      type: 'accept',
      notificationId: notification.id,
      loadId: notification.related_entity_id || notification.metadata?.load_id,
      driverId: notification.metadata?.driver_id,
      driverName: notification.metadata?.driver_name || notification.title?.split(' requested')[0],
      loadNumber: notification.metadata?.load_number
    });
  };

  const executeDenyRequest = async (notificationId, loadId, driverId, driverName, loadNumber) => {
    try {
      const res = await base44.functions.invoke('handleLoadRequest', {
        action: 'deny',
        load_id: loadId,
        driver_id: driverId,
        driver_name: driverName,
        tenant_id: tenantId,
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'Deny failed');
      await base44.entities.Notification.update(notificationId, { deleted: true });
      toast.success(`Request denied for Load #${loadNumber}`);
      refetchRequests();
    } catch (err) {
      toast.error('Failed to deny: ' + err.message);
    }
  };

  const handleDenyRequest = (notification) => {
    setConfirmDialog({
      type: 'deny',
      notificationId: notification.id,
      loadId: notification.related_entity_id || notification.metadata?.load_id,
      driverId: notification.metadata?.driver_id,
      loadNumber: notification.metadata?.load_number
    });
  };

  // Bug Fix 1 + Feature 1: Automation — skips manual_dispatch_override loads
  useEffect(() => {
    if (!loads.length || !tenantId) return;
    const tz = getTimezone();
    const toUpdate = loads.filter(l => {
      if (l.manual_dispatch_override) return false; // Feature 1: never touch
      const expected = computeDispatchStatus(l, tz);
      const current = normalizeDispatchStatus(l.dispatch_status);
      return expected !== current;
    });
    if (!toUpdate.length) return;

    // Optimistic update both caches
    const applyAutomation = (load) => {
      if (load.manual_dispatch_override) return load;
      const expected = computeDispatchStatus(load, tz);
      const current = normalizeDispatchStatus(load.dispatch_status);
      return expected !== current ? { ...load, dispatch_status: expected } : load;
    };
    queryClient.setQueryData(['loads-dispatch', tenantId], old => Array.isArray(old) ? old.map(applyAutomation) : old);
    queryClient.setQueryData(['loads', tenantId], old => Array.isArray(old) ? old.map(applyAutomation) : old);

    // Persist to DB with audit entry
    toUpdate.forEach(l => {
      const expected = computeDispatchStatus(l, tz);
      const current = normalizeDispatchStatus(l.dispatch_status);
      const entry = { from: current, to: expected, changed_by: 'Automation', changed_by_type: 'automation', timestamp: new Date().toISOString() };
      base44.entities.Load.update(l.id, {
        dispatch_status: expected,
        dispatch_status_history: [...(l.dispatch_status_history || []).slice(-19), entry],
      });
    });
  }, [loads, tenantId]);

  const activeLoads = useMemo(() => loads.filter(l => !l.canceled && l.status !== 'canceled'), [loads]);

  const filteredLoads = useMemo(() => {
    if (driverFilter === 'all') return activeLoads;
    return activeLoads.filter(l => l.driver_1_id === driverFilter || l.driver_2_id === driverFilter);
  }, [activeLoads, driverFilter]);

  const getColumnLoads = useCallback(key =>
    filteredLoads.filter(l => normalizeDispatchStatus(l.dispatch_status) === key),
    [filteredLoads]
  );

  // Bug Fix 1 + 2: DnD with real DB persist, optimistic rollback, undo (Feature 8)
  const handleDragEnd = useCallback(async ({ draggableId, source, destination }) => {
    if (!destination || source.droppableId === destination.droppableId) return;
    const load = loads.find(l => l.id === draggableId);
    if (!load) return;
    const newStatus = destination.droppableId;
    const oldStatus = normalizeDispatchStatus(load.dispatch_status);
    const wasManual = !!load.manual_dispatch_override;
    const oldHistory = load.dispatch_status_history || [];

    if (oldStatus === 'delivered' && newStatus === 'available') {
      toast.error("A delivered load can't move back to Available");
      return;
    }

    // If moving to 'available' and load has a driver assigned, confirm + clear
    if (newStatus === 'available' && (load.driver_1_id || load.driver_2_id)) {
      setConfirmClearDriver({ load, oldStatus, wasManual, oldHistory });
      return;
    }

    // Save cache snapshot for rollback
    const previousCache = queryClient.getQueryData(['loads-dispatch', tenantId]);
    const entry = { from: oldStatus, to: newStatus, changed_by: session?.admin_name || 'Admin', changed_by_type: 'manual', timestamp: new Date().toISOString() };
    const newHistory = [...oldHistory.slice(-19), entry];

    // Bug Fix 2: Optimistic update immediately
    queryClient.setQueryData(['loads-dispatch', tenantId], old =>
      (old || []).map(l => l.id === draggableId
        ? { ...l, dispatch_status: newStatus, manual_dispatch_override: true, dispatch_status_history: newHistory }
        : l)
    );

    if (newStatus === 'in_transit' && !load.driver_1_id) {
      setNoDriverWarnings(prev => new Set([...prev, draggableId]));
    } else {
      setNoDriverWarnings(prev => { const n = new Set(prev); n.delete(draggableId); return n; });
    }

    // Bug Fix 1: Persist to DB
    try {
      await base44.entities.Load.update(draggableId, {
        dispatch_status: newStatus,
        manual_dispatch_override: true,
        dispatch_status_history: newHistory,
      });
    } catch (err) {
      // Bug Fix 2: Rollback on failure
      queryClient.setQueryData(['loads-dispatch', tenantId], () => previousCache);
      toast.error('Failed to save: ' + err.message);
      return;
    }

    // Feature 8: Undo toast
    setUndoToast({
      message: `Load ${load.internal_load_number} moved to ${newStatus.replace('_', ' ')}`,
      onUndo: async () => {
        queryClient.setQueryData(['loads-dispatch', tenantId], old =>
          (old || []).map(l => l.id === draggableId
            ? { ...l, dispatch_status: oldStatus, manual_dispatch_override: wasManual, dispatch_status_history: oldHistory }
            : l)
        );
        await base44.entities.Load.update(draggableId, {
          dispatch_status: oldStatus,
          manual_dispatch_override: wasManual,
          dispatch_status_history: oldHistory,
        });
      },
    });

    // Notify if assigned with no driver, but do NOT navigate
    if (newStatus === 'assigned' && !load.driver_1_id) {
      toast.info('Assign a driver to this load in Load Detail.');
    }
  }, [loads, tenantId, queryClient, navigate, session]);

  const executeDragToAvailable = useCallback(async ({ load, oldStatus, wasManual, oldHistory }) => {
    const draggableId = load.id;
    const newStatus = 'available';
    const previousCache = queryClient.getQueryData(['loads-dispatch', tenantId]);
    const entry = { from: oldStatus, to: newStatus, changed_by: session?.admin_name || 'Admin', changed_by_type: 'manual', timestamp: new Date().toISOString() };
    const newHistory = [...oldHistory.slice(-19), entry];
    queryClient.setQueryData(['loads-dispatch', tenantId], old =>
      (old || []).map(l => l.id === draggableId
        ? { ...l, dispatch_status: newStatus, manual_dispatch_override: true, dispatch_status_history: newHistory, driver_1_id: null, driver_1_name: null, driver_2_id: null, driver_2_name: null }
        : l)
    );
    try {
      await base44.entities.Load.update(draggableId, { dispatch_status: newStatus, manual_dispatch_override: true, dispatch_status_history: newHistory, driver_1_id: null, driver_1_name: null, driver_2_id: null, driver_2_name: null });
    } catch (err) {
      queryClient.setQueryData(['loads-dispatch', tenantId], () => previousCache);
      toast.error('Failed to save: ' + err.message);
      return;
    }
    setUndoToast({
      message: `Load ${load.internal_load_number} moved to available (driver cleared)`,
      onUndo: async () => {
        queryClient.setQueryData(['loads-dispatch', tenantId], old =>
          (old || []).map(l => l.id === draggableId
            ? { ...l, dispatch_status: oldStatus, manual_dispatch_override: wasManual, dispatch_status_history: oldHistory, driver_1_id: load.driver_1_id, driver_1_name: load.driver_1_name, driver_2_id: load.driver_2_id, driver_2_name: load.driver_2_name }
            : l)
        );
        await base44.entities.Load.update(draggableId, { dispatch_status: oldStatus, manual_dispatch_override: wasManual, dispatch_status_history: oldHistory, driver_1_id: load.driver_1_id, driver_1_name: load.driver_1_name, driver_2_id: load.driver_2_id, driver_2_name: load.driver_2_name });
      },
    });
  }, [tenantId, queryClient, session]);

  // Feature 6: Bulk move all selected loads
  const handleBulkMove = async (targetStatus) => {
    const ids = [...selectedIds];
    const previousCache = queryClient.getQueryData(['loads-dispatch', tenantId]);

    // Optimistic
    queryClient.setQueryData(['loads-dispatch', tenantId], old =>
      (old || []).map(l => ids.includes(l.id)
        ? { ...l, dispatch_status: targetStatus, manual_dispatch_override: true }
        : l)
    );

    try {
      for (const id of ids) {
        const load = loads.find(l => l.id === id);
        const oldStatus = normalizeDispatchStatus(load?.dispatch_status);
        const entry = { from: oldStatus, to: targetStatus, changed_by: session?.admin_name || 'Admin', changed_by_type: 'manual', timestamp: new Date().toISOString() };
        await base44.entities.Load.update(id, {
          dispatch_status: targetStatus,
          manual_dispatch_override: true,
          dispatch_status_history: [...(load?.dispatch_status_history || []).slice(-19), entry],
        });
      }
      toast.success(`${ids.length} load${ids.length !== 1 ? 's' : ''} moved to ${targetStatus.replace('_', ' ')}`);
    } catch (err) {
      queryClient.setQueryData(['loads-dispatch', tenantId], () => previousCache);
      toast.error('Bulk move failed: ' + err.message);
    }
    setSelectedIds(new Set());
    setSelectModeColumn(null);
  };

  // Feature 3 partial: Toggle driver visibility on Available loads
  const handleToggleVisibility = (loadId, currentValue) => {
    // Confirm before making visible
    if (!currentValue) {
      setConfirmVisibility({ loadId, currentValue });
      return;
    }
    applyVisibilityToggle(loadId, currentValue);
  };

  const applyVisibilityToggle = async (loadId, currentValue) => {
    queryClient.setQueryData(['loads-dispatch', tenantId], old =>
      (old || []).map(l => l.id === loadId ? { ...l, driver_visibility: !currentValue } : l)
    );
    try {
      await base44.entities.Load.update(loadId, { driver_visibility: !currentValue });
    } catch (err) {
      queryClient.setQueryData(['loads-dispatch', tenantId], old =>
        (old || []).map(l => l.id === loadId ? { ...l, driver_visibility: currentValue } : l)
      );
      toast.error('Failed to update visibility');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading dispatch board…
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Confirm clear driver dialog — moving to Available with a driver assigned */}
      <AlertDialog open={!!confirmClearDriver} onOpenChange={(open) => !open && setConfirmClearDriver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Driver Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              Setting this load to Available will remove the current driver assignment. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setConfirmClearDriver(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmClearDriver) executeDragToAvailable(confirmClearDriver);
              setConfirmClearDriver(null);
            }}>
              Confirm
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm visibility dialog */}
      <AlertDialog open={!!confirmVisibility} onOpenChange={(open) => !open && setConfirmVisibility(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make Load Visible to Drivers?</AlertDialogTitle>
            <AlertDialogDescription>
              This load will appear in the Available column on the driver portal for all drivers to see. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setConfirmVisibility(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmVisibility) applyVisibilityToggle(confirmVisibility.loadId, confirmVisibility.currentValue);
              setConfirmVisibility(null);
            }}>
              Make Visible
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.type === 'accept' ? 'Accept Request' : 'Deny Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.type === 'accept' ? (
                <p>
                  Assign <strong>{confirmDialog?.driverName || 'Unknown Driver'}</strong> to Load <strong>{confirmDialog?.loadNumber || 'Unknown'}</strong>?
                  This will:
                  <ul className="list-disc list-inside mt-2 text-sm">
                    <li>Assign the driver to this load</li>
                    <li>Change the dispatch status to Assigned</li>
                    <li>Move the load on both dispatch boards</li>
                    <li>Notify {confirmDialog?.driverName || 'the driver'}</li>
                    <li>Deny all other pending requests for this load</li>
                  </ul>
                </p>
              ) : (
                <p>
                  Deny request from <strong>{confirmDialog?.driverName || 'Unknown Driver'}</strong> for Load <strong>{confirmDialog?.loadNumber || 'Unknown'}</strong>?
                  The driver will be notified and can request other loads.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setConfirmDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (confirmDialog?.type === 'accept') {
                  executeAcceptRequest(
                    confirmDialog.notificationId,
                    confirmDialog.loadId,
                    confirmDialog.driverId,
                    confirmDialog.driverName,
                    confirmDialog.loadNumber
                  );
                } else {
                  executeDenyRequest(
                    confirmDialog.notificationId,
                    confirmDialog.loadId,
                    confirmDialog.driverId,
                    confirmDialog.driverName,
                    confirmDialog.loadNumber
                  );
                }
                setConfirmDialog(null);
              }}
              className={confirmDialog?.type === 'deny' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmDialog?.type === 'accept' ? 'Confirm' : 'Deny'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <PageHeader
        title="Dispatch Board"
        description={`${filteredLoads.length} active loads`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs relative"
              onClick={() => setShowRequests(!showRequests)}
            >
              <Bell className="w-3.5 h-3.5 mr-1" />
              Requests
              {requestNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {requestNotifications.length}
                </span>
              )}
            </Button>
            {selectModeColumn && (
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setSelectModeColumn(null); setSelectedIds(new Set()); }}>
                Cancel Select
              </Button>
            )}
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Drivers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Load requests panel */}
      {showRequests && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Load Requests</h3>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowRequests(false)}>
              Close
            </Button>
          </div>
          {requestNotifications.filter(n => n.metadata?.request_status !== 'accepted' && n.metadata?.request_status !== 'denied').length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-2">
              {requestNotifications.filter(n => n.metadata?.request_status !== 'accepted' && n.metadata?.request_status !== 'denied').map(notification => (
                <div key={notification.id} className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handleAcceptRequest(notification)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => handleDenyRequest(notification)}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              const isSelectMode = selectModeColumn === col.key;
              return (
                <div key={col.key} className={`border-t-2 ${col.color} rounded-lg bg-muted/20 flex flex-col`}>
                  <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${col.headerColor}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                      <span className="text-xs font-bold">{colLoads.length}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (isSelectMode) { setSelectModeColumn(null); setSelectedIds(new Set()); }
                        else { setSelectModeColumn(col.key); setSelectedIds(new Set()); }
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-current opacity-60 hover:opacity-100 transition-opacity"
                    >
                      {isSelectMode ? 'Done' : 'Select'}
                    </button>
                  </div>
                  <Droppable droppableId={col.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-2 space-y-2 flex-1 min-h-[200px] rounded-b-lg transition-colors ${snapshot.isDraggingOver ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : ''}`}
                      >
                        {colLoads.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                            {isSelectMode ? 'No loads' : 'Drop loads here'}
                          </div>
                        )}
                        {colLoads.map((load, idx) => (
                          <Draggable key={load.id} draggableId={load.id} index={idx} isDragDisabled={isSelectMode}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`select-none cursor-grab active:cursor-grabbing transition-transform ${snapshot.isDragging ? 'rotate-1 scale-105 shadow-xl opacity-90' : ''}`}
                              >
                                <LoadCard
                                  load={load}
                                  drivers={drivers}
                                  trucks={trucks}
                                  onClick={() => !snapshot.isDragging && navigate(createPageUrl(`LoadDetail?id=${load.id}`))}
                                  noDriverWarning={noDriverWarnings.has(load.id)}
                                  selectMode={isSelectMode}
                                  isSelected={selectedIds.has(load.id)}
                                  onSelect={() => {
                                    setSelectedIds(prev => {
                                      const n = new Set(prev);
                                      n.has(load.id) ? n.delete(load.id) : n.add(load.id);
                                      return n;
                                    });
                                  }}
                                  onToggleVisibility={() => handleToggleVisibility(load.id, !!load.driver_visibility)}
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

      {/* Feature 6: Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl shadow-2xl flex-wrap justify-center">
          <span className="text-xs font-medium text-muted-foreground">
            {selectedIds.size} selected — Move to:
          </span>
          {STATUS_OPTIONS.map(opt => (
            <Button key={opt.key} size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkMove(opt.key)}>
              {opt.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setSelectedIds(new Set()); setSelectModeColumn(null); }}>
            Cancel
          </Button>
        </div>
      )}

      {/* Feature 8: Undo toast */}
      {undoToast && (
        <UndoToast
          message={undoToast.message}
          onUndo={undoToast.onUndo}
          onClose={() => setUndoToast(null)}
        />
      )}
    </div>
  );
}