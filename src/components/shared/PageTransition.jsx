import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Mobile: overlay-based transition ────────────────────────────────────────
// Shows a dark spinner cover instantly on every route change, mounts the new
// page behind it, then fades the cover out. Eliminates blank screens entirely.

function MobilePageTransition({ children }) {
  const location = useLocation();
  const [mounted, setMounted] = useState(true);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef(null);
  const fadeTimer = useRef(null);

  useEffect(() => {
    // Show overlay immediately — within the first paint
    setMounted(true);
    setVisible(true);

    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);

    // Let the new page mount and start rendering, then fade out
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hideTimer.current = setTimeout(() => {
          setVisible(false);                             // start 150ms fade-out
          fadeTimer.current = setTimeout(() => {
            setMounted(false);                           // remove from DOM after fade
          }, 160);
        }, 280);                                         // cover for ~280ms while page boots
      });
    });

    return () => {
      clearTimeout(hideTimer.current);
      clearTimeout(fadeTimer.current);
    };
  }, [location.pathname, location.search]);

  return (
    <>
      {/* New page mounts immediately underneath the overlay */}
      <div style={{ minHeight: '100%' }}>
        {children}
      </div>

      {/* Dark overlay with spinner — sits on top until page is ready */}
      {mounted && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'hsl(var(--background))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: visible ? 1 : 0,
            transition: 'opacity 150ms ease',
            pointerEvents: visible ? 'auto' : 'none',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              border: '3px solid rgba(61, 111, 255, 0.18)',
              borderTopColor: '#3d6fff',
              borderRadius: '50%',
              animation: 'mpt-spin 0.75s linear infinite',
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes mpt-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// ── Desktop / reduced-motion: preserve original behaviour ───────────────────

function DesktopPageTransition({ children }) {
  const location = useLocation();
  const reduced = prefersReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname + location.search}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Entry point ──────────────────────────────────────────────────────────────

export default function PageTransition({ children }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return isMobile
    ? <MobilePageTransition>{children}</MobilePageTransition>
    : <DesktopPageTransition>{children}</DesktopPageTransition>;
}