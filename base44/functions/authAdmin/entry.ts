import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sendEmail(base44, to, subject, body) {
  await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, email, password, password_hash, first_name, last_name, company_name, token, new_password, new_password_hash } = body;

    // ── LOGIN ──
    if (action === 'login') {
      if (!email || (!password && !password_hash)) {
        return Response.json({ success: false, message: 'Email and password are required' }, { status: 400 });
      }
      const [allAdmins, inputHash] = await Promise.all([
        base44.asServiceRole.entities.Admin.list('-created_date', 200),
        password_hash ? Promise.resolve(password_hash) : hashPassword(password),
      ]);
      const admin = allAdmins.find(a => a.active && a.email?.toLowerCase().trim() === email.toLowerCase().trim());
      if (!admin || inputHash !== admin.password_hash) {
        return Response.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }
      if (!admin.email_verified) {
        return Response.json({ success: false, message: 'Please verify your email before logging in. Check your inbox for the verification link.', code: 'email_not_verified' }, { status: 403 });
      }
      let subscriptionStatus = null;
      let plan = null;
      if (admin.tenant_id) {
        const subs = await base44.asServiceRole.entities.Subscription.filter({ tenant_id: admin.tenant_id });
        if (subs.length) {
          subscriptionStatus = subs[0].status;
          plan = subs[0].plan;
          if (subscriptionStatus === 'canceled' || subscriptionStatus === 'unpaid') {
            return Response.json({ success: false, message: 'Your subscription is inactive. Please renew your plan to continue.' }, { status: 403 });
          }
        }
      }
      return Response.json({
        success: true,
        admin_id: admin.id,
        admin_name: `${admin.first_name} ${admin.last_name}`,
        company_name: admin.company_name || '',
        tenant_id: admin.tenant_id || null,
        subscription_status: subscriptionStatus,
        plan,
      });
    }

    // ── CREATE ADMIN ──
    if (action === 'create_admin') {
      if (!first_name || !last_name || !email || (!password && !password_hash) || !company_name) {
        return Response.json({ success: false, message: 'All fields are required' }, { status: 400 });
      }
      const [existing, passwordHash] = await Promise.all([
        base44.asServiceRole.entities.Admin.filter({ email: email.toLowerCase().trim() }),
        password_hash ? Promise.resolve(password_hash) : hashPassword(password),
      ]);
      if (existing.length > 0) {
        return Response.json({ success: false, message: 'An account with this email already exists' }, { status: 400 });
      }
      const newAdmin = await base44.asServiceRole.entities.Admin.create({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        company_name: company_name.trim(),
        active: true,
        email_verified: true,
      });

      return Response.json({ success: true, admin_id: newAdmin.id, admin_name: `${first_name} ${last_name}`, message: 'Account created successfully. You can now sign in.' });
    }

    // ── VERIFY EMAIL ──
    if (action === 'verify_email') {
      if (!token) return Response.json({ success: false, message: 'Token is required' }, { status: 400 });
      const allAdmins = await base44.asServiceRole.entities.Admin.list('-created_date', 500);
      const admin = allAdmins.find(a => a.verification_token === token);
      if (!admin) return Response.json({ success: false, message: 'Invalid or expired verification link.' }, { status: 400 });
      await base44.asServiceRole.entities.Admin.update(admin.id, { email_verified: true, verification_token: '' });
      return Response.json({ success: true, message: 'Email verified successfully! You can now log in.' });
    }

    // ── FORGOT PASSWORD ──
    if (action === 'forgot_password') {
      if (!email) return Response.json({ success: false, message: 'Email is required' }, { status: 400 });
      const admins = await base44.asServiceRole.entities.Admin.filter({ email: email.toLowerCase().trim() });
      // Always return success to prevent email enumeration
      if (admins.length > 0) {
        const resetToken = generateToken();
        const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
        await base44.asServiceRole.entities.Admin.update(admins[0].id, { reset_token: resetToken, reset_token_expires: expires });
        const appUrl = Deno.env.get('APP_URL') || 'https://app.base44.com';
        const resetLink = `${appUrl}/reset-password?token=${resetToken}`;
        await sendEmail(
          base44,
          email.toLowerCase().trim(),
          'Reset your FleetDesk Pro password',
          `Hi ${admins[0].first_name},\n\nWe received a request to reset your password. Click the link below to set a new password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\n— The FleetDesk Pro Team`
        );
      }
      return Response.json({ success: true, message: 'If an account with that email exists, you will receive a password reset link shortly.' });
    }

    // ── RESET PASSWORD WITH TOKEN ──
    if (action === 'reset_password_token') {
      if (!token || (!new_password && !new_password_hash)) return Response.json({ success: false, message: 'Token and new password are required' }, { status: 400 });
      const allAdmins = await base44.asServiceRole.entities.Admin.list('-created_date', 500);
      const admin = allAdmins.find(a => a.reset_token === token);
      if (!admin) return Response.json({ success: false, message: 'Invalid or expired reset link.' }, { status: 400 });
      if (admin.reset_token_expires && new Date() > new Date(admin.reset_token_expires)) {
        return Response.json({ success: false, message: 'This reset link has expired. Please request a new one.' }, { status: 400 });
      }
      const newHash = new_password_hash ? new_password_hash : await hashPassword(new_password);
      await base44.asServiceRole.entities.Admin.update(admin.id, { password_hash: newHash, reset_token: '', reset_token_expires: null });
      return Response.json({ success: true, message: 'Password updated successfully. You can now log in.' });
    }

    // ── RESET PASSWORD (admin tool) ──
    if (action === 'reset_password') {
      if (!email || (!password && !password_hash)) {
        return Response.json({ success: false, message: 'Email and new password required' }, { status: 400 });
      }
      const [admins, newHash] = await Promise.all([
        base44.asServiceRole.entities.Admin.filter({ email: email.toLowerCase().trim() }),
        password_hash ? Promise.resolve(password_hash) : hashPassword(password),
      ]);
      if (!admins.length) return Response.json({ success: false, message: 'Admin not found' }, { status: 404 });
      await base44.asServiceRole.entities.Admin.update(admins[0].id, { password_hash: newHash });
      return Response.json({ success: true, message: 'Password updated' });
    }

    // ── LIST ADMINS ──
    if (action === 'list_admins') {
      const admins = await base44.asServiceRole.entities.Admin.list('-created_date', 50);
      return Response.json({ success: true, admins });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('authAdmin error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});