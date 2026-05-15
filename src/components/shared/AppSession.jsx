import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const SESSION_KEY = 'truckops_session';
export const SessionContext = createContext(null);

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [validating, setValidating] = useState(true);

  // On mount: load from localStorage and validate with server
  useEffect(() => {
    const restore = async () => {
      try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        if (!s) { setValidating(false); return; }

        // Validate required fields exist
        if (!s.session_token || !s.admin_email || !s.tenant_id) {
          localStorage.removeItem(SESSION_KEY);
          setValidating(false);
          return;
        }

        // Check local TTL first
        if (s.loginTime && Date.now() - s.loginTime > SESSION_TTL_MS) {
          localStorage.removeItem(SESSION_KEY);
          setValidating(false);
          return;
        }

        // Immediately restore the session without waiting for server validation
        // The app will render with the cached session, and validation happens in the background
        setSession(s);
        setValidating(false);
        
        // Non-blocking background validation — does not block rendering
        base44.functions.invoke('authAdmin', {
          action: 'validate_session',
          session_token: s.session_token,
          email: s.admin_email,
        })
          .then(res => {
            if (res.data?.success) {
              // Update the session with refreshed data if validation succeeds
              const refreshed = {
                ...s,
                admin_name: res.data.admin_name,
                company_name: res.data.company_name,
                tenant_id: res.data.tenant_id,
                subscription_status: res.data.subscription_status,
                plan: res.data.plan,
              };
              localStorage.setItem(SESSION_KEY, JSON.stringify(refreshed));
              setSession(refreshed);
            } else {
              // Server rejected session — log out
              localStorage.removeItem(SESSION_KEY);
              setSession(null);
            }
          })
          .catch(err => {
            // Validation failed — clear stale session
            console.warn('Session validation failed:', err.message);
            localStorage.removeItem(SESSION_KEY);
            setSession(null);
          });
      } catch {
        localStorage.removeItem(SESSION_KEY);
      } finally {
        setValidating(false);
      }
    };

    restore();
  }, []);

  const login = useCallback((data) => {
    const s = { ...data, loginTime: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const logout = useCallback(async () => {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s?.session_token && s?.admin_email) {
        // Invalidate server-side session token
        await base44.functions.invoke('authAdmin', {
          action: 'logout',
          session_token: s.session_token,
          email: s.admin_email,
        }).catch(() => {}); // non-blocking
      }
    } catch {}
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  return (
    <SessionContext.Provider value={{ session, login, logout, validating }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);