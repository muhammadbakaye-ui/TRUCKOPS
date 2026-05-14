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
          <div className="h-20 w-20 bg-sidebar-primary rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-6">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm11 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM5 10l1.5-4.5h11L19 10H5z" />
            </svg>
          </div>
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
            <button
              disabled
              className="relative inline-flex flex-col items-center justify-center text-white px-6 py-3 rounded-lg cursor-not-allowed overflow-hidden font-medium"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #000 0px, #000 10px, #FBBF24 10px, #FBBF24 20px)',
                textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 4px 8px rgba(0,0,0,0.8)'
              }}
            >
              <div className="relative flex items-center gap-1">
                <Download className="w-4 h-4" />
                <span>Download Now</span>
              </div>
              <span className="text-xs">(coming soon)</span>
            </button>
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