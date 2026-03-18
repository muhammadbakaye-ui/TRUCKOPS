import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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
    const { action, email, password, first_name, last_name, confirmPassword } = body;

    // Create new admin account
    if (action === 'create_admin') {
      if (!first_name || !last_name || !email || !password) {
        return Response.json({ success: false, message: 'All fields are required' }, { status: 400 });
      }

      // Check for duplicate email
      const existing = await base44.asServiceRole.entities.Admin.filter({ email: email.toLowerCase().trim() });
      if (existing.length > 0) {
        return Response.json({ success: false, message: 'An account with this email already exists' }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);
      const newAdmin = await base44.asServiceRole.entities.Admin.create({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        active: true
      });
      return Response.json({ success: true, admin_id: newAdmin.id, admin_name: `${first_name} ${last_name}` });
    }

    // Login with email and password
    if (action === 'login') {
      if (!email || !password) {
        return Response.json({ success: false, message: 'Email and password are required' }, { status: 400 });
      }
      const admins = await base44.asServiceRole.entities.Admin.filter({ email: email.toLowerCase().trim() });
      const admin = admins.find(a => a.active);
      if (!admin) {
        return Response.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }
      const isValid = await verifyPassword(password, admin.password_hash);
      if (!isValid) {
        return Response.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }
      return Response.json({ success: true, admin_id: admin.id, admin_name: `${admin.first_name} ${admin.last_name}` });
    }

    // List all admins
    if (action === 'list_admins') {
      const admins = await base44.asServiceRole.entities.Admin.list('-created_date', 50);
      return Response.json({ success: true, admins });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});