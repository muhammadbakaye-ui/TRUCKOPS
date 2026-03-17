import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  saved: 'bg-green-500/10 text-green-600 border-green-500/30',
  completed: 'bg-green-500/10 text-green-600 border-green-500/30',
  paid: 'bg-green-500/10 text-green-600 border-green-500/30',
  finalized: 'bg-green-500/10 text-green-600 border-green-500/30',
  matched: 'bg-green-500/10 text-green-600 border-green-500/30',
  delivered: 'bg-green-500/10 text-green-600 border-green-500/30',
  
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  draft: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  in_transit: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  dispatched: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  at_pickup: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  at_delivery: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  processing: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  
  sent: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  invoiced: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  partial: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  overdue: 'bg-red-500/10 text-red-600 border-red-500/30',
  canceled: 'bg-red-500/10 text-red-600 border-red-500/30',
  failed: 'bg-red-500/10 text-red-600 border-red-500/30',
  exception: 'bg-red-500/10 text-red-600 border-red-500/30',
  duplicate: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  
  inactive: 'bg-muted text-muted-foreground border-border',
  terminated: 'bg-muted text-muted-foreground border-border',
  not_invoiced: 'bg-muted text-muted-foreground border-border',
  none: 'bg-muted text-muted-foreground border-border',
  in_shop: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  out_of_service: 'bg-red-500/10 text-red-600 border-red-500/30',
  sold: 'bg-muted text-muted-foreground border-border',
  void: 'bg-muted text-muted-foreground border-border',
};

export default function StatusBadge({ status, className }) {
  if (!status) return null;
  const style = statusStyles[status] || 'bg-muted text-muted-foreground border-border';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium border px-2 py-0', style, className)}>
      {label}
    </Badge>
  );
}