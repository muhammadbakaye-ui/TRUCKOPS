import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import LandingNav from '@/components/landing/LandingNav';
import { useNavigate } from 'react-router-dom';
import { Package, BarChart3, Users, FileText, Fuel, TrendingUp, Clock, Shield, Smartphone } from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Advanced Load Management',
    description: 'Create, assign, and track loads with multiple stops, customer details, and billing information. Organize loads by status, route, and driver assignment.'
  },
  {
    icon: Users,
    title: 'Complete Driver Management',
    description: 'Manage driver profiles, licenses, medical certificates, pay rates, and performance metrics. Track driver history and compliance documents all in one secure place.'
  },
  {
    icon: FileText,
    title: 'Automated Invoicing',
    description: 'Generate professional invoices automatically with customizable templates. Set payment terms, track payment status, and send reminders directly from the platform.'
  },
  {
    icon: Fuel,
    title: 'Fuel Import & Reconciliation',
    description: 'Import fuel card data directly and auto-match to drivers and trucks. Reconcile fuel expenses and identify anomalies quickly.'
  },
  {
    icon: BarChart3,
    title: 'Driver Pay Statements',
    description: 'Auto-calculate driver earnings with line haul, fuel surcharges, deductions, and advances. Generate beautiful statements and make them available in driver portal.'
  },
  {
    icon: TrendingUp,
    title: 'Business Intelligence',
    description: 'Comprehensive dashboards and reports on revenue, expenses, utilization, and profitability. Export data for further analysis.'
  },
  {
    icon: Clock,
    title: 'Audit Trail & History',
    description: 'Every action is logged with timestamps and user information. Full audit history for compliance and dispute resolution.'
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Enterprise-grade encryption, role-based access control, and secure API tokens. Your data is always protected.'
  },
  {
    icon: Smartphone,
    title: 'Mobile Ready',
    description: 'Access TruckOps on any device. Responsive design works perfectly on phones, tablets, and desktops.'
  }
];

function FeatureDetailCard({ icon: Icon, title, description, index }) {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: false });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: (index % 3) * 0.1, duration: 0.6 }}
      className="bg-sidebar-accent border border-sidebar-border rounded-xl p-8 hover:border-sidebar-primary transition-all"
    >
      <div className="h-14 w-14 bg-sidebar-primary rounded-lg flex items-center justify-center mb-6 text-white">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-semibold text-sidebar-primary-foreground mb-3">{title}</h3>
      <p className="text-sidebar-foreground/70 leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function LandingFeaturesPage() {
  const navigate = useNavigate();
  const { ref: headerRef, inView: headerInView } = useInView({ threshold: 0.1, triggerOnce: false });

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
            Powerful Features for Fleet Operators
          </h1>
          <p className="text-xl text-sidebar-foreground/70">
            Everything you need to efficiently manage and scale your trucking operation
          </p>
        </motion.div>
      </div>

      {/* Features Grid */}
      <div className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureDetailCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}