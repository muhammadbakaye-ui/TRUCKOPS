import { useState, useRef } from 'react';
import { Check } from 'lucide-react';
import { PLANS } from '@/lib/pricingPlans';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * PricingShowcase — PUBLIC LANDING PAGE ONLY.
 *
 * Rules:
 *  - Card divs have NO onClick handlers
 *  - Only the "Learn More" button is interactive; it calls e.stopPropagation()
 *  - "Learn More" smoothly scrolls to the comparison section below and pulses the target card
 *  - NO checkout, NO Stripe, NO redirects, NO Select Plan
 *  - Cards animate in with a stagger; hover scale; reduced-motion respected
 */
export default function PricingShowcase() {
  const [highlightedPlan, setHighlightedPlan] = useState(null);
  const comparisonRef = useRef(null);
  const prefersReduced = useReducedMotion();

  const handleLearnMore = (e, planKey) => {
    e.stopPropagation();
    setHighlightedPlan(planKey);
    setTimeout(() => {
      comparisonRef.current?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    }, 50);
    setTimeout(() => setHighlightedPlan(null), 3000);
  };

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
      {/* Header */}
      <div className="text-center mb-16">
        <h2 className="text-4xl font-extrabold mb-4 text-foreground">Simple, transparent pricing</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Everything your trucking operation needs, in one platform. Plans start at $39/month.
        </p>
      </div>

      {/* Plan cards grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          return (
            <motion.div
              key={plan.key}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={prefersReduced ? {} : { scale: 1.02, transition: { duration: 0.2 } }}
              className={`relative rounded-2xl border-2 p-6 flex flex-col cursor-default transition-shadow hover:shadow-md ${
                plan.popular
                  ? `${plan.border} ${plan.bg}`
                  : 'border-border bg-card hover:border-primary/30'
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

              <motion.button
                onClick={(e) => handleLearnMore(e, plan.key)}
                whileTap={prefersReduced ? {} : { scale: 0.97 }}
                className="w-full py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors"
              >
                Learn More
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* "Which plan is right for you?" comparison section */}
      <div ref={comparisonRef} className="border-t border-border pt-20">
        <motion.div
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">Which Plan Is Right for You?</h2>
          <p className="text-lg text-muted-foreground text-center mb-12">
            Here's how to pick the right plan for your operation
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLANS.map((plan, i) => {
              const isHighlighted = highlightedPlan === plan.key;
              return (
                <motion.div
                  key={plan.key}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  animate={isHighlighted ? (prefersReduced ? {} : { scale: [1, 1.03, 1], transition: { duration: 0.6 } }) : {}}
                  className={`relative bg-card border rounded-xl p-6 cursor-default transition-all duration-300 ${
                    isHighlighted
                      ? 'border-primary shadow-2xl shadow-primary/30 ring-2 ring-primary/40'
                      : 'border-border'
                  }`}
                >
                  <h3 className="text-lg font-semibold text-primary mb-3">{plan.name}</h3>
                  <p className="text-foreground/80 leading-relaxed">{plan.bestFor}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}