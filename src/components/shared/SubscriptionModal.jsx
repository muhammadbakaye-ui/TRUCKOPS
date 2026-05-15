import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PricingDashboard from '@/components/pricing/PricingDashboard';

/**
 * Modal shown when users first log in/sign up without an active subscription.
 * Shows PricingDashboard component inside a modal, or Preview Mode option.
 */
export default function SubscriptionModal({ isOpen, onDismiss }) {
  // Subscription wall temporarily disabled for live user testing
  return null;
  /* eslint-disable no-unreachable */
  const [showPricing, setShowPricing] = useState(false);

  const handleShowPricing = () => {
    setShowPricing(true);
  };

  const handlePreviewMode = () => {
    onDismiss();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onDismiss}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            {!showPricing ? (
              // Initial modal - choose subscribe or preview
              <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header with gradient accent */}
                <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-6 h-6 text-primary" />
                      <h2 className="text-2xl font-bold text-foreground">Welcome to TruckOps</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get started with a 3-day free trial — no credit card required to preview.
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-4">
                  <div className="space-y-3 text-sm text-foreground">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">
                        ✓
                      </div>
                      <span>Start your <strong>3-day free trial</strong> to try all features</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">
                        ✓
                      </div>
                      <span>Or preview the app with <strong>limited access</strong></span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">
                        ✓
                      </div>
                      <span>Cancel anytime before your trial ends — <strong>no charges</strong></span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 space-y-3">
                  <Button
                    onClick={handleShowPricing}
                    className="w-full h-11 font-semibold flex items-center justify-center gap-2 bg-primary hover:bg-primary/90"
                  >
                    <Crown className="w-4 h-4" />
                    Start 3-Day Free Trial
                  </Button>

                  <Button
                    onClick={handlePreviewMode}
                    variant="outline"
                    className="w-full h-10 font-medium flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Preview Mode (Limited Access)
                  </Button>
                </div>

                {/* Footer note */}
                <div className="px-6 pb-4 text-xs text-muted-foreground text-center">
                  <p>You can upgrade or switch plans anytime from your dashboard.</p>
                </div>
              </div>
            ) : (
              // Pricing modal - PricingDashboard component
              <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
                <button
                  onClick={() => setShowPricing(false)}
                  className="absolute top-4 right-4 z-10 p-1.5 hover:bg-secondary rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                </button>
                <PricingDashboard />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}