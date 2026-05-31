import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

export default function MobileLoadCard({ load, isPopped, onCardClick }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!load) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(load.external_load_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={() => {
        onCardClick?.();
        navigate(createPageUrl(`LoadDetail?id=${load.id}`));
      }}
      className={cn("mobile-load-row", isPopped && "popped-up")}
      style={{ lineHeight: '1.3', boxSizing: 'border-box', width: '100%', maxWidth: '100%', overflow: 'hidden' }}
    >
      {/* Header: Load # + Broker # + Status */}
      <div className="load-card-header" style={{ lineHeight: '1.3' }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="load-card-number" style={{ lineHeight: '1.3' }}>
            {load.internal_load_number}
          </span>
          {load.external_load_number && (
            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px]">
                /{load.external_load_number}
              </span>
              <button
                onClick={handleCopy}
                style={{ minHeight: 'auto', height: 'auto', padding: '2px', paddingLeft: '2px', paddingRight: '2px' }}
                className="rounded text-muted-foreground"
              >
                {copied
                  ? <Check className="w-2.5 h-2.5 text-green-600" />
                  : <Copy className="w-2.5 h-2.5" />}
              </button>
            </div>
          )}
        </div>
        <StatusBadge status={load.status || 'draft'} />
      </div>

      {/* Customer Name */}
      <div className="load-card-customer" style={{ lineHeight: '1.3', marginBottom: '0' }}>
        {load.customer_name || 'No Customer'}
      </div>

      {/* Route */}
      <div className="load-card-route" style={{ lineHeight: '1.3', marginBottom: '0' }}>
        {load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}
      </div>

      {/* Bottom Row: Date + Amount */}
      <div className="load-card-dates" style={{ justifyContent: 'space-between', lineHeight: '1.3' }}>
        <span className="text-muted-foreground" style={{ lineHeight: '1.3' }}>
          {load.pickup_date ? new Date(load.pickup_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date'}
        </span>
        <span className="load-card-amount" style={{ lineHeight: '1.3' }}>
          ${load.invoice_amount?.toFixed(2) || '0.00'}
        </span>
      </div>
    </div>
  );
}