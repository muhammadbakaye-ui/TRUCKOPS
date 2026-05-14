import { useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { PLANS } from '@/lib/pricingPlans';

export default function PricingDashboard() {
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
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
      setLoading(false);
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
            <div
              key={plan.key}
              className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
                plan.popular
                  ? `${plan.border} ${plan.bg}`
                  : 'border-border bg-card'
              } ${isExpanded ? 'ring-2 ring-primary' : ''}`}
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

              <ul className={`space-y-2 flex-1 mb-6 ${isExpanded ? '' : 'max-h-64 overflow-hidden'}`}>
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

              <Button
                onClick={() => setExpandedPlan(isExpanded ? null : plan.key)}
                variant="outline"
                className="w-full mb-2"
              >
                <span className="flex-1">Select Plan</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="text-sm font-semibold text-foreground mb-2">Confirm & checkout</div>

                  {error && (
                    <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded px-2 py-1.5">
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={() => handleCheckout(plan)}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      `${plan.oneTime ? 'Pay Now' : 'Start Free Trial'} →`
                    )}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}