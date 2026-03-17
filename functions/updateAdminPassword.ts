import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { current_password, new_password } = await req.json();

    if (!current_password || !new_password) {
      return Response.json({ error: 'Current and new password are required' }, { status: 400 });
    }

    if (new_password.length < 6) {
      return Response.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    // Get admin by email
    const admins = await base44.asServiceRole.entities.Admin.filter({ email: user.email });
    if (admins.length === 0) {
      return Response.json({ error: 'Admin account not found' }, { status: 404 });
    }

    const admin = admins[0];

    // Verify current password by hashing and comparing
    const currentHash = await hashPassword(current_password);
    const storedHash = admin.password_hash;

    if (currentHash !== storedHash) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Hash new password
    const newHash = await hashPassword(new_password);

    // Update admin record
    await base44.asServiceRole.entities.Admin.update(admin.id, {
      password_hash: newHash,
    });

    return Response.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}