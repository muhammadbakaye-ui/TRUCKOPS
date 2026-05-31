import React from 'react';
import { MapPin, Calendar, User, Hash, Copy, Check, Download, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

export default function MobileLoadCard({ load, copiedId, onCopy, onNavigate, onDelete, onPrint }) {
  if (!load) return null;

  const pickupDate = load.pickup_date
    ? new Date(load.pickup_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const hasRoute = load.pickup_city || load.delivery_city;
  const originParts = [load.pickup_city, load.pickup_state].filter(Boolean);
  const destParts = [load.delivery_city, load.delivery_state].filter(Boolean);

  const brokerNum = load.external_load_number || null;
  const truncBroker = brokerNum && brokerNum.length > 12
    ? '/' + brokerNum.slice(0, 12) + '...'
    : brokerNum ? '/' + brokerNum : null;

  return (
    <div
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}
      onClick={onNavigate}
    >
      {/* Main content */}
      <div style={{ padding: '10px 12px' }}>

        {/* Row 1: Load # + broker # + copy | status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'hsl(var(--primary))', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {load.internal_load_number}
            </span>
            {truncBroker && (
              <>
                <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>
                  {truncBroker}
                </span>
                <span
                  onClick={(e) => { e.stopPropagation(); onCopy && onCopy(e, brokerNum); }}
                  style={{ cursor: 'pointer', flexShrink: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center', padding: '2px' }}
                >
                  {copiedId === brokerNum
                    ? <Check style={{ width: '10px', height: '10px', color: 'hsl(var(--chart-2))' }} />
                    : <Copy style={{ width: '10px', height: '10px', color: 'hsl(var(--muted-foreground))' }} />}
                </span>
              </>
            )}
          </div>
          <div style={{ flexShrink: 0, marginLeft: '8px' }}>
            <StatusBadge status={load.status || 'draft'} />
          </div>
        </div>

        {/* Row 2: Customer name */}
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
          ) : (
            <span>No route assigned</span>
          )}
        </div>

        {/* Row 4: Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
            <Calendar style={{ width: '10px', height: '10px' }} />
            <span>{pickupDate || 'No date'}</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
            <User style={{ width: '10px', height: '10px' }} />
            <span>{load.driver_1_name || 'Unassigned'}</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
            <Hash style={{ width: '10px', height: '10px' }} />
            <span>{load.trip_number ? `Trip ${load.trip_number}` : 'No trip'}</span>
          </div>
        </div>

        {/* Row 5: Amount | invoice status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
            ${(load.invoice_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <StatusBadge status={load.invoice_status || 'not_invoiced'} />
        </div>
      </div>

      {/* Footer strip */}
      <div
        style={{ borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--secondary))', padding: '0 12px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onPrint}
          style={{ height: '44px', width: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          title="Download PDF"
        >
          <Download style={{ width: '16px', height: '16px', color: 'hsl(var(--muted-foreground))' }} />
        </button>
        <button
          onClick={onDelete}
          style={{ height: '44px', width: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          title="Delete load"
        >
          <Trash2 style={{ width: '16px', height: '16px', color: 'hsl(var(--destructive))' }} />
        </button>
      </div>
    </div>
  );
}