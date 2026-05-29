import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const statusStyles = {
  draft: 'bg-gray-500/10 text-gray-600',
  saved: 'bg-blue-500/10 text-blue-600',
  completed: 'bg-green-500/10 text-green-600',
  canceled: 'bg-red-500/10 text-red-600',
};

const invoiceStatusStyles = {
  not_invoiced: 'bg-gray-500/10 text-gray-600',
  invoiced: 'bg-blue-500/10 text-blue-600',
  priority: 'bg-orange-500/10 text-orange-600',
  sent: 'bg-purple-500/10 text-purple-600',
  partial: 'bg-yellow-500/10 text-yellow-600',
  paid: 'bg-green-500/10 text-green-600',
  overdue: 'bg-red-500/10 text-red-600',
  canceled: 'bg-gray-500/10 text-gray-600',
};

export default function MobileLoadCard({ load, isPopped, onCardClick }) {
  const navigate = useNavigate();

  if (!load) return null;

  const statusLabel = load.dispatch_status || 'draft';

  const handleClick = (e) => {
    e.stopPropagation();
    if (onCardClick) {
      onCardClick();
    } else {
      navigate(createPageUrl('LoadDetail'), { state: { loadId: load.id } });
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'bg-card rounded-lg p-3 border border-border/30 active:opacity-80 transition-opacity cursor-pointer mobile-load-row',
        isPopped ? 'popped-up' : ''
      )}
    >
      {/* Header: Load # + Status */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-blue-600 font-mono font-semibold text-sm">
          {load.internal_load_number}
        </span>
        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusStyles[statusLabel] || statusStyles.draft)}>
          {statusLabel.replace('_', ' ')}
        </span>
      </div>

      {/* Customer Name */}
      <div className="text-sm font-medium text-foreground mb-1">
        {load.customer_name || 'No Customer'}
      </div>

      {/* Route */}
      <div className="text-xs text-muted-foreground mb-2">
        {load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}
      </div>

      {/* Bottom Row: Date + Amount */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">
          {load.pickup_date ? new Date(load.pickup_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date'}
        </span>
        <span className="text-foreground font-semibold">
          ${load.invoice_amount?.toFixed(2) || '$0.00'}
        </span>
      </div>
    </div>
  );
}