import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Calendar, Handshake, Truck, Download } from 'lucide-react';
import { normalizeDispatchStatus } from '../../lib/dispatchStatus';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getLoadHTML } from '../print/printLoad';
import MobilePDFViewer from '../print/MobilePDFViewer';

const COLUMNS = [
  { key: 'available',  label: 'Available',  color: 'border-purple-500', headerColor: 'bg-purple-500/10 text-purple-400', emptyMsg: 'No loads posted yet' },
  { key: 'assigned',   label: 'Upcoming',   color: 'border-yellow-500', headerColor: 'bg-yellow-500/10 text-yellow-600', emptyMsg: 'No upcoming loads' },
  { key: 'in_transit', label: 'In Transit',  color: 'border-blue-500',   headerColor: 'bg-blue-500/10 text-blue-600',   emptyMsg: 'Not currently in transit' },
  { key: 'delivered',  label: 'Delivered',   color: 'border-green-500',  headerColor: 'bg-green-500/10 text-green-600', emptyMsg: 'No delivered loads yet' },
];

function LoadCard({ load, driverId, onRequest, isPending, onDownload }) {
  const [requestError, setRequestError] = useState(null);
  const isRequested = (load.requested_by_driver_ids || []).includes(driverId);

  const handleClick = async (e) => {
    e.stopPropagation();
    setRequestError(null);
    const result = await onRequest(load.id);
    if (!result?.success) setRequestError(result?.error || 'Request failed');
  };

  const pickupDate = load.pickup_date
    ? new Date(load.pickup_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const hasRoute = load.pickup_city || load.delivery_city;
  const originParts = [load.pickup_city, load.pickup_state].filter(Boolean);
  const destParts = [load.delivery_city, load.delivery_state].filter(Boolean);

  return (
    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px' }}>

        {/* Row 1: Load # | Amount | Download */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'hsl(var(--primary))', whiteSpace: 'nowrap' }}>
            {load.internal_load_number}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {load.invoice_amount > 0 && (
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                ${load.invoice_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            )}
            {onDownload && (
              <button
                onClick={(e) => { e.stopPropagation(); onDownload(load); }}
                title="Download invoice PDF"
                style={{ background: 'none', border: 'none', padding: '3px', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', borderRadius: '4px', display: 'flex', alignItems: 'center', opacity: 0.45, transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}
                onTouchStart={e => e.currentTarget.style.opacity = '1'}
                onTouchEnd={e => e.currentTarget.style.opacity = '0.45'}
              >
                <Download style={{ width: '13px', height: '13px' }} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Customer */}
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {load.customer_name || '—'}
        </div>

        {/* Row 3: Route */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginBottom: '7px', overflow: 'hidden' }}>
          <MapPin style={{ width: '11px', height: '11px', flexShrink: 0 }} />
          {hasRoute ? (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {originParts.join(', ')} → {destParts.join(', ')}
            </span>
          ) : <span>No route assigned</span>}
        </div>

        {/* Row 4: Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: onRequest ? '8px' : '0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
            <Calendar style={{ width: '10px', height: '10px' }} />
            <span>{pickupDate || 'No date'}{load.pickup_time ? ' ' + load.pickup_time : ''}</span>
          </div>
          {load.truck_number && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
              <Truck style={{ width: '10px', height: '10px' }} />
              <span>{load.truck_number}</span>
            </div>
          )}
          {load.commodity && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
              <span>📦 {load.commodity}</span>
            </div>
          )}
        </div>

        {/* Request button */}
        {onRequest && (
          <>
            <Button
              size="sm"
              variant={isRequested ? 'secondary' : 'default'}
              className={`w-full h-9 text-xs gap-1.5 ${isRequested ? 'opacity-60' : ''}`}
              onClick={handleClick}
              disabled={isRequested || isPending}
            >
              <Handshake className="w-3.5 h-3.5" />
              {isRequested ? 'Requested' : isPending ? 'Requesting…' : 'Request Load'}
            </Button>
            {requestError && (
              <p className="text-[11px] text-red-500 text-center mt-1">{requestError}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DriverDispatchBoard({ session, driverId: driverIdProp, driverName: driverNameProp, tenantId: tenantIdProp }) {
  const driverId   = driverIdProp || session?.driver_id;
  const driverName = driverNameProp || session?.driver_name || driverId;
  const tenantId   = tenantIdProp || session?.tenant_id;
  const [pending, setPending] = useState(false);
  const [pdfHtml, setPdfHtml] = useState(null);
  const queryClient = useQueryClient();

  const { data: ownerCompany } = useQuery({
    queryKey: ['owner-company-dispatch', tenantId],
    queryFn: () => base44.entities.Company.filter({ tenant_id: tenantId }, '-created_date', 20).then(cos => {
      return cos.find(c => c.is_owner_profile) || cos.find(c => c.company_type === 'owner_operator') || cos.find(c => c.company_type === 'carrier') || cos[0] || null;
    }),
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const handleDownload = (load) => {
    if (!ownerCompany?.company_name) {
      toast.error('Company information not loaded yet. Please try again in a moment.');
      return;
    }
    const html = getLoadHTML({ company: ownerCompany, load, stops: [] });
    setPdfHtml(html);
  };

  const { data: loads1 = [], isLoading: l1 } = useQuery({
    queryKey: ['driver-loads1', driverId, tenantId],
    queryFn:  () => (driverId && tenantId) ? base44.entities.Load.filter({ driver_1_id: driverId, tenant_id: tenantId }, '-pickup_date', 100) : Promise.resolve([]),
    enabled:  !!driverId && !!tenantId,
    staleTime: 120000,
    refetchInterval: 120000,
  });

  const { data: loads2 = [], isLoading: l2 } = useQuery({
    queryKey: ['driver-loads2', driverId, tenantId],
    queryFn:  () => (driverId && tenantId) ? base44.entities.Load.filter({ driver_2_id: driverId, tenant_id: tenantId }, '-pickup_date', 100) : Promise.resolve([]),
    enabled:  !!driverId && !!tenantId,
    staleTime: 120000,
    refetchInterval: 120000,
  });

  const { data: availableRaw = [], isLoading: l3 } = useQuery({
    queryKey: ['driver-available', tenantId],
    queryFn:  () => base44.entities.Load.filter(
      { tenant_id: tenantId, driver_visibility: true, dispatch_status: 'available' },
      '-pickup_date', 100
    ),
    enabled: !!tenantId,
    staleTime: 15000,
    refetchInterval: 15000,
  });

  const availableLoads = useMemo(() =>
    availableRaw.filter(l => l.status !== 'canceled' && !l.canceled),
    [availableRaw]
  );

  const assignedLoads = useMemo(() => {
    const seen = new Set();
    return [...loads1, ...loads2].filter(l => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return l.status !== 'canceled' && !l.canceled;
    });
  }, [loads1, loads2]);

  const getColumnLoads = (colKey) => {
    if (colKey === 'available') return availableLoads;
    return assignedLoads.filter(l => normalizeDispatchStatus(l.dispatch_status) === colKey);
  };

  const handleRequest = async (loadId) => {
    setPending(true);
    try {
      const res = await base44.functions.invoke('handleLoadRequest', {
        action:      'request',
        load_id:     loadId,
        driver_id:   driverId,
        driver_name: driverName,
        tenant_id:   tenantId,
      });
      const result = res.data;
      if (result?.success) {
        toast.success("Load requested! You'll be notified if accepted.");
        queryClient.invalidateQueries({ queryKey: ['driver-available', tenantId] });
      }
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setPending(false);
    }
  };

  if (l1 || l2 || l3) {
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
    <>
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
                      driverId={driverId}
                      onRequest={col.key === 'available' ? handleRequest : null}
                      isPending={pending}
                      onDownload={col.key === 'delivered' ? handleDownload : null}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    {pdfHtml && <MobilePDFViewer htmlContent={pdfHtml} onClose={() => setPdfHtml(null)} />}
    </>
  );
}