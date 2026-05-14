import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, ArrowRight, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Modal shown when users first log in/sign up without an active subscription.
 * Offers two options: Subscribe (goes to pricing) or Preview Mode (continue to dashboard).
 */
export default function SubscriptionModal({ isOpen, onDismiss }) {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleSubscribe = () => {
    onDismiss();
    navigate('/pricing');
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
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              {/* Header with gradient accent */}
              <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-6 pt-6 pb-4 border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Welcome to TruckOps</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get started with a 3-day free trial — no credit card required to preview.
                </p>
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
                  onClick={handleSubscribe}
                  className="w-full h-11 font-semibold flex items-center justify-center gap-2 bg-primary hover:bg-primary/90"
                >
                  <Crown className="w-4 h-4" />
                  Start 3-Day Free Trial
                  <ArrowRight className="w-4 h-4" />
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}