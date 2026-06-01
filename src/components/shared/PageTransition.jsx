import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function PageTransition({ children }) {
  const location = useLocation();
  const reduced = prefersReducedMotion();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Skip all animation if user prefers reduced motion
  if (reduced) return <>{children}</>;

  const variants = isMobile
    ? { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }
    : { initial: { opacity: 0, y: 8 },  animate: { opacity: 1, y: 0 },  exit: { opacity: 0, y: -8 } };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname + location.search}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={{ duration: isMobile ? 0.2 : 0.18, ease: 'easeOut' }}
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}