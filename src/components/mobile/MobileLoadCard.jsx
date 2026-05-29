import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';

export default function MobileLoadCard({ load, isPopped, onCardClick }) {
  const navigate = useNavigate();

  if (!load) return null;

  const statusLabel = load.status || 'draft';

  return (
    <div
      onClick={() => {
        onCardClick?.();
        navigate(createPageUrl('LoadDetail'), { state: { loadId: load.id } });
      }}
      className={cn(
        "mobile-load-row",
        isPopped && "popped-up"
      )}
      style={{ lineHeight: '1.3', boxSizing: 'border-box', width: '100%', maxWidth: '100%', overflow: 'hidden' }}
    >
      {/* Header: Load # + Status */}
      <div className="load-card-header" style={{ lineHeight: '1.3' }}>
        <span className="load-card-number" style={{ lineHeight: '1.3' }}>
          {load.internal_load_number}
        </span>
        <StatusBadge status={statusLabel} />
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
          ${load.invoice_amount?.toFixed(2) || '$0.00'}
        </span>
      </div>
    </div>
  );
}