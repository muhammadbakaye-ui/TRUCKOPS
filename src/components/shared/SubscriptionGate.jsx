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
  const { session } = useSession();
  if (!session) return false;
  const status = session.subscription_status;
  // Active statuses
  if (status === 'active' || status === 'trialing') return true;
  return false;
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
  const hasSubscription = useHasSubscription();
  const navigate = useNavigate();
  const { session } = useSession();

  if (!session || hasSubscription) return null;

  return (
    <div className="bg-amber-500 text-white text-xs font-semibold flex items-center justify-between px-4 py-2 z-50">
      <span className="flex items-center gap-2">
        <Crown className="w-3.5 h-3.5 shrink-0" />
        You're in <strong>Preview Mode</strong> — creating and editing data is disabled.
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-6 text-xs px-3 bg-white text-amber-600 hover:bg-white/90 shrink-0 ml-4"
        onClick={() => navigate('/pricing')}
      >
        Subscribe Now
      </Button>
    </div>
  );
}