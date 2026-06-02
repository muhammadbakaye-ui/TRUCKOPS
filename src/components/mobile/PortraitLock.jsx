import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Silently locks the screen to portrait using the Screen Orientation API.
 * Also applies a CSS transform fallback for browsers that block the API.
 * Fires on mount, every route change, and on every orientationchange event.
 */
export default function PortraitLock() {
  const location = useLocation();
  useEffect(() => {
    const lockPortrait = async () => {
      try {
        if (screen?.orientation?.lock) {
          await screen.orientation.lock('portrait');
        }
      } catch {
        // API rejected (desktop, or permission denied) — CSS transform fallback handles it
      }
    };

    lockPortrait();

    const handleOrientationChange = () => {
      lockPortrait();
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [location.pathname]);

  return null;
}