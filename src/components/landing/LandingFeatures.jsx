import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Zap, BarChart3, Users, FileText, Fuel, TrendingUp } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Real-Time Load Tracking',
    description: 'Track every load from dispatch to delivery with real-time updates and status notifications.'
  },
  {
    icon: Users,
    title: 'Driver Management',
    description: 'Manage driver profiles, pay rates, documents, and performance metrics all in one place.'
  },
  {
    icon: FileText,
    title: 'Automated Invoicing',
    description: 'Generate and send professional invoices automatically with customizable templates.'
  },
  {
    icon: Fuel,
    title: 'Fuel Import & Tracking',
    description: 'Import fuel card data automatically and reconcile expenses across your fleet.'
  },
  {
    icon: BarChart3,
    title: 'Driver Pay Statements',
    description: 'Auto-calculate driver earnings with deductions, fuel, and bonuses included.'
  },
  {
    icon: TrendingUp,
    title: 'Business Intelligence',
    description: 'Gain insights with comprehensive reports on revenue, expenses, and fleet performance.'
  }
];

function FeatureCard({ icon: Icon, title, description, index }) {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: false });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className="bg-sidebar-accent border border-sidebar-border rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
    >
      <div className="h-12 w-12 bg-sidebar-primary rounded-lg flex items-center justify-center mb-4 text-white">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-sidebar-primary-foreground mb-2">{title}</h3>
      <p className="text-sidebar-foreground/70 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function LandingFeatures() {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: false });

  return (
    <div className="py-20 px-4 bg-very-dark">
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="max-w-6xl mx-auto"
      >
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl lg:text-5xl font-bold text-sidebar-primary-foreground mb-4"
          >
            Powerful Features Built for Fleet Operators
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg text-sidebar-foreground/70"
          >
            Everything you need to run and scale your trucking operation
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}