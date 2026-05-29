import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';

export default function MobileLoadCard({ load, isPopped, onCardClick }) {
  const navigate = useNavigate();

  if (!load) return null;

  const statusLabel = load.dispatch_status || 'draft';

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
    >
      {/* Header: Load # + Status */}
      <div className="load-card-header">
        <span className="load-card-number">
          {load.internal_load_number}
        </span>
        <StatusBadge status={statusLabel} />
      </div>

      {/* Customer Name */}
      <div className="load-card-customer">
        {load.customer_name || 'No Customer'}
      </div>

      {/* Route */}
      <div className="load-card-route">
        {load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}
      </div>

      {/* Bottom Row: Date + Amount */}
      <div className="load-card-dates">
        <span className="text-muted-foreground">
          {load.pickup_date ? new Date(load.pickup_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date'}
        </span>
        <span className="load-card-amount">
          ${load.invoice_amount?.toFixed(2) || '$0.00'}
        </span>
      </div>
    </div>
  );
}