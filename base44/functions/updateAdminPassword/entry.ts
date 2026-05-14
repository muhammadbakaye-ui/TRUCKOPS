import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { current_password, new_password, admin_email } = body;

    if (!admin_email) {
      return Response.json({ error: 'admin_email is required' }, { status: 400 });
    }
    if (!current_password || !new_password) {
      return Response.json({ error: 'Current and new password are required' }, { status: 400 });
    }
    if (new_password.length < 6) {
      return Response.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    // Get admin by email
    const admins = await base44.asServiceRole.entities.Admin.filter({ email: admin_email.toLowerCase().trim() });
    if (admins.length === 0) {
      return Response.json({ error: 'Admin account not found' }, { status: 404 });
    }

    const admin = admins[0];

    // Verify current password
    const currentHash = await hashPassword(current_password);
    if (currentHash !== admin.password_hash) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Hash and update new password
    const newHash = await hashPassword(new_password);
    await base44.asServiceRole.entities.Admin.update(admin.id, { password_hash: newHash });

    return Response.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});