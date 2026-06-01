import { useQuery } from '@tanstack/react-query';
import { useSession } from './AppSession';
import { useNavigate } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { PLAN_LIMITS } from '@/lib/pricingPlans';

/**
 * Accounts that permanently have Lifetime access — bypass Stripe for internal testing.
 * Remove or empty this array once real subscriptions are in place for these accounts.
 */
const WHITELISTED_EMAILS = [
  'muhammadbakaye@gmail.com',
  'unitedtruckingllc@gmail.com',
];

/**
 * Core hook — returns the current tenant's subscription from the database.
 * Whitelisted emails always receive a synthetic Lifetime subscription.
 * Returns isLoading=true while the query is in-flight (avoids false "no subscription" flash).
 */
export function useSubscription() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const email = session?.admin_email?.toLowerCase()?.trim();
  const isWhitelisted = WHITELISTED_EMAILS.includes(email);

  const { data: subList, isLoading } = useQuery({
    queryKey: ['subscription', tenantId],
    queryFn: () => base44.entities.Subscription.filter({ tenant_id: tenantId }),
    enabled: !!tenantId && !isWhitelisted,
    staleTime: 5 * 60 * 1000, // treat subscription data as fresh for 5 minutes
  });

  // Whitelisted test accounts — always Lifetime
  if (isWhitelisted) {
    return {
      plan: 'lifetime',
      status: 'active',
      isActive: true,
      isLoading: false,
      limits: PLAN_LIMITS.lifetime,
      sub: null,
    };
  }

  // While fetching, don't block the UI — report as "still loading"
  if (isLoading && !!tenantId) {
    return { plan: null, status: null, isActive: false, isLoading: true, limits: PLAN_LIMITS.preview, sub: null };
  }

  const sub = subList?.[0] || null;
  const plan = sub?.plan || null;
  const status = sub?.status || null;
  const isActive = !!sub && ['active', 'trialing'].includes(status);

  return {
    plan,
    status,
    isActive,
    isLoading: false,
    limits: isActive ? (PLAN_LIMITS[plan] || PLAN_LIMITS.preview) : PLAN_LIMITS.preview,
    sub,
  };
}

/**
 * Returns true when the current user has an active (or trialing) subscription.
 * Always returns true for drivers (they are never gated) and while subscription is loading.
 */
export function useHasSubscription() {
  const { session } = useSession();
  // Always call the hook unconditionally (Rules of Hooks)
  const { isActive, isLoading } = useSubscription();
  // Drivers are never gated
  if (!session || session.role === 'driver') return true;
  // Don't block while loading — prevents spurious flash
  if (isLoading) return true;
  return isActive;
}

/**
 * Returns the plan limit object for the current subscription.
 * Falls back to preview (basic) limits when no subscription is active.
 */
export function usePlanLimits() {
  const { limits } = useSubscription();
  return limits || PLAN_LIMITS.preview;
}

/**
 * Wraps any write-action element and blocks it in preview mode,
 * showing an upgrade prompt on hover instead.
 */
export function SubscriptionRequired({ children, message }) {
  const hasSubscription = useHasSubscription();
  const navigate = useNavigate();

  if (hasSubscription) return children;

  return (
    <div
      className="relative group cursor-not-allowed"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div className="pointer-events-none opacity-40 select-none">{children}</div>
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
 * Slim banner at the top of the app when the user is in preview mode (no active subscription).
 * Returns null for active subscribers and drivers.
 */
export function PreviewModeBanner() {
  const hasSubscription = useHasSubscription();
  const navigate = useNavigate();
  if (hasSubscription) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <Crown className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium truncate">
          Preview mode — subscribe to unlock full access
        </span>
      </div>
      <button
        onClick={() => navigate('/pricing')}
        className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 whitespace-nowrap underline shrink-0"
      >
        View Plans
      </button>
    </div>
  );
}