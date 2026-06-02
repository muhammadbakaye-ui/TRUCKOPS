import { useEffect } from 'react';

/**
 * Silently locks the screen to portrait using the Screen Orientation API.
 * No UI is rendered — if the user rotates their device, nothing happens.
 * Gracefully no-ops on browsers/devices that don't support the API.
 */
export default function PortraitLock() {
  useEffect(() => {
    const lock = async () => {
      try {
        if (screen?.orientation?.lock) {
          await screen.orientation.lock('portrait');
        }
      } catch {
        // Browser may reject (e.g. desktop, or permission denied) — silently ignore
      }
    };
    lock();
  }, []);

  return null;
}