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

        // Check local TTL first
        if (s.loginTime && Date.now() - s.loginTime > SESSION_TTL_MS) {
          localStorage.removeItem(SESSION_KEY);
          setValidating(false);
          return;
        }

        // If we have a session_token, validate it server-side
        if (s.session_token && s.admin_email) {
          try {
            const res = await base44.functions.invoke('authAdmin', {
              action: 'validate_session',
              session_token: s.session_token,
              email: s.admin_email,
            });
            if (res.data?.success) {
              // Refresh session data from server (subscription may have changed)
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
              // Server rejected session
              localStorage.removeItem(SESSION_KEY);
            }
          } catch (err) {
            // Network error — allow local session to stand (offline tolerance)
            console.warn('Session validation network error, using local session:', err.message);
            setSession(s);
          }
        } else {
          // Legacy session without session_token — force re-login for security
          localStorage.removeItem(SESSION_KEY);
        }
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