import { motion } from 'framer-motion';
import { Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileLanding({ onContinue }) {
  const isElectron = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('platform') === 'electron' || !!window.isElectron);

  return (
    <div className="min-h-screen bg-sidebar-background flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center text-center w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-7"
        >
          <div className="h-20 w-20 bg-sidebar-primary rounded-3xl flex items-center justify-center shadow-2xl">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm11 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM5 10l1.5-4.5h11L19 10H5z" />
            </svg>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="text-4xl font-bold text-white mb-4 tracking-tight"
        >
          TruckOps
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="text-sidebar-foreground/70 text-base leading-relaxed mb-10"
        >
          Complete fleet management software for trucking companies. Track loads, manage drivers, handle invoicing, and automate driver pay in one powerful platform.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="flex flex-col gap-3 w-full"
        >
          {!isElectron && (
            <a
              href="https://github.com/muhammadbakaye-ui/TRUCKOPS/releases/download/v1.0.0/TruckOps.Setup.2.0.0.exe"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 active:bg-blue-800 text-white px-6 py-4 rounded-xl font-semibold text-base transition-colors w-full"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <Download className="w-5 h-5" />
              Download Now
            </a>
          )}
          <button
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 border border-sidebar-primary text-sidebar-primary active:bg-sidebar-primary/20 px-6 py-4 rounded-xl font-semibold text-base transition-colors w-full bg-transparent"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            {isElectron ? 'Continue to App' : 'Continue in Browser'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-sidebar-foreground/40 text-xs mt-8"
        >
          No credit card required • Start free
        </motion.p>
      </motion.div>
    </div>
  );
}