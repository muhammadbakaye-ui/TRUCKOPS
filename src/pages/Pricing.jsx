import { Truck } from 'lucide-react';
import PricingDashboard from '@/components/pricing/PricingDashboard';

/**
 * Pricing page - LOGGED IN USERS ONLY (dashboard)
 * Uses PricingDashboard component with Select Plan -> Checkout flow
 */
export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="text-center py-12 px-4 border-b border-border">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Truck className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">TruckOps</span>
        </div>
      </div>

      {/* Pricing Component */}
      <PricingDashboard />

      {/* Footer */}
      <div className="text-center py-8 space-y-2 text-muted-foreground text-xs px-4 border-t border-border">
        <p>© {new Date().getFullYear()} TruckOps. All rights reserved.</p>
        <p>
          <a href="/privacy" className="hover:text-foreground underline">Privacy Policy</a>
          {' · '}
          <a href="/terms" className="hover:text-foreground underline">Terms of Service</a>
        </p>
      </div>
    </div>
  );
}