import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Zap } from 'lucide-react';
import { format } from 'date-fns';

export default function StatementLoadDetails({ statementId, driverId }) {
  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['statement-loads', statementId, driverId],
    queryFn: async () => {
      // Get all loads for this driver within the statement period
      const stmt = await base44.entities.DriverStatement.filter({ id: statementId }, '', 1);
      if (!stmt.length) return [];
      
      const s = stmt[0];
      const allLoads = await base44.entities.Load.filter({
        driver_1_id: driverId
      }, '-pickup_date', 500);
      
      // Filter loads within statement period
      return allLoads.filter(load => {
        const pickupDate = load.pickup_date ? new Date(load.pickup_date) : null;
        const statementStart = new Date(s.period_start);
        const statementEnd = new Date(s.period_end);
        return pickupDate && pickupDate >= statementStart && pickupDate <= statementEnd;
      });
    },
    enabled: !!statementId && !!driverId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loads.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p className="text-xs">No loads found for this statement period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      {loads.map((load) => (
        <div key={load.id} className="border rounded-lg p-2 md:p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex flex-col gap-1.5">
            {/* Load number and dates */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="font-semibold text-primary">
                Load {load.internal_load_number || load.external_load_number || '—'}
              </span>
              {load.pickup_date && (
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  {format(new Date(load.pickup_date), 'MMM d, yyyy')}
                </span>
              )}
            </div>

            {/* Pickup & Delivery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex gap-1.5">
                <MapPin className="w-3 h-3 mt-0.5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Pickup</p>
                  <p className="text-xs font-medium truncate">
                    {load.pickup_city && load.pickup_state
                      ? `${load.pickup_city}, ${load.pickup_state}`
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <MapPin className="w-3 h-3 mt-0.5 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Delivery</p>
                  <p className="text-xs font-medium truncate">
                    {load.delivery_city && load.delivery_state
                      ? `${load.delivery_city}, ${load.delivery_state}`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Miles and equipment */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-border">
              {load.billable_miles && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Miles</p>
                  <p className="text-xs font-semibold">{load.billable_miles}</p>
                </div>
              )}
              {load.equipment_type && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Equipment</p>
                  <p className="text-xs font-semibold capitalize">{load.equipment_type.replace('_', ' ')}</p>
                </div>
              )}
              {load.freight_rate && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Rate</p>
                  <p className="text-xs font-semibold">${load.freight_rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>

            {/* Load type and customer */}
            {(load.load_type || load.customer_name) && (
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {load.load_type && (
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{load.load_type}</p>
                  </div>
                )}
                {load.customer_name && (
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-medium truncate">{load.customer_name}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}