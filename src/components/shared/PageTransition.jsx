import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname + location.search}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}