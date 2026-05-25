import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
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
      from: 'TruckOps <onboarding@resend.dev>',
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

// Simple in-memory rate limiting (per Deno instance, best-effort)
const loginAttempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  const entry = loginAttempts.get(key) || { count: 0, first: now };
  if (now - entry.first > 15 * 60 * 1000) {
    loginAttempts.set(key, { count: 1, first: now });
    return true;
  }
  if (entry.count >= 20) return false;
  loginAttempts.set(key, { ...entry, count: entry.count + 1 });
  return true;
}

// Verify a session token server-side. Returns the admin record or null.
async function verifySessionToken(base44, email, session_token) {
  if (!email || !session_token) return null;
  const admins = await base44.asServiceRole.entities.Admin.filter({ email: email.toLowerCase().trim() });
  const admin = admins.find(a => a.active && a.session_token === session_token);
  if (!admin) return null;
  if (admin.session_token_expires && new Date() > new Date(admin.session_token_expires)) return null;
  return admin;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, email, password, password_hash, first_name, last_name, company_name, token, new_password, new_password_hash, session_token, current_password, current_password_hash } = body;
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';

    // ── LOGIN ──
    if (action === 'login') {
      if (!email || (!password && !password_hash)) {
        return Response.json({ success: false, message: 'Email and password are required' }, { status: 400 });
      }

      if (!checkRateLimit(clientIp)) {
        return Response.json({ success: false, message: 'Too many login attempts. Please wait 15 minutes and try again.' }, { status: 429 });
      }

      let matchingAdmins, inputHash;
      try {
        [matchingAdmins, inputHash] = await Promise.all([
          base44.asServiceRole.entities.Admin.filter({ email: email.toLowerCase().trim() }),
          password_hash ? Promise.resolve(password_hash) : hashPassword(password),
        ]);
      } catch (dbErr) {
        console.error('Database error during login:', dbErr.message);
        return Response.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }

      const admin = matchingAdmins.find(a => a.active);
      if (!admin || inputHash !== admin.password_hash) {
        return Response.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }

      // Auto-heal: if admin has no tenant_id, generate one now
      let loginTenantId = admin.tenant_id;
      if (!loginTenantId) {
        loginTenantId = `tenant_${admin.id.substring(0, 8)}`;
        console.warn(`Auto-healing tenant_id on login for admin ${admin.email} → ${loginTenantId}`);
        await base44.asServiceRole.entities.Admin.update(admin.id, { tenant_id: loginTenantId });
      }

      let loginSubs = await base44.asServiceRole.entities.Subscription.filter({ tenant_id: loginTenantId });

      // Auto-heal: if no subscription exists, create one
      if (!loginSubs.length) {
        console.warn(`Auto-healing missing subscription on login for tenant ${loginTenantId} (${admin.email})`);
        const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const healed = await base44.asServiceRole.entities.Subscription.create({
          tenant_id: loginTenantId,
          company_name: admin.company_name || '',
          admin_email: admin.email,
          plan: 'starter',
          status: 'trialing',
          trial_ends_at: trialEnds,
        });
        loginSubs = [healed];
      }

      const subs = loginSubs;
      const sub = subs[0];
      const subscriptionStatus = sub.status;
      const plan = sub.plan;

      if (subscriptionStatus === 'canceled' || subscriptionStatus === 'unpaid') {
        return Response.json({ success: false, message: 'Your subscription is inactive. Please visit our pricing page to reactivate your plan.', code: 'subscription_inactive' }, { status: 403 });
      }

      // Issue a secure session token stored server-side on a dedicated field
      const newSessionToken = generateToken();
      const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await base44.asServiceRole.entities.Admin.update(admin.id, {
        session_token: newSessionToken,
        session_token_expires: sessionExpires,
      });

      // Use carrier Company entity as authoritative company name source
      const loginCarrierCompanies = await base44.asServiceRole.entities.Company.filter({ tenant_id: loginTenantId, company_type: 'carrier' });
      const loginCompanyName = loginCarrierCompanies.length > 0
        ? loginCarrierCompanies[0].company_name
        : (admin.company_name || sub.company_name || '');

      return Response.json({
        success: true,
        admin_id: admin.id,
        admin_name: `${admin.first_name} ${admin.last_name}`,
        company_name: loginCompanyName,
        tenant_id: loginTenantId,
        subscription_status: subscriptionStatus,
        plan,
        session_token: newSessionToken,
        session_expires: sessionExpires,
      });
    }

    // ── VALIDATE SESSION ──
    if (action === 'validate_session') {
      if (!session_token || !email) {
        return Response.json({ success: false, message: 'Invalid session' }, { status: 401 });
      }
      const admins = await base44.asServiceRole.entities.Admin.filter({ email: email.toLowerCase().trim() });
      const admin = admins.find(a => a.active && a.session_token === session_token);
      if (!admin) {
        return Response.json({ success: false, message: 'Session expired or invalid' }, { status: 401 });
      }
      if (admin.session_token_expires && new Date() > new Date(admin.session_token_expires)) {
        return Response.json({ success: false, message: 'Session expired' }, { status: 401 });
      }

      // Auto-heal: if admin has no tenant_id, generate one now
      let tenantId = admin.tenant_id;
      if (!tenantId) {
        tenantId = `tenant_${admin.id.substring(0, 8)}`;
        console.warn(`Auto-healing tenant_id for admin ${admin.email} → ${tenantId}`);
        await base44.asServiceRole.entities.Admin.update(admin.id, { tenant_id: tenantId });
      }

      let subs = await base44.asServiceRole.entities.Subscription.filter({ tenant_id: tenantId });

      // Auto-heal: if no subscription exists, create one (trialing)
      if (!subs.length) {
        console.warn(`Auto-healing missing subscription for tenant ${tenantId} (${admin.email})`);
        const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const healed = await base44.asServiceRole.entities.Subscription.create({
          tenant_id: tenantId,
          company_name: admin.company_name || '',
          admin_email: admin.email,
          plan: 'starter',
          status: 'trialing',
          trial_ends_at: trialEnds,
        });
        subs = [healed];
      }

      const sub = subs[0];
      if (sub.status === 'canceled' || sub.status === 'unpaid') {
        return Response.json({ success: false, message: 'Subscription inactive', code: 'subscription_inactive' }, { status: 403 });
      }
      // Use carrier Company entity as authoritative company name source
      const carrierCompanies = await base44.asServiceRole.entities.Company.filter({ tenant_id: tenantId, company_type: 'carrier' });
      const displayCompanyName = carrierCompanies.length > 0
        ? carrierCompanies[0].company_name
        : (admin.company_name || sub.company_name || '');

      return Response.json({
        success: true,
        admin_id: admin.id,
        admin_name: `${admin.first_name} ${admin.last_name}`,
        company_name: displayCompanyName,
        tenant_id: tenantId,
        subscription_status: sub.status,
        plan: sub.plan,
      });
    }

    // ── LOGOUT ──
    if (action === 'logout') {
      if (session_token && email) {
        const admins = await base44.asServiceRole.entities.Admin.filter({ email: email.toLowerCase().trim() });
        const admin = admins.find(a => a.session_token === session_token);
        if (admin) {
          await base44.asServiceRole.entities.Admin.update(admin.id, { session_token: '', session_token_expires: null });
        }
      }
      return Response.json({ success: true });
    }

    // ── CREATE ADMIN (Registration) ──
    if (action === 'create_admin') {
      if (!first_name || !last_name || !email || (!password && !password_hash) || !company_name) {
        return Response.json({ success: false, message: 'All fields are required' }, { status: 400 });
      }

      const trimmedEmail = email.toLowerCase().trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return Response.json({ success: false, message: 'Invalid email address' }, { status: 400 });
      }

      const pw = password || '';
      if (!password_hash && pw.length < 8) {
        return Response.json({ success: false, message: 'Password must be at least 8 characters' }, { status: 400 });
      }

      let existing, passwordHash;
      try {
        [existing, passwordHash] = await Promise.all([
          base44.asServiceRole.entities.Admin.filter({ email: trimmedEmail }),
          password_hash ? Promise.resolve(password_hash) : hashPassword(password),
        ]);
      } catch (dbErr) {
        console.error('Database error during signup:', dbErr.message);
        return Response.json({ success: false, message: 'An error occurred. Please try again.' }, { status: 500 });
      }

      if (existing.length > 0) {
        if (existing[0].email_verified) {
          return Response.json({ success: false, message: 'An account with this email already exists' }, { status: 400 });
        }
        try {
          await base44.asServiceRole.entities.Admin.delete(existing[0].id);
        } catch (delErr) {
          console.error('Failed to delete unverified account:', delErr.message);
        }
      }

      const newAdmin = await base44.asServiceRole.entities.Admin.create({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: trimmedEmail,
        password_hash: passwordHash,
        company_name: company_name.trim(),
        active: true,
        email_verified: true,
        verification_token: '',
      });

      const tenantIdValue = `tenant_${newAdmin.id.substring(0, 8)}`;
      const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // Create subscription AND stamp tenant_id on admin atomically (both must succeed)
      let newSubscription;
      try {
        newSubscription = await base44.asServiceRole.entities.Subscription.create({
          tenant_id: tenantIdValue,
          company_name: company_name.trim(),
          admin_email: trimmedEmail,
          plan: 'starter',
          status: 'trialing',
          trial_ends_at: trialEnds,
        });
      } catch (subErr) {
        console.error(`Failed to create subscription for ${trimmedEmail}:`, subErr.message);
        // Clean up the admin record so they can retry cleanly
        await base44.asServiceRole.entities.Admin.delete(newAdmin.id).catch(() => {});
        return Response.json({ success: false, message: 'Account setup failed. Please try again.' }, { status: 500 });
      }

      // Issue session token immediately + stamp tenant_id
      const newSessionToken = generateToken();
      const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      try {
        await base44.asServiceRole.entities.Admin.update(newAdmin.id, {
          tenant_id: tenantIdValue,
          session_token: newSessionToken,
          session_token_expires: sessionExpires,
        });
      } catch (updateErr) {
        console.error(`Failed to stamp tenant_id on admin ${newAdmin.id}:`, updateErr.message);
        // Attempt cleanup, then fail
        await base44.asServiceRole.entities.Admin.delete(newAdmin.id).catch(() => {});
        await base44.asServiceRole.entities.Subscription.delete(newSubscription.id).catch(() => {});
        return Response.json({ success: false, message: 'Account setup failed. Please try again.' }, { status: 500 });
      }

      console.log(`New account created: ${trimmedEmail} → tenant ${tenantIdValue}`);

      return Response.json({
        success: true,
        admin_id: newAdmin.id,
        admin_name: `${first_name.trim()} ${last_name.trim()}`,
        company_name: company_name.trim(),
        tenant_id: tenantIdValue,
        subscription_status: newSubscription.status,
        plan: newSubscription.plan,
        session_token: newSessionToken,
        session_expires: sessionExpires,
        message: 'Account created. Your 14-day free trial has started!',
      });
    }

    // ── VERIFY EMAIL ──
    if (action === 'verify_email') {
      if (!token) return Response.json({ success: false, message: 'Token is required' }, { status: 400 });
      const matches = await base44.asServiceRole.entities.Admin.filter({ verification_token: token });
      const admin = matches[0] || null;
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

    // ── RESET PASSWORD WITH TOKEN (from email link) ──
    if (action === 'reset_password_token') {
      if (!token || (!new_password && !new_password_hash)) {
        return Response.json({ success: false, message: 'Token and new password are required' }, { status: 400 });
      }
      const pw = new_password || '';
      if (!new_password_hash && pw.length < 8) {
        return Response.json({ success: false, message: 'Password must be at least 8 characters' }, { status: 400 });
      }
      const matches = await base44.asServiceRole.entities.Admin.filter({ reset_token: token });
      const admin = matches[0] || null;
      if (!admin) return Response.json({ success: false, message: 'Invalid or expired reset link.' }, { status: 400 });
      if (admin.reset_token_expires && new Date() > new Date(admin.reset_token_expires)) {
        return Response.json({ success: false, message: 'This reset link has expired. Please request a new one.' }, { status: 400 });
      }
      const newHash = new_password_hash ? new_password_hash : await hashPassword(new_password);
      // Clear the reset token AND invalidate all active sessions (security best practice)
      await base44.asServiceRole.entities.Admin.update(admin.id, {
        password_hash: newHash,
        reset_token: '',
        reset_token_expires: null,
        session_token: '',
        session_token_expires: null,
      });
      return Response.json({ success: true, message: 'Password updated successfully. You can now log in.' });
    }

    // ── CHANGE PASSWORD (requires valid session — authenticated user changing their own password) ──
    if (action === 'change_password') {
      if (!email || !session_token) {
        return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
      }
      if (!current_password && !current_password_hash) {
        return Response.json({ success: false, message: 'Current password is required' }, { status: 400 });
      }
      if (!new_password && !new_password_hash) {
        return Response.json({ success: false, message: 'New password is required' }, { status: 400 });
      }
      const pw = new_password || '';
      if (!new_password_hash && pw.length < 8) {
        return Response.json({ success: false, message: 'New password must be at least 8 characters' }, { status: 400 });
      }

      // Verify session first
      const admin = await verifySessionToken(base44, email, session_token);
      if (!admin) {
        return Response.json({ success: false, message: 'Session expired. Please log in again.' }, { status: 401 });
      }

      // Verify current password
      const currentHash = current_password_hash ? current_password_hash : await hashPassword(current_password);
      if (currentHash !== admin.password_hash) {
        return Response.json({ success: false, message: 'Current password is incorrect' }, { status: 401 });
      }

      const newHash = new_password_hash ? new_password_hash : await hashPassword(new_password);
      await base44.asServiceRole.entities.Admin.update(admin.id, { password_hash: newHash });
      return Response.json({ success: true, message: 'Password updated successfully' });
    }

    // ── UPDATE PROFILE (requires valid session) ──
    if (action === 'update_profile') {
      if (!email || !session_token) {
        return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
      }
      const admin = await verifySessionToken(base44, email, session_token);
      if (!admin) {
        return Response.json({ success: false, message: 'Session expired. Please log in again.' }, { status: 401 });
      }
      const updateFields = {};
      if (body.first_name !== undefined) updateFields.first_name = body.first_name.trim();
      if (body.last_name !== undefined) updateFields.last_name = body.last_name.trim();
      if (body.phone !== undefined) updateFields.phone = body.phone || '';
      await base44.asServiceRole.entities.Admin.update(admin.id, updateFields);
      return Response.json({ success: true, message: 'Profile updated' });
    }

    // ── LIST ADMINS (PROTECTED — master secret required) ──
    if (action === 'list_admins') {
      const masterSecret = body.master_secret;
      const expectedSecret = Deno.env.get('MASTER_ADMIN_SECRET');
      if (!expectedSecret || masterSecret !== expectedSecret) {
        console.warn('Unauthorized list_admins attempt from IP:', clientIp);
        return Response.json({ success: false, message: 'Unauthorized' }, { status: 403 });
      }
      try {
        const admins = await base44.asServiceRole.entities.Admin.list('-created_date', 100);
        const subs = await base44.asServiceRole.entities.Subscription.list('-created_date', 100);
      const subByTenant = {};
      for (const s of subs) subByTenant[s.tenant_id] = s;
      const safeAdmins = admins.map(a => ({
        id: a.id,
        first_name: a.first_name,
        last_name: a.last_name,
        email: a.email,
        active: a.active,
        company_name: a.company_name,
        tenant_id: a.tenant_id,
        email_verified: a.email_verified,
        created_date: a.created_date,
        subscription: a.tenant_id ? subByTenant[a.tenant_id] : null,
      }));
      return Response.json({ success: true, admins: safeAdmins });
      } catch (err) {
        console.error('list_admins service-role error:', err.message);
        return Response.json({ success: false, message: 'Failed to list admins' }, { status: 500 });
      }
    }

    // ── REPAIR ACCOUNTS (PROTECTED — master secret required) ──
    // Scans all admins and auto-heals any missing tenant_id or missing Subscription
    if (action === 'repair_accounts') {
      const masterSecret = body.master_secret;
      const expectedSecret = Deno.env.get('MASTER_ADMIN_SECRET');
      if (!expectedSecret || masterSecret !== expectedSecret) {
        return Response.json({ success: false, message: 'Unauthorized' }, { status: 403 });
      }
      const allAdmins = await base44.asServiceRole.entities.Admin.list('-created_date', 200);
      const allSubs = await base44.asServiceRole.entities.Subscription.list('-created_date', 200);
      const subByTenant = {};
      for (const s of allSubs) subByTenant[s.tenant_id] = s;

      const results = [];
      for (const admin of allAdmins) {
        const fixes = [];
        let tenantId = admin.tenant_id;

        // Fix 1: missing tenant_id
        if (!tenantId) {
          tenantId = `tenant_${admin.id.substring(0, 8)}`;
          await base44.asServiceRole.entities.Admin.update(admin.id, { tenant_id: tenantId });
          fixes.push(`stamped tenant_id=${tenantId}`);
        }

        // Fix 2: missing Subscription
        if (!subByTenant[tenantId]) {
          const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
          const newSub = await base44.asServiceRole.entities.Subscription.create({
            tenant_id: tenantId,
            company_name: admin.company_name || '',
            admin_email: admin.email,
            plan: 'starter',
            status: 'trialing',
            trial_ends_at: trialEnds,
          });
          subByTenant[tenantId] = newSub;
          fixes.push(`created subscription (trialing)`);
        }

        if (fixes.length > 0) {
          console.log(`Repaired admin ${admin.email}: ${fixes.join(', ')}`);
          results.push({ email: admin.email, fixes });
        }
      }

      console.log(`repair_accounts complete: ${results.length} admins repaired`);
      return Response.json({ success: true, repaired: results.length, details: results });
    }

    // ── GET SETTINGS (requires valid session) ──
    if (action === 'get_settings') {
      if (!email || !session_token) {
        return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
      }
      const admin = await verifySessionToken(base44, email, session_token);
      if (!admin) return Response.json({ success: false, message: 'Session expired.' }, { status: 401 });
      return Response.json({
        success: true,
        statement_week_start: admin.statement_week_start ?? 0,
        statement_due_day: admin.statement_due_day ?? 2,
        onboarding_completed: admin.onboarding_completed ?? false,
      });
    }

    // ── UPDATE SETTINGS (requires valid session) ──
    if (action === 'update_settings') {
      if (!email || !session_token) {
        return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
      }
      const admin = await verifySessionToken(base44, email, session_token);
      if (!admin) return Response.json({ success: false, message: 'Session expired.' }, { status: 401 });
      const updates = {};
      if (body.statement_week_start !== undefined) updates.statement_week_start = body.statement_week_start;
      if (body.statement_due_day !== undefined) updates.statement_due_day = body.statement_due_day;
      if (body.onboarding_completed !== undefined) updates.onboarding_completed = body.onboarding_completed;
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Admin.update(admin.id, updates);
      }
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('authAdmin error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});