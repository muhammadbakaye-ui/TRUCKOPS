import { motion } from 'framer-motion';
import { Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingHero({ onContinue }) {
  const isElectron = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('platform') === 'electron' || !!window.isElectron);

  return (
    <div className="min-h-screen bg-gradient-to-br from-very-dark via-sidebar-accent to-very-dark flex items-center justify-center px-4 pt-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center max-w-3xl"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-6"
        >
          <img src="https://media.base44.com/images/public/6a0409fc37a632ab53db20fd/34c5d2a43_TruckOpsLogo.png" alt="TruckOps" className="h-20 w-20 object-contain mx-auto mb-6" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-5xl lg:text-7xl font-bold text-sidebar-primary-foreground mb-6 tracking-tight"
        >
          TruckOps
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-xl lg:text-2xl text-sidebar-foreground/80 mb-10 leading-relaxed"
        >
          Complete fleet management software for trucking companies. Track loads, manage drivers, handle invoicing, and automate driver pay in one powerful platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          {!isElectron && (
            <a
              href="https://github.com/muhammadbakaye-ui/TRUCKOPS/releases/download/v1.0.0/TruckOps.Setup.2.0.0.exe"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Now
            </a>
          )}
          <Button
            onClick={onContinue}
            variant="outline"
            size="lg"
            className="border-sidebar-primary text-sidebar-primary hover:bg-sidebar-primary/10 px-8 py-6 text-lg rounded-lg flex items-center gap-2"
          >
            {isElectron ? 'Continue to App' : 'Continue in Browser'}
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="text-sidebar-foreground/50 text-sm mt-8"
        >
          No credit card required • Start free
        </motion.p>
      </motion.div>
    </div>
  );
}