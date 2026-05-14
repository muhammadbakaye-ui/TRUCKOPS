import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import LandingNav from '@/components/landing/LandingNav';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Basic',
    price: '$16',
    period: '/month',
    description: 'Perfect for small operations',
    features: [
      'Up to 5 trucks',
      'Up to 10 drivers',
      'Basic load tracking',
      'Monthly reporting',
      'Email support'
    ]
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/month',
    description: 'Ideal for growing fleets',
    features: [
      'Unlimited trucks & trailers',
      'Unlimited drivers',
      'Real-time GPS tracking',
      'Fuel import integration',
      'Driver pay statements',
      'Advanced reporting',
      'Priority support'
    ],
    highlighted: true
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    description: 'For large-scale operations',
    features: [
      'Everything in Professional',
      'Multi-location support',
      'Custom integrations',
      'API access',
      'White-label options',
      'Dedicated support'
    ]
  },
  {
    name: 'Lifetime',
    price: '$199',
    period: 'one-time',
    description: 'Own it forever',
    features: [
      'All features included',
      'Lifetime updates',
      'No recurring fees',
      'Priority support',
      'Custom training included'
    ]
  }
];

const useCases = [
  {
    plan: 'Basic',
    usecase: 'You\'re running a small trucking operation with a few trucks and want to start digitizing your workflow without heavy investment. Ideal for getting comfortable with fleet management software.'
  },
  {
    plan: 'Professional',
    usecase: 'You\'re managing a growing fleet and need comprehensive tools for driver management, invoicing, fuel tracking, and detailed reports. The sweet spot for most mid-sized operations.'
  },
  {
    plan: 'Enterprise',
    usecase: 'You operate a large, multi-location fleet with complex needs. Requires custom integrations, API access, and dedicated support to streamline operations at scale.'
  },
  {
    plan: 'Lifetime',
    usecase: 'You want to own your fleet management platform outright without recurring monthly fees. Perfect for operators who plan to use TruckOps long-term.'
  }
];

function PlanCard({ plan, index }) {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: false });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: (index % 2) * 0.1, duration: 0.6 }}
      className={`rounded-xl border p-8 transition-all ${
        plan.highlighted
          ? 'bg-sidebar-primary/10 border-sidebar-primary shadow-xl'
          : 'bg-sidebar-accent border-sidebar-border hover:border-sidebar-primary'
      }`}
    >
      {plan.highlighted && (
        <div className="text-sidebar-primary text-sm font-semibold mb-4">MOST POPULAR</div>
      )}
      <h3 className="text-2xl font-bold text-sidebar-primary-foreground mb-2">{plan.name}</h3>
      <p className="text-sidebar-foreground/70 text-sm mb-6">{plan.description}</p>
      <div className="mb-6">
        <span className="text-4xl font-bold text-sidebar-primary-foreground">{plan.price}</span>
        <span className="text-sidebar-foreground/60 ml-2">{plan.period}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-sidebar-foreground/80">
            <Check className="w-5 h-5 text-sidebar-primary flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function LandingPricingPage() {
  const navigate = useNavigate();
  const { ref: headerRef, inView: headerInView } = useInView({ threshold: 0.1, triggerOnce: false });
  const { ref: usecaseRef, inView: usecaseInView } = useInView({ threshold: 0.1, triggerOnce: false });

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
            <PlanCard key={index} plan={plan} index={index} />
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div className="py-20 px-4 border-t border-sidebar-border">
        <motion.div
          ref={usecaseRef}
          initial={{ opacity: 0 }}
          animate={usecaseInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-4xl font-bold text-sidebar-primary-foreground mb-4 text-center">
            Which Plan Is Right for You?
          </h2>
          <p className="text-lg text-sidebar-foreground/70 text-center mb-12">
            Here's how to pick the right plan for your operation
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={usecaseInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-sidebar-accent border border-sidebar-border rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-sidebar-primary mb-3">{item.plan}</h3>
                <p className="text-sidebar-foreground/80 leading-relaxed">{item.usecase}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}