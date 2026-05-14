import React, { createContext, useContext, useState } from 'react';

const SESSION_KEY = 'truckops_session';
export const SessionContext = createContext(null);

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s && s.loginTime && Date.now() - s.loginTime > SESSION_TTL_MS) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    }
    catch { return null; }
  });

  const login = (data) => {
    const s = { ...data, loginTime: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return (
    <SessionContext.Provider value={{ session, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);