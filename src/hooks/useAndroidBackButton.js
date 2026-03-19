import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Handles the Android physical back button via the browser's popstate event.
 * When the back button is pressed and there's history to go back to, navigates back.
 * Otherwise lets the default behaviour (exit app) proceed.
 */
export default function useAndroidBackButton() {
  const navigate = useNavigate();

  useEffect(() => {
    // Push a sentinel entry so there's always something to pop before leaving
    window.history.pushState({ androidBackHandled: true }, '');

    const handler = (e) => {
      // If we consumed a sentinel, push another and navigate back in router
      navigate(-1);
      window.history.pushState({ androidBackHandled: true }, '');
    };

    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [navigate]);
}