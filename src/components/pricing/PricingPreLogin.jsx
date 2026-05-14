import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PLANS } from '@/lib/pricingPlans';

export default function PricingPreLogin() {
  const navigate = useNavigate();

  const handleSelectPlan = (planKey) => {
    // Store the selected plan in localStorage
    localStorage.setItem('selected_plan', planKey);
    // Redirect to signup/login with a message
    navigate('/?signup=1&plan=' + planKey);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-extrabold mb-4 text-foreground">Choose your plan</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create an account to get started with your chosen plan. Start free for 3 days.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border-2 p-6 flex flex-col ${
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

              <Button
                onClick={() => handleSelectPlan(plan.key)}
                className="w-full h-10 font-semibold"
              >
                Get Started →
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}