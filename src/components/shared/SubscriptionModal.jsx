import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PricingDashboard from '@/components/pricing/PricingDashboard';

/**
 * Once-per-session modal shown to logged-in users with no active subscription.
 * Shows a quick pitch first; expands to full PricingDashboard on request.
 * isOpen and onDismiss are controlled by layout.jsx (AppShell).
 */
export default function SubscriptionModal({ isOpen, onDismiss }) {
  const [showPricing, setShowPricing] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sub-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onDismiss}
          />

          {/* Modal */}
          <motion.div
            key="sub-modal"
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
          >
            {!showPricing ? (
              <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden pointer-events-auto">
                <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-6 pt-6 pb-4 border-b border-border flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Unlock Full Access</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Subscribe to get everything your trucking operation needs.
                    </p>
                  </div>
                  <button
                    onClick={onDismiss}
                    className="p-1.5 hover:bg-secondary rounded-full transition-colors shrink-0 mt-0.5"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-2.5">
                  {[
                    'Load management and invoicing',
                    'Driver pay statements and fuel imports',
                    'Document uploads and OCR extraction',
                    'Driver portal with QR access',
                    'Unlimited drivers and trucks (on higher plans)',
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                      <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                        ✓
                      </div>
                      {f}
                    </div>
                  ))}
                </div>

                <div className="px-6 pb-6 space-y-3">
                  <Button
                    onClick={() => setShowPricing(true)}
                    className="w-full h-11 font-semibold gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    View Plans and Subscribe
                  </Button>
                  <Button
                    onClick={onDismiss}
                    variant="ghost"
                    className="w-full h-9 text-muted-foreground text-sm"
                  >
                    Continue in preview mode
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative pointer-events-auto">
                <button
                  onClick={() => setShowPricing(false)}
                  className="absolute top-4 right-4 z-10 p-1.5 hover:bg-secondary rounded-full transition-colors"
                  aria-label="Close pricing"
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