import React, { useState } from 'react';
import { FileText, Truck, Copy, Check, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import StatusBadge from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const INVOICE_STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  priority: 'bg-orange-50 text-orange-700 border-orange-300',
  sent: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  partial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  canceled: 'bg-gray-100 text-gray-400 border-gray-200',
};

const INVOICE_STATUS_LABELS = {
  draft: 'Draft',
  priority: 'Priority',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  canceled: 'Canceled',
};

function fmtDate(dateStr) {
  if (!dateStr) return 'No date';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return 'No date';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MobileInvoiceCard({ invoice, selected, onToggleSelect, onNavigate, onDelete, loadsMap, copiedId, onCopy, qaEnabled, qaAction, onQuickAction }) {
  const queryClient = useQueryClient();
  const [savingStatus, setSavingStatus] = useState(false);

  const handleInvoiceStatusChange = async (value) => {
    setSavingStatus(true);
    try {
      await base44.entities.Invoice.update(invoice.id, { status: value });
      if (invoice.load_id) {
        const statusMap = { draft: 'invoiced', priority: 'priority', sent: 'sent', partial: 'partial', paid: 'paid', overdue: 'overdue', canceled: 'canceled' };
        await base44.entities.Load.update(invoice.load_id, { invoice_status: statusMap[value] || 'invoiced' });
        queryClient.invalidateQueries({ queryKey: ['loads'] });
      }
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err) {
      toast.error('Failed to update status: ' + err.message);
    } finally {
      setSavingStatus(false);
    }
  };

  if (!invoice) return null;

  const load = loadsMap?.[invoice.load_id];
  const brokerLoad = load?.external_load_number || null;
  const truncBroker = brokerLoad && brokerLoad.length > 12 ? brokerLoad.slice(0, 12) + '...' : brokerLoad;
  const deliveryDate = load?.delivery_date || null;

  return (
    <div
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', boxSizing: 'border-box', width: '100%', overflow: 'hidden', marginBottom: '8px' }}
      onClick={() => onNavigate(invoice.id)}
    >
      {/* Main content */}
      <div style={{ padding: '10px 12px' }}>

        {/* Row 1: checkbox + invoice number | status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
            <Checkbox
              checked={selected.has(invoice.id)}
              onCheckedChange={(checked) => onToggleSelect(invoice.id, checked)}
              onClick={e => e.stopPropagation()}
              style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px', flexShrink: 0 }}
            />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'hsl(var(--primary))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {invoice.invoice_number}
            </span>
          </div>
          <div style={{ flexShrink: 0, marginLeft: '8px' }} onClick={e => e.stopPropagation()}>
            <Select value={invoice.status || 'draft'} onValueChange={handleInvoiceStatusChange} disabled={savingStatus}>
              <SelectTrigger className={`h-5 text-[10px] px-2 border rounded text-xs font-medium whitespace-nowrap ${INVOICE_STATUS_STYLES[invoice.status] || INVOICE_STATUS_STYLES.draft}`}>
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

        {/* Row 2: customer name */}
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {invoice.customer_name || '—'}
        </div>

        {/* Row 3: load + broker load + copy */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginBottom: '7px' }}>
          {invoice.load_number && (
            <span>Load: <span style={{ fontFamily: 'monospace' }}>{invoice.load_number}</span></span>
          )}
          {invoice.load_number && brokerLoad && (
            <span style={{ opacity: 0.5 }}>·</span>
          )}
          {brokerLoad && (
            <>
              <span style={{ fontFamily: 'monospace' }}>{truncBroker}</span>
              <span
                onClick={(e) => { e.stopPropagation(); onCopy && onCopy(e, brokerLoad); }}
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '2px' }}
              >
                {copiedId === brokerLoad
                  ? <Check style={{ width: '10px', height: '10px', color: 'hsl(var(--chart-2))' }} />
                  : <Copy style={{ width: '10px', height: '10px', color: 'hsl(var(--muted-foreground))' }} />}
              </span>
            </>
          )}
          {!invoice.load_number && !brokerLoad && <span>—</span>}
        </div>

        {/* Row 4: date chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
            <FileText style={{ width: '10px', height: '10px' }} />
            <span>{fmtDate(invoice.invoice_date)}</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '11px', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
            <Truck style={{ width: '10px', height: '10px' }} />
            <span>{fmtDate(deliveryDate)}</span>
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <div
      style={{ borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--secondary))', padding: '0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      onClick={(e) => e.stopPropagation()}
      >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {qaEnabled && (
          <button
            onClick={(e) => { e.stopPropagation(); onQuickAction && onQuickAction(invoice); }}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors whitespace-nowrap ${INVOICE_STATUS_STYLES[qaAction] || 'bg-primary/10 text-primary border-primary/20'}`}
            style={{ fontSize: '10px', height: '24px', display: 'inline-flex', alignItems: 'center' }}
          >
            {Object.entries(INVOICE_STATUS_LABELS).find(([val]) => val === qaAction)?.[1] || qaAction}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(invoice); }}
          style={{ height: '44px', width: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          title="Delete invoice"
        >
          <Trash2 style={{ width: '16px', height: '16px', color: 'hsl(var(--destructive))' }} />
        </button>
      </div>
      </div>
    </div>
  );
}