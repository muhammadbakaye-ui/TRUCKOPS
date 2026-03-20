import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Saves and restores scroll position for a scrollable container.
 * Pass the returned ref to the scrollable element.
 * @param {string} key - unique storage key (e.g. 'loads_scroll')
 */
export default function useScrollRestoration(key) {
  const ref = useRef(null);
  const location = useLocation();

  // Restore scroll on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(key);
    if (saved && ref.current) {
      // Use a short delay to let the list render first
      const timer = setTimeout(() => {
        if (ref.current) ref.current.scrollTop = parseInt(saved, 10);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [key]);

  // Save scroll on unmount / navigation away
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => sessionStorage.setItem(key, el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, [key]);

  return ref;
}