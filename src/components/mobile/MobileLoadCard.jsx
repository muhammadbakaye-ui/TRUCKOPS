import React, { useState } from 'react';
import { MapPin, Calendar, User, Hash, Copy, Check, Download, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

const INVOICE_STATUS_STYLES = {
  not_invoiced: 'bg-muted text-muted-foreground border-border',
  invoiced: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  priority: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  sent: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  partial: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  paid: 'bg-green-500/10 text-green-600 border-green-500/30',
  overdue: 'bg-red-500/10 text-red-600 border-red-500/30',
  canceled: 'bg-muted text-muted-foreground border-border',
};
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const INVOICE_STATUS_LABELS = {
  not_invoiced: 'Not Invoiced',
  invoiced: 'Invoiced',
  priority: 'Priority',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  canceled: 'Canceled',
};

export default function MobileLoadCard({ load, copiedId, onCopy, onNavigate, onDelete, onPrint, qaEnabled, qaAction, onQuickAction }) {
  const queryClient = useQueryClient();
  const [savingStatus, setSavingStatus] = useState(false);
  const showFooter = !!(onDelete || onPrint);
  if (!load) return null;

  const handleInvoiceStatusChange = async (value) => {
    setSavingStatus(true);
    try {
      await base44.entities.Load.update(load.id, { invoice_status: value });

      if (value === 'not_invoiced') {
        const existing = await base44.entities.Invoice.filter({ load_id: load.id }, '-created_date', 5);
        for (const inv of existing) await base44.entities.Invoice.delete(inv.id);
      } else {
        const existing = await base44.entities.Invoice.filter({ load_id: load.id }, '-created_date', 1);
        if (existing.length === 0) {
          const allInvoices = load.tenant_id
            ? await base44.entities.Invoice.filter({ tenant_id: load.tenant_id }, '-created_date', 1)
            : await base44.entities.Invoice.list('-created_date', 1);
          const lastNum = allInvoices.length > 0 ? parseInt(allInvoices[0].invoice_number?.replace(/\D/g, '') || '999') : 999;
          const today = new Date().toISOString().split('T')[0];
          await base44.entities.Invoice.create({
            tenant_id: load.tenant_id,
            invoice_number: `INV-${lastNum + 1}`,
            load_id: load.id,
            load_number: load.internal_load_number,
            customer_id: load.customer_id,
            customer_name: load.customer_name,
            invoice_date: today,
            total: load.invoice_amount || 0,
            subtotal: load.invoice_amount || 0,
            status: value === 'paid' ? 'paid' : value === 'sent' ? 'sent' : value === 'priority' ? 'priority' : 'draft',
          });
        } else {
          const invStatus = value === 'paid' ? 'paid' : value === 'sent' ? 'sent' : value === 'priority' ? 'priority' : value === 'partial' ? 'partial' : value === 'overdue' ? 'overdue' : 'draft';
          await base44.entities.Invoice.update(existing[0].id, { status: invStatus });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err) {
      toast.error('Failed to update status: ' + err.message);
    } finally {
      setSavingStatus(false);
    }
  };

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

        {/* Row 5: Amount | quick action | invoice status dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
            ${(load.invoice_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {qaEnabled && (
              <button
                onClick={(e) => { e.stopPropagation(); onQuickAction && onQuickAction(load); }}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors whitespace-nowrap ${INVOICE_STATUS_STYLES[qaAction] || 'bg-primary/10 text-primary border-primary/20'}`}
                style={{ fontSize: '10px', height: '24px', display: 'inline-flex', alignItems: 'center' }}
              >
                {qaAction?.charAt(0).toUpperCase() + qaAction?.slice(1)}
              </button>
            )}
            <div onClick={e => e.stopPropagation()}>
              <Select value={load.invoice_status || 'not_invoiced'} onValueChange={handleInvoiceStatusChange} disabled={savingStatus}>
                <SelectTrigger className={`h-5 text-[10px] px-2 border rounded text-xs font-medium whitespace-nowrap ${INVOICE_STATUS_STYLES[load.invoice_status] || INVOICE_STATUS_STYLES.not_invoiced}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INVOICE_STATUS_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {(onDelete || onPrint) && (
      <div
        style={{ borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--secondary))', padding: '0 12px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {onPrint && (
        <button
          onClick={onPrint}
          style={{ height: '44px', width: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          title="Download PDF"
        >
          <Download style={{ width: '16px', height: '16px', color: 'hsl(var(--muted-foreground))' }} />
        </button>
        )}
        {onDelete && (
        <button
          onClick={onDelete}
          style={{ height: '44px', width: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          title="Delete load"
        >
          <Trash2 style={{ width: '16px', height: '16px', color: 'hsl(var(--destructive))' }} />
        </button>
        )}
      </div>
      )}
    </div>
  );
}