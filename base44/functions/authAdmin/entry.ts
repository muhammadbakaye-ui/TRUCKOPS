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

async function sendResendEmail(to, subject, html) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'TruckOps <noreply@mytruckops.com>',
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    throw new Error(`Email send failed: ${err}`);
  }
  return await res.json();
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
      // If existing unverified account, allow re-registration (overwrite it)
      if (existing.length > 0) {
        if (existing[0].email_verified) {
          return Response.json({ success: false, message: 'An account with this email already exists' }, { status: 400 });
        }
        // Delete the unverified account so we can recreate it
        await base44.asServiceRole.entities.Admin.delete(existing[0].id);
      }

      const verificationToken = generateToken();
      const newAdmin = await base44.asServiceRole.entities.Admin.create({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        company_name: company_name.trim(),
        active: true,
        email_verified: false,
        verification_token: verificationToken,
      });

      const appUrl = Deno.env.get('APP_URL') || 'https://app.base44.com';
      const verifyLink = `${appUrl}/verify-email?token=${verificationToken}`;

      let emailWarning = null;
      try {
        await sendResendEmail(
          email.toLowerCase().trim(),
          'Verify your TruckOps email',
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1e40af;">Welcome to TruckOps, ${first_name}!</h2>
              <p>Thanks for signing up. Please verify your email address to activate your account.</p>
              <a href="${verifyLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                Verify Email Address
              </a>
              <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link:<br/><a href="${verifyLink}">${verifyLink}</a></p>
              <p style="color: #6b7280; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px;">— The TruckOps Team</p>
            </div>
          `
        );
      } catch (emailErr) {
        console.error('Verification email failed (non-fatal):', emailErr.message);
        emailWarning = 'Account created but verification email could not be sent. Please contact support.';
      }

      return Response.json({ success: true, admin_id: newAdmin.id, message: 'Account created. Please check your email to verify your account.', email_warning: emailWarning });
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
      if (admins.length > 0) {
        const resetToken = generateToken();
        const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await base44.asServiceRole.entities.Admin.update(admins[0].id, { reset_token: resetToken, reset_token_expires: expires });
        const appUrl = Deno.env.get('APP_URL') || 'https://app.base44.com';
        const resetLink = `${appUrl}/reset-password?token=${resetToken}`;
        try {
          await sendResendEmail(
            email.toLowerCase().trim(),
            'Reset your TruckOps password',
            `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e40af;">Reset Your Password</h2>
                <p>Hi ${admins[0].first_name},</p>
                <p>We received a request to reset your password. Click the button below to set a new one:</p>
                <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                  Reset Password
                </a>
                <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour.</p>
                <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link:<br/><a href="${resetLink}">${resetLink}</a></p>
                <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #9ca3af; font-size: 12px;">— The TruckOps Team</p>
              </div>
            `
          );
        } catch (emailErr) {
          console.error('Password reset email failed (non-fatal):', emailErr.message);
        }
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