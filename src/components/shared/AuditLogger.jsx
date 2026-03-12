import { base44 } from '@/api/base44Client';

export async function logAudit({ action_type, entity_type, entity_id, entity_label, before_data, after_data, details }) {
  let user_name = 'System';
  try {
    const user = await base44.auth.me();
    user_name = user?.full_name || user?.email || 'Unknown';
  } catch {}
  
  await base44.entities.AuditLog.create({
    action_type,
    entity_type,
    entity_id,
    entity_label: entity_label || '',
    before_json: before_data ? JSON.stringify(before_data) : '',
    after_json: after_data ? JSON.stringify(after_data) : '',
    user_name,
    details: details || ''
  });
}