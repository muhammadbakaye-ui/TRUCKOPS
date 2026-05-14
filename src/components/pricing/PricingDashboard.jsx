import { useState } from 'react';
import { Check, Loader2, ChevronDown } from 'lucide-react';
import { PLANS } from '@/lib/pricingPlans';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function PricingDashboard() {
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const getAccountInfo = () => {
    try {
      const session = JSON.parse(localStorage.getItem('truckops_session'));
      return {
        email: session?.admin_email || '',
        company: session?.company_name || '',
      };
    } catch {
      return { email: '', company: '' };
    }
  };

  const handleSelectPlan = (plan) => {
    if (expandedPlan === plan.key) {
      setExpandedPlan(null);
    } else {
      setExpandedPlan(plan.key);
      setError('');
    }
  };

  const handleCheckout = async (plan) => {
    const accountInfo = getAccountInfo();
    if (!accountInfo.email || !accountInfo.company) {
      setError('Unable to retrieve account information.');
      return;
    }

    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      alert('Checkout must be completed from the published app. Please open the app directly to subscribe.');
      return;
    }

    setLoading(plan.key);
    setError('');
    try {
      const res = await base44.functions.invoke('stripeCheckout', {
        action: 'create_checkout',
        plan: plan.key,
        company_name: accountInfo.company,
        admin_email: accountInfo.email,
        success_url: `${window.location.origin}/SubscriptionSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/pricing`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-extrabold mb-4 text-foreground">Upgrade Your Plan</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Select a plan to upgrade your account and unlock more features.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isExpanded = expandedPlan === plan.key;

          return (
            <motion.div
              key={plan.key}
              layout
              className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
                plan.popular
                  ? `${plan.border} ${plan.bg}`
                  : 'border-border bg-card'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
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

              <button
                onClick={() => handleSelectPlan(plan)}
                className="w-full py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors flex items-center justify-between"
              >
                Select Plan
                <ChevronDown 
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                />
              </button>

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
                    <button
                      onClick={() => handleCheckout(plan)}
                      disabled={loading === plan.key}
                      className="w-full py-2 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      {loading === plan.key ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Checkout'
                      )}
                    </button>
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