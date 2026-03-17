import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const MASTER_PASSWORD = Deno.env.get('ADMIN_MASTER_PASSWORD') || 'admin123';

// Simple hash function for demo (use bcrypt in production)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, master_password, first_name, last_name, password, admin_id } = body;

    // Step 1: Verify master password
    if (action === 'verify_master') {
      if (master_password !== MASTER_PASSWORD) {
        return Response.json({ error: 'Invalid master password' }, { status: 401 });
      }
      const admins = await base44.asServiceRole.entities.Admin.list('-created_date', 50);
      return Response.json({ success: true, admins });
    }

    // Step 2: Create new admin
    if (action === 'create_admin') {
      if (master_password !== MASTER_PASSWORD) {
        return Response.json({ error: 'Invalid master password' }, { status: 401 });
      }
      const passwordHash = await hashPassword(password);
      const newAdmin = await base44.asServiceRole.entities.Admin.create({
        first_name,
        last_name,
        password_hash: passwordHash,
        active: true
      });
      return Response.json({ success: true, admin_id: newAdmin.id, admin_name: `${first_name} ${last_name}` });
    }

    // Step 3: Login with admin credentials
    if (action === 'login_admin') {
      if (!admin_id || !password) {
        return Response.json({ error: 'Missing credentials' }, { status: 400 });
      }
      const admin = await base44.asServiceRole.entities.Admin.get(admin_id);
      if (!admin || !admin.active) {
        return Response.json({ error: 'Admin not found' }, { status: 404 });
      }
      const isValid = await verifyPassword(password, admin.password_hash);
      if (!isValid) {
        return Response.json({ error: 'Invalid password' }, { status: 401 });
      }
      return Response.json({ success: true, admin_id: admin.id, admin_name: `${admin.first_name} ${admin.last_name}` });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});