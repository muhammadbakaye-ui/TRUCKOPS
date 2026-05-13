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
    if (webhookSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    const base44 = createClientFromRequest(req);

    console.log(`Stripe webhook: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { plan, company_name, admin_email } = session.metadata || {};

      if (!admin_email || !company_name) {
        console.log('Missing metadata, skipping');
        return Response.json({ received: true });
      }

      // Get subscription details
      const stripeSub = await stripe.subscriptions.retrieve(session.subscription);

      // Create tenant record
      const tenantId = generateTenantId();
      await base44.asServiceRole.entities.Subscription.create({
        tenant_id: tenantId,
        company_name,
        admin_email: admin_email.toLowerCase().trim(),
        plan: plan || 'starter',
        status: stripeSub.status,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        stripe_price_id: stripeSub.items.data[0]?.price?.id,
        trial_ends_at: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
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
        tenant_id: tenantId,
      });

      // Send welcome email with credentials
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin_email,
        subject: `Welcome to FleetDesk Pro — Your login details`,
        body: `Hi ${firstName},\n\nYour FleetDesk Pro account for "${company_name}" is ready!\n\nLogin here: ${Deno.env.get('APP_URL') || 'your app URL'}\n\nEmail: ${admin_email}\nTemporary password: ${tempPassword}\n\nPlease change your password after your first login.\n\n14-day free trial — no charge until ${stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toLocaleDateString() : 'trial ends'}.\n\nWelcome aboard!\nFleetDesk Pro Team`,
      });

      console.log(`Tenant created: ${tenantId} for ${admin_email}`);
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const subs = await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: sub.id });
      if (subs.length) {
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        });
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
          subject: 'FleetDesk Pro — Payment failed',
          body: `Hi,\n\nYour payment for FleetDesk Pro failed. Please update your billing information to keep your account active.\n\nLog in to manage your billing: your app URL\n\nFleetDesk Pro Team`,
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