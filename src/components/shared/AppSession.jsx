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

        // Restore session immediately with cached company_name
        setSession(s);
        
        // Fetch company name if missing
        if (!s.company_name && s.tenant_id) {
          base44.entities.Company.filter({ tenant_id: s.tenant_id }, '-updated_date', 1)
            .then(companies => {
              if (companies.length > 0) {
                const updated = { ...s, company_name: companies[0].company_name };
                localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
                setSession(updated);
              }
            })
            .catch(() => {});
        }
        setValidating(false);
        
        // Validate server-side in background; only clear session if validation fails
        base44.functions.invoke('authAdmin', {
          action: 'validate_session',
          session_token: s.session_token,
          email: s.admin_email,
        })
          .then(res => {
            if (res.data?.success) {
              const refreshed = {
                ...s,
                admin_name: res.data.admin_name || s.admin_name,
                company_name: res.data.company_name || s.company_name,
                tenant_id: res.data.tenant_id || s.tenant_id,
                subscription_status: res.data.subscription_status || s.subscription_status,
                plan: res.data.plan || s.plan,
              };
              localStorage.setItem(SESSION_KEY, JSON.stringify(refreshed));
              setSession(refreshed);
              
              // If company_name still missing, fetch from entity
              if (!refreshed.company_name && refreshed.tenant_id) {
                base44.entities.Company.filter({ tenant_id: refreshed.tenant_id }, '-updated_date', 1)
                  .then(companies => {
                    if (companies.length > 0) {
                      const final = { ...refreshed, company_name: companies[0].company_name };
                      localStorage.setItem(SESSION_KEY, JSON.stringify(final));
                      setSession(final);
                    }
                  })
                  .catch(() => {});
              }
            } else {
              // Server rejected session — log out
              localStorage.removeItem(SESSION_KEY);
              setSession(null);
            }
          })
          .catch(() => {
            // Network error or timeout — keep existing session, don't log out
            // Only log out on explicit server rejection (handled in .then above)
          });
      } catch {
        localStorage.removeItem(SESSION_KEY);
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