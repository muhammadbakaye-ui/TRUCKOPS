import { useState } from 'react';
import { Check, Loader2, ChevronDown } from 'lucide-react';
import { PLANS } from '@/lib/pricingPlans';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * PricingDashboard — LOGGED-IN USERS ONLY (dedicated pricing page + subscribe popup).
 *
 * Rules:
 *  - Card divs have NO onClick handlers — only button elements do
 *  - Every button handler calls e.stopPropagation() first
 *  - "Select Plan" expands inline checkout; only one card expanded at a time
 *  - "Checkout" goes DIRECTLY to the Stripe checkout URL
 *  - Cards animate in with a stagger on load; hover scales; button press scales
 *  - Animations skip/minimize when prefers-reduced-motion is set
 */
export default function PricingDashboard() {
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');
  const prefersReduced = useReducedMotion();

  const getAccountInfo = () => {
    try {
      const session = JSON.parse(localStorage.getItem('truckops_session') || '{}');
      return {
        email: session?.admin_email || '',
        company: session?.company_name || '',
      };
    } catch {
      return { email: '', company: '' };
    }
  };

  const handleSelectPlan = (e, planKey) => {
    e.stopPropagation();
    setExpandedPlan(prev => (prev === planKey ? null : planKey));
    setError('');
  };

  const handleCheckout = async (e, plan) => {
    e.stopPropagation();

    try {
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        alert('Checkout must be completed from the published app. Please open the app directly to subscribe.');
        return;
      }
    } catch {
      // Cross-origin iframe detection failed — proceed anyway
    }

    setLoadingPlan(plan.key);
    setError('');

    try {
      const { email, company } = getAccountInfo();
      if (!email || !company) {
        setError('Unable to retrieve account information. Please refresh and try again.');
        setLoadingPlan(null);
        return;
      }

      const res = await base44.functions.invoke('stripeCheckout', {
        action: 'create_checkout',
        plan: plan.key,
        company_name: company,
        admin_email: email,
        success_url: `${window.location.origin}/SubscriptionSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/pricing`,
      });

      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  // Card entrance animation variants
  const cardVariants = {
    hidden: prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: prefersReduced ? 0 : i * 0.1, ease: 'easeOut' },
    }),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-extrabold mb-4 text-foreground">Upgrade Your Plan</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Select a plan to unlock more features for your trucking operation.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          const isExpanded = expandedPlan === plan.key;

          return (
            <motion.div
              key={plan.key}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              layout
              whileHover={prefersReduced ? {} : { scale: 1.02, transition: { duration: 0.2 } }}
              className={`relative rounded-2xl border-2 p-6 flex flex-col cursor-default transition-shadow ${
                plan.popular
                  ? `${plan.border} ${plan.bg} shadow-md`
                  : 'border-border bg-card hover:shadow-md hover:border-primary/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow">
                  MOST POPULAR
                </div>
              )}

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${plan.bg} ${plan.color}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="mb-1 text-lg font-bold text-foreground">{plan.name}</div>
              <div className="text-muted-foreground text-sm mb-4">{plan.description}</div>

              <div className="mb-6">
                <span className="text-3xl font-extrabold text-foreground">${plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.oneTime ? ' one-time' : '/mo'}</span>
                {!plan.oneTime && (
                  <p className="text-green-500 text-xs font-medium mt-1">3-day free trial included</p>
                )}
              </div>

              <div className="mb-6 pb-6 border-b border-border">
                <p className="text-xs text-muted-foreground font-medium">Best for you if...</p>
                <p className="text-sm text-foreground mt-1">{plan.bestFor}</p>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.includedFrom && (
                  <li className="flex items-center gap-2 text-sm font-semibold text-primary bg-primary/10 rounded-lg px-2 py-1.5 mb-2">
                    <Check className="w-4 h-4 shrink-0" />
                    Everything in {plan.includedFrom}
                  </li>
                )}
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Select Plan button */}
              <motion.button
                onClick={(e) => handleSelectPlan(e, plan.key)}
                whileTap={prefersReduced ? {} : { scale: 0.97 }}
                className="w-full py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors flex items-center justify-between"
              >
                Select Plan
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </motion.button>

              {/* Inline checkout expansion */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden border-t border-border pt-4"
                  >
                    {error && (
                      <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-3">
                        {error}
                      </div>
                    )}
                    <motion.button
                      onClick={(e) => handleCheckout(e, plan)}
                      disabled={!!loadingPlan}
                      whileTap={prefersReduced ? {} : { scale: 0.97 }}
                      className="w-full py-2 px-4 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      {loadingPlan === plan.key ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing…
                        </>
                      ) : (
                        `Checkout — $${plan.price}${plan.oneTime ? ' one-time' : '/mo'}`
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}