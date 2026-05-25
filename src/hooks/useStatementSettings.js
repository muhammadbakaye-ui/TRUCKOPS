/**
 * useStatementSettings — reads the current admin's statement period preferences.
 *
 * Returns:
 *   weekStart  {number}  0=Sun … 6=Sat  (day the period starts)
 *   dueDay     {number}  0=Sun … 6=Sat  (day of the FOLLOWING week statements are due)
 *   saving     {boolean}
 *   save(weekStart, dueDay) → Promise<void>
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'truckops_statement_settings';

// Defaults: Sun–Sat week, Tuesday due
const DEFAULTS = { weekStart: 0, dueDay: 2 };

function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function getAdminSession() {
  try {
    const raw = localStorage.getItem('truckops_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function useStatementSettings() {
  const [settings, setSettings] = useState(() => readCache() || DEFAULTS);
  const [saving, setSaving] = useState(false);

  // Load from DB on mount (syncs any changes made on another device)
  useEffect(() => {
    const load = async () => {
      try {
        const session = getAdminSession();
        if (!session?.admin_email) return;
        const admins = await base44.entities.Admin.filter(
          { email: session.admin_email, tenant_id: session.tenant_id }, '-created_date', 1
        );
        if (!admins.length) return;
        const admin = admins[0];
        const loaded = {
          weekStart: admin.statement_week_start ?? DEFAULTS.weekStart,
          dueDay: admin.statement_due_day ?? DEFAULTS.dueDay,
        };
        setSettings(loaded);
        writeCache(loaded);
      } catch { /* use cached/defaults */ }
    };
    load();
  }, []);

  const save = async (weekStart, dueDay) => {
    setSaving(true);
    try {
      const session = getAdminSession();
      if (!session?.admin_email) throw new Error('Not logged in');
      const admins = await base44.entities.Admin.filter(
        { email: session.admin_email, tenant_id: session.tenant_id }, '-created_date', 1
      );
      if (!admins.length) throw new Error('Admin not found');
      await base44.entities.Admin.update(admins[0].id, {
        statement_week_start: weekStart,
        statement_due_day: dueDay,
      });
      const updated = { weekStart, dueDay };
      setSettings(updated);
      writeCache(updated);
    } finally {
      setSaving(false);
    }
  };

  return { ...settings, saving, save };
}