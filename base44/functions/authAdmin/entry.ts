import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, email, password_hash, password, first_name, last_name } = body;

    if (action === 'login') {
      if (!email || (!password && !password_hash)) {
        return Response.json({ success: false, message: 'Email and password are required' }, { status: 400 });
      }
      const allAdmins = await base44.asServiceRole.entities.Admin.list('-created_date', 100);
      const admin = allAdmins.find(a => a.active && a.email?.toLowerCase().trim() === email.toLowerCase().trim());
      if (!admin) {
        return Response.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }
      // Accept pre-hashed password from client to save CPU time
      const inputHash = password_hash || await hashPassword(password);
      if (inputHash !== admin.password_hash) {
        return Response.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }
      return Response.json({ success: true, admin_id: admin.id, admin_name: `${admin.first_name} ${admin.last_name}` });
    }

    if (action === 'create_admin') {
      if (!first_name || !last_name || !email || (!password && !password_hash)) {
        return Response.json({ success: false, message: 'All fields are required' }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.Admin.filter({ email: email.toLowerCase().trim() });
      if (existing.length > 0) {
        return Response.json({ success: false, message: 'An account with this email already exists' }, { status: 400 });
      }
      const passwordHash = password_hash || await hashPassword(password);
      const newAdmin = await base44.asServiceRole.entities.Admin.create({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        active: true,
      });
      return Response.json({ success: true, admin_id: newAdmin.id, admin_name: `${first_name} ${last_name}` });
    }

    if (action === 'reset_password') {
      if (!email || !password) {
        return Response.json({ success: false, message: 'Email and new password required' }, { status: 400 });
      }
      const admins = await base44.asServiceRole.entities.Admin.filter({ email: email.toLowerCase().trim() });
      if (!admins.length) {
        return Response.json({ success: false, message: 'Admin not found' }, { status: 404 });
      }
      const newHash = await hashPassword(password);
      await base44.asServiceRole.entities.Admin.update(admins[0].id, { password_hash: newHash });
      return Response.json({ success: true, message: 'Password updated' });
    }

    if (action === 'list_admins') {
      const admins = await base44.asServiceRole.entities.Admin.list('-created_date', 50);
      return Response.json({ success: true, admins });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});