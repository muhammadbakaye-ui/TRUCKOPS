/**
 * useStatementSettings — reads the current admin's statement period preferences.
 * Uses the authAdmin backend function (service-role) since Admin entity is protected.
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'truckops_statement_settings';
const DEFAULTS = { weekStart: 0, dueDay: 2 };

function readCache() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}
function writeCache(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function getSession() {
  try { return JSON.parse(localStorage.getItem('truckops_session') || 'null'); } catch { return null; }
}

export function useStatementSettings() {
  const [settings, setSettings] = useState(() => readCache() || DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const session = getSession();
        if (!session?.admin_email || !session?.session_token) return;
        const res = await base44.functions.invoke('authAdmin', {
          action: 'get_settings',
          email: session.admin_email,
          session_token: session.session_token,
        });
        const data = res.data;
        if (data?.success) {
          const loaded = {
            weekStart: data.statement_week_start ?? DEFAULTS.weekStart,
            dueDay: data.statement_due_day ?? DEFAULTS.dueDay,
          };
          setSettings(loaded);
          writeCache(loaded);
        }
      } catch { /* use cached/defaults */ }
    };
    load();
  }, []);

  const save = async (weekStart, dueDay) => {
    setSaving(true);
    try {
      const session = getSession();
      if (!session?.admin_email || !session?.session_token) throw new Error('Not logged in');
      const res = await base44.functions.invoke('authAdmin', {
        action: 'update_settings',
        email: session.admin_email,
        session_token: session.session_token,
        statement_week_start: weekStart,
        statement_due_day: dueDay,
      });
      if (!res.data?.success) throw new Error('Save failed');
      const updated = { weekStart, dueDay };
      setSettings(updated);
      writeCache(updated);
    } finally {
      setSaving(false);
    }
  };

  return { ...settings, saving, save };
}