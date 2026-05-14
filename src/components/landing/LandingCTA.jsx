import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function LandingCTA({ onContinue }) {
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: false });

  return (
    <div className="py-20 px-4 bg-gradient-to-r from-sidebar-primary to-sidebar-primary/80">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
          Ready to Streamline Your Fleet Operations?
        </h2>
        <p className="text-lg text-white/90 mb-10">
          Join trucking companies across the nation who are managing their fleets more efficiently with TruckOps.
        </p>
        <Button
          onClick={onContinue}
          size="lg"
          className="bg-white hover:bg-white/90 text-sidebar-primary px-10 py-6 text-lg rounded-lg font-semibold flex items-center gap-2 mx-auto"
        >
          Get Started Now
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </div>
  );
}