import React, { useState } from 'react';
import { Check, Zap, Shield, Building2, Loader2, Truck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';

const PLANS = [
  {
    key: 'basic',
    name: 'Basic',
    price: 16,
    priceLabel: '$16/mo',
    icon: Zap,
    color: 'text-blue-500',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    description: 'Owner-operators / tiny fleets',
    features: [
      'Up to 3 drivers & 3 trucks',
      'Load tracking',
      'Invoicing',
      'Company & driver directory',
      'Document uploads',
    ],
  },
  {
    key: 'professional',
    name: 'Professional',
    price: 49,
    priceLabel: '$49/mo',
    icon: Shield,
    color: 'text-primary',
    border: 'border-primary/30',
    bg: 'bg-primary/5',
    description: 'Small trucking companies',
    popular: true,
    includedFrom: 'Basic',
    features: [
      'Up to 10 drivers & 10 trucks',
      'Driver pay statements',
      'Fuel card imports',
      'Duplicate load detection',
      'Audit log',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 99,
    priceLabel: '$99/mo',
    icon: Building2,
    color: 'text-amber-500',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    description: 'Growing companies',
    includedFrom: 'Professional',
    features: [
      'Unlimited drivers & trucks',
      'OCR document scanning',
      'Advanced reports',
      'Priority support',
      'Cloud backup & updates included',
    ],
  },
  {
    key: 'lifetime',
    name: 'Lifetime',
    price: 199,
    priceLabel: '$199 one-time',
    oneTime: true,
    icon: Shield,
    color: 'text-emerald-500',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    description: 'Pay once, use forever',
    includedFrom: 'Enterprise',
    features: [
      'All future features & updates',
      'Lifetime priority support',
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [step, setStep] = useState('plans'); // 'plans' | 'details' | 'checkout'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState({ company_name: '', admin_email: '' });

  const isLoggedIn = (() => {
    try { return !!JSON.parse(localStorage.getItem('truckops_session')); }
    catch { return false; }
  })();

  const getAccountInfo = () => {
    try {
      const session = JSON.parse(localStorage.getItem('truckops_session'));
      return {
        email: session?.admin_email || '',
        company: session?.company_name || ''
      };
    } catch {
      return { email: '', company: '' };
    }
  };

  const handleSelectPlan = (planKey) => {
    if (!isLoggedIn) {
      // Redirect to login/signup, then come back with plan pre-selected
      window.location.href = `/?signup=1&plan=${planKey}`;
      return;
    }
    setSelectedPlan(planKey);
    setStep('details');
    setError('');
  };

  // On mount, check if returning from login with a plan pre-selected
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan && isLoggedIn && PLANS.find(p => p.key === plan)) {
      setSelectedPlan(plan);
      if (isLoggedIn) {
        // Auto-checkout for logged-in users
        const accountInfo = getAccountInfo();
        setDetails({ company_name: accountInfo.company, admin_email: accountInfo.email });
        setStep('checkout');
      } else {
        setStep('details');
      }
    }
  }, []);

  const handleCheckout = async (e) => {
    e?.preventDefault?.();
    if (!details.company_name.trim() || !details.admin_email.trim()) {
      setError('Company name and email are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(details.admin_email.trim())) {
      setError('Please enter a valid email address.');
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
        plan: selectedPlan,
        company_name: details.company_name.trim(),
        admin_email: details.admin_email.trim().toLowerCase(),
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

  const selectedPlanData = PLANS.find(p => p.key === selectedPlan);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">

      {/* Header */}
      <div className="text-center py-12 px-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Truck className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold">TruckOps</span>
        </div>
        {step === 'plans' ? (
          <>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Simple, transparent pricing</h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Everything your trucking operation needs, in one platform. Start free for 3 days — cancel anytime before your trial ends.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold mb-2">Almost there!</h1>
            <p className="text-slate-400 text-base max-w-sm mx-auto">
              Enter your details to set up your <strong className="text-white">{selectedPlanData?.name}</strong> account.
            </p>
          </>
        )}
      </div>

      {step === 'plans' && (
        <>
          {/* Plans grid */}
          <div className="max-w-5xl mx-auto px-4 pb-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.key}
                  className="relative rounded-2xl border-2 border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8 p-6 cursor-pointer transition-all duration-200 flex flex-col"
                  onClick={() => handleSelectPlan(plan.key)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </div>
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${plan.bg} ${plan.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="mb-1 text-lg font-bold">{plan.name}</div>
                  <div className="text-slate-400 text-sm mb-4">{plan.description}</div>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold">${plan.price}</span>
                    <span className="text-slate-400 text-sm">{plan.oneTime ? ' one-time' : '/mo'}</span>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.includedFrom && (
                      <li className="flex items-center gap-2 text-sm font-semibold text-primary/90 bg-primary/10 rounded-lg px-2 py-1.5 mb-1">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        Everything in {plan.includedFrom}
                      </li>
                    )}
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="w-full text-center py-2 rounded-lg text-sm font-semibold border border-white/20 text-white hover:border-white/40 transition-colors">
                    {plan.oneTime ? 'Get Lifetime Access →' : 'Start Free Trial →'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTAs */}
          <div className="max-w-md mx-auto px-4 pb-6 space-y-3">
            {!isLoggedIn && (
              <Button
                onClick={() => navigate('/?signup=1')}
                className="w-full h-12 font-bold text-base bg-emerald-600 hover:bg-emerald-700"
              >
                Create Account (No Credit Card)
              </Button>
            )}
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="w-full h-10 font-medium text-sm text-slate-400 hover:text-slate-300"
            >
              Preview App → Dashboard
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center pb-8 space-y-2 text-slate-600 text-xs px-4">
            <p>© {new Date().getFullYear()} TruckOps. All rights reserved.</p>
            <p>
              <a href="/privacy" className="hover:text-slate-400 underline">Privacy Policy</a>
              {' · '}
              <a href="/terms" className="hover:text-slate-400 underline">Terms of Service</a>
            </p>
          </div>
        </>
      )}

      {step === 'details' && selectedPlanData && (
        <div className="max-w-md mx-auto px-4 pb-16">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            {/* Plan summary */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div>
                <div className="font-bold text-lg">{selectedPlanData.name} Plan</div>
                <div className="text-slate-400 text-sm">
                  {selectedPlanData.oneTime
                    ? `$${selectedPlanData.price} one-time payment`
                    : `3 days free, then $${selectedPlanData.price}/month`}
                </div>
              </div>
              <button onClick={() => setStep('plans')} className="text-slate-400 hover:text-white text-sm flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Change
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <Label className="text-sm text-slate-300">Company Name</Label>
                <Input
                  value={details.company_name}
                  onChange={e => setDetails(d => ({ ...d, company_name: e.target.value }))}
                  placeholder="Your trucking company name"
                  className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                  autoFocus
                  disabled={loading}
                />
              </div>
              <div>
                <Label className="text-sm text-slate-300">Email Address</Label>
                <Input
                  type="email"
                  value={details.admin_email}
                  onChange={e => setDetails(d => ({ ...d, admin_email: e.target.value }))}
                  placeholder="you@yourcompany.com"
                  className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500 mt-1">Your login credentials will be sent here after payment.</p>
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 font-bold text-sm" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {selectedPlanData.oneTime ? 'Pay Now →' : 'Start Free Trial →'}
              </Button>
              <p className="text-center text-xs text-slate-500">
                {selectedPlanData.oneTime
                  ? 'One-time payment. No recurring charges.'
                  : 'Card required. Cancel anytime before trial ends.'}
              </p>
            </form>
          </div>
        </div>
      )}

      {step === 'checkout' && selectedPlanData && (
        <div className="max-w-md mx-auto px-4 pb-16">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
              <p className="text-slate-400 text-sm">
                You're upgrading to <strong className="text-white">{selectedPlanData.name}</strong>
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Plan</span>
                <span className="font-semibold">{selectedPlanData.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Email</span>
                <span className="font-semibold">{details.admin_email}</span>
              </div>
              <div className="flex justify-between text-sm pt-3 border-t border-white/10">
                <span className="text-slate-400">Price</span>
                <span className="text-lg font-bold">
                  {selectedPlanData.oneTime ? `$${selectedPlanData.price}` : `$${selectedPlanData.price}/mo`}
                </span>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
                {error}
              </div>
            )}

            <Button
              onClick={() => handleCheckout()}
              className="w-full h-11 font-bold text-sm mb-3"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {selectedPlanData.oneTime ? 'Proceed to Payment →' : 'Proceed to Checkout →'}
            </Button>

            <button
              onClick={() => setStep('plans')}
              className="w-full h-10 text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}