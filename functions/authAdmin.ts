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
    const { action, master_password, first_name, last_name, password, email } = body;

    // Verify master password
    if (action === 'verify_master') {
      if (master_password !== MASTER_PASSWORD) {
        return Response.json({ success: false, error: 'Invalid master password' }, { status: 401 });
      }
      return Response.json({ success: true });
    }

    // Create new admin account
    if (action === 'create_admin') {
      if (!first_name || !last_name || !password) {
        return Response.json({ success: false, message: 'Missing required fields' }, { status: 400 });
      }
      const passwordHash = await hashPassword(password);
      const newAdmin = await base44.asServiceRole.entities.Admin.create({
        first_name,
        last_name,
        email: `${first_name.toLowerCase()}.${last_name.toLowerCase()}@admin`,
        password_hash: passwordHash,
        active: true
      });
      return Response.json({ success: true, admin_id: newAdmin.id, admin_name: `${first_name} ${last_name}` });
    }

    // List all admins
    if (action === 'list_admins') {
      const admins = await base44.asServiceRole.entities.Admin.list('-created_date', 50);
      return Response.json({ success: true, admins });
    }

    // Login with email and password
    if (action === 'login') {
      if (!email || !password) {
        return Response.json({ success: false, message: 'Email and password required' }, { status: 400 });
      }
      const admins = await base44.asServiceRole.entities.Admin.list();
      const admin = admins.find(a => a.email === email && a.active);
      if (!admin) {
        return Response.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }
      const isValid = await verifyPassword(password, admin.password_hash);
      if (!isValid) {
        return Response.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }
      return Response.json({ success: true, admin_id: admin.id, admin_name: `${admin.first_name} ${admin.last_name}` });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});