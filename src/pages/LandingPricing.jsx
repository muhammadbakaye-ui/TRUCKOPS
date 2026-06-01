import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState, useRef } from 'react';
import LandingNav from '@/components/landing/LandingNav';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

const plans = [
  {
    key: 'basic',
    name: 'Basic',
    price: '$39',
    period: '/month',
    description: 'Owner operators / tiny fleets',
    features: [
      'Up to 3 drivers & 3 trucks',
      'Max 8 document uploads at a time',
      'Load management',
      'Invoicing',
      'Company & driver directory',
      'Document uploads',
      'Driver portal',
    ],
  },
  {
    key: 'professional',
    name: 'Professional',
    price: '$79',
    period: '/month',
    description: 'Small trucking companies',
    highlighted: true,
    includedFrom: 'Basic',
    features: [
      'Up to 10 drivers & 10 trucks',
      'Max 16 document uploads at a time',
      'Supports all current & future features',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '$149',
    period: '/month',
    description: 'Growing companies',
    includedFrom: 'Professional',
    features: [
      'Unlimited drivers & trucks',
      'Max 30 document uploads at a time',
    ],
  },
  {
    key: 'lifetime',
    name: 'Lifetime',
    price: '$499',
    period: 'one-time',
    description: 'Pay once, use forever',
    oneTime: true,
    includedFrom: 'Enterprise',
    features: [
      'Max 60 document uploads at a time',
      'All future features & updates forever',
      'Lifetime priority support',
    ],
  },
];

const useCases = [
  {
    key: 'basic',
    plan: 'Basic',
    usecase: "You're an owner-operator or running a tiny fleet of 1–3 trucks and want to digitize your loads, invoicing, and driver management without overpaying. Great for getting started.",
  },
  {
    key: 'professional',
    plan: 'Professional',
    usecase: "You're managing a small trucking company with up to 10 drivers and trucks. You need comprehensive tools for dispatch, invoicing, fuel tracking, and payroll — plus access to every feature we release.",
  },
  {
    key: 'enterprise',
    plan: 'Enterprise',
    usecase: "You run a growing operation with more than 10 trucks and need unlimited scale, higher document throughput, and all the power of the Professional plan without any driver or truck caps.",
  },
  {
    key: 'lifetime',
    plan: 'Lifetime',
    usecase: "You want to own your fleet management platform outright — no monthly fees, ever. Pay once and get every current and future feature forever, with lifetime priority support.",
  },
];

function PlanCard({ plan, index, onLearnMore }) {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: false });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: (index % 2) * 0.1, duration: 0.6 }}
      className={`rounded-xl border p-8 flex flex-col transition-all ${
        plan.highlighted
          ? 'bg-sidebar-primary/10 border-sidebar-primary shadow-xl relative'
          : 'bg-sidebar-accent border-sidebar-border'
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sidebar-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          MOST POPULAR
        </div>
      )}
      <h3 className="text-2xl font-bold text-sidebar-primary-foreground mb-2">{plan.name}</h3>
      <p className="text-sidebar-foreground/70 text-sm mb-6">{plan.description}</p>
      <div className="mb-1">
        <span className="text-4xl font-bold text-sidebar-primary-foreground">{plan.price}</span>
        <span className="text-sidebar-foreground/60 ml-2">{plan.period}</span>
      </div>
      {!plan.oneTime && (
        <p className="text-green-400 text-xs font-medium mb-6">3-day free trial included</p>
      )}
      {plan.oneTime && <div className="mb-6" />}
      {plan.includedFrom && (
        <div className="flex items-center gap-2 text-sm font-semibold text-sidebar-primary bg-sidebar-primary/10 rounded-lg px-3 py-2 mb-3">
          <Check className="w-4 h-4 shrink-0" />
          Everything in {plan.includedFrom}
        </div>
      )}
      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-sidebar-foreground/80">
            <Check className="w-5 h-5 text-sidebar-primary flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onLearnMore(plan.key)}
        className="w-full py-2 px-4 rounded-lg bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-semibold transition-colors"
      >
        Learn More
      </button>
    </motion.div>
  );
}

export default function LandingPricingPage() {
  const navigate = useNavigate();
  const { ref: headerRef, inView: headerInView } = useInView({ threshold: 0.1, triggerOnce: false });
  const comparisonRef = useRef(null);
  const [highlightedPlan, setHighlightedPlan] = useState(null);

  const handleLearnMore = (planKey) => {
    setHighlightedPlan(planKey);
    setTimeout(() => {
      comparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    setTimeout(() => setHighlightedPlan(null), 3000);
  };

  return (
    <div className="min-h-screen bg-very-dark">
      <LandingNav onContinue={() => navigate('/Dashboard')} />

      {/* Header */}
      <div className="pt-32 pb-16 px-4 border-b border-sidebar-border">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl lg:text-6xl font-bold text-sidebar-primary-foreground mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-sidebar-foreground/70">
            Choose the plan that fits your fleet size and needs
          </p>
        </motion.div>
      </div>

      {/* Pricing Grid */}
      <div className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <PlanCard key={plan.key} plan={plan} index={index} onLearnMore={handleLearnMore} />
          ))}
        </div>
      </div>

      {/* "Which plan is right for you?" comparison section */}
      <div ref={comparisonRef} className="py-20 px-4 border-t border-sidebar-border scroll-mt-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-sidebar-primary-foreground mb-4 text-center">
            Which Plan Is Right for You?
          </h2>
          <p className="text-lg text-sidebar-foreground/70 text-center mb-12">
            Here's how to pick the right plan for your operation
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((item, i) => {
              const isHighlighted = highlightedPlan === item.key;
              return (
                <motion.div
                  key={item.key}
                  animate={
                    isHighlighted
                      ? { scale: [1, 1.03, 1], transition: { duration: 0.6 } }
                      : {}
                  }
                  className={`border rounded-xl p-6 transition-all duration-300 ${
                    isHighlighted
                      ? 'border-sidebar-primary shadow-2xl shadow-sidebar-primary/30 ring-2 ring-sidebar-primary/40 bg-sidebar-primary/10'
                      : 'bg-sidebar-accent border-sidebar-border'
                  }`}
                >
                  <h3 className="text-lg font-semibold text-sidebar-primary mb-3">{item.plan}</h3>
                  <p className="text-sidebar-foreground/80 leading-relaxed">{item.usecase}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}