import { motion } from 'framer-motion';
import { X, MapPin, User, Truck, Package, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statusColors = {
  pending: 'bg-yellow-500/10 text-yellow-600',
  dispatched: 'bg-blue-500/10 text-blue-600',
  in_transit: 'bg-purple-500/10 text-purple-600',
  at_pickup: 'bg-orange-500/10 text-orange-600',
  at_delivery: 'bg-cyan-500/10 text-cyan-600',
  delivered: 'bg-green-500/10 text-green-600',
  completed: 'bg-green-500/10 text-green-600',
};

export default function LoadDetailsSidebar({ load, onClose }) {
  if (!load) return null;

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 30 }}
      className="absolute right-0 top-0 bottom-0 w-96 bg-card border-l border-border shadow-xl overflow-y-auto z-40"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Load #{load.internal_load_number || load.id.slice(0, 8)}
            </h2>
            <Badge className={statusColors[load.dispatch_status] || statusColors.pending}>
              {load.dispatch_status?.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Load Info */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">CUSTOMER</h3>
            <p className="text-foreground font-medium">{load.customer_name || 'N/A'}</p>
            {load.contact_name && <p className="text-sm text-muted-foreground">{load.contact_name}</p>}
          </div>

          {/* Route */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">ROUTE</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">PICKUP</p>
                  <p className="text-foreground font-medium">
                    {load.pickup_city}, {load.pickup_state}
                  </p>
                  {load.pickup_date && (
                    <p className="text-xs text-muted-foreground mt-1">{load.pickup_date}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">DELIVERY</p>
                  <p className="text-foreground font-medium">
                    {load.delivery_city}, {load.delivery_state}
                  </p>
                  {load.delivery_date && (
                    <p className="text-xs text-muted-foreground mt-1">{load.delivery_date}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Driver & Truck */}
          <div className="grid grid-cols-2 gap-4">
            {load.driver_1_name && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">DRIVER</p>
                </div>
                <p className="text-foreground font-medium text-sm">{load.driver_1_name}</p>
              </div>
            )}
            {load.truck_number && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">TRUCK</p>
                </div>
                <p className="text-foreground font-medium text-sm">{load.truck_number}</p>
              </div>
            )}
          </div>

          {/* Load Details */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">LOAD DETAILS</h3>
            <div className="space-y-3">
              {load.commodity && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Commodity</span>
                  <span className="text-foreground font-medium">{load.commodity}</span>
                </div>
              )}
              {load.weight && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Weight</span>
                  <span className="text-foreground font-medium">{load.weight.toLocaleString()} lbs</span>
                </div>
              )}
              {load.billable_miles && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Miles</span>
                  <span className="text-foreground font-medium">{load.billable_miles} mi</span>
                </div>
              )}
              {load.load_type && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-foreground font-medium">{load.load_type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Revenue */}
          {load.freight_rate && (
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">FREIGHT RATE</p>
              <p className="text-2xl font-bold text-primary">${load.freight_rate.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}