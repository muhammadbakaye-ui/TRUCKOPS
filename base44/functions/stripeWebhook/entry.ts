import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateTenantId() {
  return 'tenant_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function generateTempPassword() {
  return Math.random().toString(36).substr(2, 10) + Math.random().toString(36).substr(2, 4).toUpperCase() + '!';
}

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event;
    if (!webhookSecret || !sig) {
      console.error('Missing webhook secret or signature — rejecting request');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);

    const base44 = createClientFromRequest(req);

    console.log(`Stripe webhook: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { plan, company_name, admin_email } = session.metadata || {};

      if (!admin_email || !company_name) {
        console.log('Missing metadata (admin_email or company_name), skipping account creation');
        return Response.json({ received: true });
      }

      const isLifetime = session.mode === 'payment';

      // For subscriptions, fetch subscription details; for lifetime, skip
      let stripeSub = null;
      if (!isLifetime && session.subscription) {
        stripeSub = await stripe.subscriptions.retrieve(session.subscription);
      }

      // Idempotency guard: check if account already exists for this email
      const existingAdmins = await base44.asServiceRole.entities.Admin.filter({ email: admin_email.toLowerCase().trim() });
      if (existingAdmins.length > 0) {
        console.log(`Account already exists for ${admin_email}, skipping creation (idempotent)`);
        return Response.json({ received: true });
      }

      // Create tenant record
      const tenantId = generateTenantId();
      await base44.asServiceRole.entities.Subscription.create({
        tenant_id: tenantId,
        company_name,
        admin_email: admin_email.toLowerCase().trim(),
        plan: plan || 'basic',
        status: isLifetime ? 'active' : (stripeSub?.status || 'active'),
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription || null,
        stripe_price_id: stripeSub?.items?.data[0]?.price?.id || null,
        trial_ends_at: stripeSub?.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
        current_period_end: stripeSub?.current_period_end ? new Date(stripeSub.current_period_end * 1000).toISOString() : null,
      });

      // Create admin account for this tenant
      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);
      const nameParts = admin_email.split('@')[0].split('.');
      const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Admin';
      const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'User';

      await base44.asServiceRole.entities.Admin.create({
        first_name: firstName,
        last_name: lastName,
        email: admin_email.toLowerCase().trim(),
        password_hash: passwordHash,
        active: true,
        email_verified: true,
        tenant_id: tenantId,
      });

      const trialEndStr = stripeSub?.trial_end
        ? new Date(stripeSub.trial_end * 1000).toLocaleDateString()
        : null;

      // Send welcome email with credentials
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin_email,
        subject: `Welcome to TruckOps — Your login details`,
        body: `Hi ${firstName},\n\nYour TruckOps account for "${company_name}" is ready!\n\nLogin here: ${Deno.env.get('APP_URL') || 'https://mytruckops.com'}\n\nEmail: ${admin_email}\nTemporary password: ${tempPassword}\n\nPlease change your password after your first login.\n\n${isLifetime ? 'You have lifetime access — no recurring charges.' : `3-day free trial — no charge until ${trialEndStr || 'trial ends'}.`}\n\nWelcome aboard!\nThe TruckOps Team`,
      });

      console.log(`Tenant created: ${tenantId} for ${admin_email} (${plan}, ${isLifetime ? 'lifetime' : 'subscription'})`);
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const subs = await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: sub.id });
      if (subs.length) {
        const updatePayload = {
          status: sub.status,
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        };
        if (sub.current_period_end) {
          updatePayload.current_period_end = new Date(sub.current_period_end * 1000).toISOString();
        }
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, updatePayload);
        console.log(`Subscription updated: ${sub.id} -> ${sub.status}`);
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subs = await base44.asServiceRole.entities.Subscription.filter({ stripe_customer_id: invoice.customer });
      if (subs.length) {
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: 'past_due' });
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: subs[0].admin_email,
          subject: 'TruckOps — Payment failed',
          body: `Hi,\n\nYour payment for TruckOps failed. Please update your billing information to keep your account active.\n\nLog in to manage your billing: ${Deno.env.get('APP_URL') || 'https://mytruckops.com'}\n\nThe TruckOps Team`,
        });
        console.log(`Payment failed for customer: ${invoice.customer}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});