import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * On mobile devices, renders a full-screen overlay whenever the device
 * is in landscape orientation, instructing the user to rotate back to portrait.
 * Has no effect on desktop (screens wider than 1024px in portrait).
 */
export default function PortraitLock() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const check = () => {
      // Only apply on true mobile screen sizes
      const mobile = window.innerWidth <= 932 || window.innerHeight <= 932;
      setIsLandscape(mobile && window.innerWidth > window.innerHeight);
    };

    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isLandscape) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#0a0e1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
      }}
    >
      <RotateCcw
        style={{ width: 56, height: 56, color: '#4a9eff', animation: 'spin 2s linear infinite' }}
      />
      <div style={{ textAlign: 'center', padding: '0 2rem' }}>
        <p style={{ color: '#ffffff', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Please rotate your device
        </p>
        <p style={{ color: '#8b9db5', fontSize: '0.875rem' }}>
          TruckOps works in portrait mode only
        </p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }`}</style>
    </div>
  );
}