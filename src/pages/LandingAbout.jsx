import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import LandingNav from '@/components/landing/LandingNav';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Users, Zap } from 'lucide-react';

const story = [
  {
    icon: Lightbulb,
    title: 'The Problem',
    description: 'Managing a trucking company meant juggling spreadsheets, paper documents, manual calculations, and scattered information across different systems. Drivers waited days for pay statements. Invoices were generated manually, error-prone, and time-consuming. Fuel expenses were impossible to track. There had to be a better way.'
  },
  {
    icon: Zap,
    title: 'The Solution',
    description: 'We built TruckOps to put all your fleet data in one place. Real-time load tracking. Automated invoicing. Driver pay statements calculated instantly. Fuel imports reconciled automatically. Every piece of information you need, accessible in seconds, not hours. Making fleet management simple, efficient, and stress-free.'
  },
  {
    icon: Users,
    title: 'Our Mission',
    description: 'We\'re committed to empowering trucking companies of all sizes with technology that actually works. No complicated enterprise software. No steep learning curves. Just a clean, intuitive platform designed by people who understand the trucking business.'
  }
];

function StoryCard({ icon: Icon, title, description, index }) {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: false });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.15, duration: 0.6 }}
      className="bg-sidebar-accent border border-sidebar-border rounded-xl p-8"
    >
      <div className="h-14 w-14 bg-sidebar-primary rounded-lg flex items-center justify-center mb-6 text-white">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-2xl font-bold text-sidebar-primary-foreground mb-4">{title}</h3>
      <p className="text-sidebar-foreground/80 leading-relaxed text-lg">{description}</p>
    </motion.div>
  );
}

export default function LandingAboutPage() {
  const navigate = useNavigate();
  const { ref: headerRef, inView: headerInView } = useInView({ threshold: 0.1, triggerOnce: false });

  return (
    <div className="min-h-screen bg-very-dark">
      <LandingNav onContinue={() => navigate('/Dashboard')} />
      
      {/* Header */}
      <div className="pt-32 pb-16 px-4">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl lg:text-6xl font-bold text-sidebar-primary-foreground mb-6">
            Why TruckOps?
          </h1>
          <p className="text-xl text-sidebar-foreground/70">
            Built by people who understand the trucking industry
          </p>
        </motion.div>
      </div>

      {/* Story Sections */}
      <div className="py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 gap-8">
          {story.map((item, index) => (
            <StoryCard key={index} {...item} index={index} />
          ))}
        </div>
      </div>

      {/* Values Section */}
      <div className="py-20 px-4 border-t border-sidebar-border bg-sidebar-accent/50">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          <h2 className="text-4xl font-bold text-sidebar-primary-foreground mb-12 text-center">
            Our Values
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Simplicity', desc: 'Technology should be easy to use, not complicated.' },
              { title: 'Reliability', desc: 'Your fleet operations depend on us. We never let you down.' },
              { title: 'Partnership', desc: 'Your success is our success. We listen and improve constantly.' }
            ].map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="text-center"
              >
                <h3 className="text-xl font-semibold text-sidebar-primary-foreground mb-3">{value.title}</h3>
                <p className="text-sidebar-foreground/70">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}