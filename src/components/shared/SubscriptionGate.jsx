import React from 'react';
import { useSession } from './AppSession';
import { useNavigate } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Returns true if the current session has an active subscription.
 * No subscription (null tenant_id or no subscription_status) = preview mode.
 */
export function useHasSubscription() {
  // Subscription wall temporarily disabled for live user testing
  return true;
}

/**
 * Wrap any write-action button/area with this to block it in preview mode.
 * Shows a tooltip/modal nudge instead.
 */
export function SubscriptionRequired({ children, message }) {
  const hasSubscription = useHasSubscription();
  const navigate = useNavigate();

  if (hasSubscription) return children;

  return (
    <div
      className="relative group cursor-not-allowed"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="pointer-events-none opacity-40 select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap pointer-events-auto"
          onClick={() => navigate('/pricing')}
        >
          <Crown className="w-3 h-3" />
          {message || 'Subscribe to unlock'}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

/**
 * Banner shown at the top of the app when in preview mode.
 */
export function PreviewModeBanner() {
  // Subscription wall temporarily disabled for live user testing
  return null;
}