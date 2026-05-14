import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import LoadMap from '@/components/tracking/LoadMap';
import LoadDetailsSidebar from '@/components/tracking/LoadDetailsSidebar';
import { Filter, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LoadTracking() {
  const [selectedLoadId, setSelectedLoadId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch all loads
  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: async () => {
      const allLoads = await base44.entities.Load.list();
      // Filter to show active/in-progress loads
      return allLoads.filter(
        (load) =>
          !load.canceled &&
          [
            'pending',
            'dispatched',
            'in_transit',
            'at_pickup',
            'at_delivery',
            'delivered',
          ].includes(load.dispatch_status)
      );
    },
    refetchInterval: 10000, // Refresh every 10 seconds for real-time feel
  });

  // Filter loads based on status
  const filteredLoads =
    statusFilter === 'all'
      ? loads
      : loads.filter((load) => load.dispatch_status === statusFilter);

  // Get selected load
  const selectedLoad = loads.find((l) => l.id === selectedLoadId);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin">
          <div className="h-12 w-12 border-4 border-muted border-t-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-border bg-card p-4 z-30"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Load Tracking</h1>
              <p className="text-sm text-muted-foreground">
                {filteredLoads.length} active load{filteredLoads.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Loads</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="at_pickup">At Pickup</SelectItem>
                <SelectItem value="at_delivery">At Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Map & Sidebar */}
      <div className="flex-1 relative overflow-hidden">
        <LoadMap
          loads={filteredLoads}
          selectedLoadId={selectedLoadId}
          onLoadSelect={setSelectedLoadId}
        />

        {/* Load List Panel - Mobile */}
        <motion.div
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          className="absolute bottom-0 left-0 right-0 md:hidden bg-card border-t border-border max-h-1/2 overflow-y-auto z-30"
        >
          <div className="p-4 space-y-2">
            {filteredLoads.map((load) => (
              <motion.button
                key={load.id}
                onClick={() => setSelectedLoadId(load.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedLoadId === load.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-semibold text-foreground text-sm">
                  {load.truck_number || `Load ${load.internal_load_number}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {load.pickup_city} → {load.delivery_city}
                </p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Sidebar - Desktop */}
        <AnimatePresence>
          {selectedLoad && (
            <LoadDetailsSidebar
              load={selectedLoad}
              onClose={() => setSelectedLoadId(null)}
            />
          )}
        </AnimatePresence>

        {/* Empty State */}
        {filteredLoads.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="text-center">
              <Map className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-foreground font-medium">No active loads</p>
              <p className="text-muted-foreground text-sm">
                Loads will appear here once they're dispatched
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}