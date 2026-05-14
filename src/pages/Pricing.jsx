import React, { useState } from 'react';
import { Check, Zap, Shield, Building2, Loader2, Truck } from 'lucide-react';
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
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');

   const isLoggedIn = (() => {
     try { return !!JSON.parse(localStorage.getItem('truckops_session')); }
     catch { return false; }
   })();

   const handleCheckout = async () => {
     if (!selectedPlan) return;

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
         company_name: '',
         admin_email: '',
         success_url: `${window.location.origin}/signup-success?session_id={CHECKOUT_SESSION_ID}`,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">


      {/* Header */}
      <div className="text-center py-12 px-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Truck className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold">TruckOps</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Everything your trucking operation needs, in one platform. Start free for 3 days — cancel anytime before your trial ends.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-4 pb-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selectedPlan === plan.key;
          return (
            <div
              key={plan.key}
              onClick={() => setSelectedPlan(plan.key)}
              className={`relative rounded-2xl border-2 p-6 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-primary/10 scale-105 shadow-2xl shadow-primary/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
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
              <div className="mb-1 text-lg font-bold">{plan.name}</div>
              <div className="text-slate-400 text-sm mb-4">{plan.description}</div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">${plan.price}</span>
                <span className="text-slate-400 text-sm">{plan.oneTime ? ' one-time' : '/mo'}</span>
              </div>
              <ul className="space-y-2 mb-6">
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
              <div className={`w-full text-center py-2 rounded-lg text-sm font-semibold border transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-white/20 text-white hover:border-white/40'
              }`}>
                {isSelected ? 'Selected' : 'Select Plan'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkout button */}
       {selectedPlan && (
         <div className="max-w-md mx-auto px-4 pb-8">
           <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
             <h2 className="text-lg font-bold mb-1">
               {PLANS.find(p => p.key === selectedPlan)?.name} Plan
             </h2>
             <p className="text-slate-400 text-sm mb-5">
               {PLANS.find(p => p.key === selectedPlan)?.oneTime
                 ? `One-time payment of $${PLANS.find(p => p.key === selectedPlan)?.price}`
                 : `3 days free, then $${PLANS.find(p => p.key === selectedPlan)?.price}/month`}
             </p>
             {error && (
               <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
                 {error}
               </div>
             )}
             <Button
               onClick={handleCheckout}
               className="w-full h-11 font-bold text-sm"
               disabled={loading}
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : ''}
               {PLANS.find(p => p.key === selectedPlan)?.oneTime ? 'Pay Now →' : 'Start Free Trial →'}
             </Button>
             <p className="text-center text-xs text-slate-500 mt-3">
               {PLANS.find(p => p.key === selectedPlan)?.oneTime
                 ? 'One-time payment. No recurring charges.'
                 : 'Card required. Cancel anytime before trial ends.'}
             </p>
           </div>
         </div>
       )}

      {/* Create Account CTA — only show if not logged in */}
      {!isLoggedIn && (
        <div className="max-w-md mx-auto px-4 pb-6">
          <Button
            onClick={() => navigate('/?signup=1')}
            className="w-full h-12 font-bold text-base bg-emerald-600 hover:bg-emerald-700"
          >
            Create Account
          </Button>
        </div>
      )}

      {/* Preview App CTA - Always visible */}
      <div className="max-w-md mx-auto px-4 pb-12">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="w-full h-10 font-medium text-sm text-slate-400 hover:text-slate-300"
        >
          Preview App → Dashboard
        </Button>
      </div>

      {/* Footer */}
      <div className="text-center pb-12 text-slate-600 text-xs">
        © {new Date().getFullYear()} TruckOps. All rights reserved.
      </div>
    </div>
  );
}