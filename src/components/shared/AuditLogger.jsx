import { base44 } from '@/api/base44Client';

const SESSION_KEY = 'truckops_session';

export function getCurrentAdminName() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (session?.role === 'admin' && session?.admin_name) {
      return session.admin_name;
    }
  } catch {}
  return null;
}

export async function logAudit({ action_type, entity_type, entity_id, entity_label, before_data, after_data, details }) {
  let user_name = 'System';
  let tenant_id = null;

  const adminName = getCurrentAdminName();
  if (adminName) {
    user_name = adminName;
  } else {
    try {
      const user = await base44.auth.me();
      user_name = user?.full_name || user?.email || 'Unknown';
    } catch {}
  }

  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    tenant_id = session?.tenant_id || null;
  } catch {}

  await base44.entities.AuditLog.create({
    action_type,
    entity_type,
    entity_id,
    entity_label: entity_label || '',
    before_json: before_data ? JSON.stringify(before_data) : '',
    after_json: after_data ? JSON.stringify(after_data) : '',
    user_name,
    details: details || '',
    ...(tenant_id ? { tenant_id } : {}),
  });
}