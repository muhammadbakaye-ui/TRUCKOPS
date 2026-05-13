import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PLANS = {
  starter: { price_id: 'price_1TWVptPOzpjOvXb6rFcEix7a', name: 'Starter Plan', amount: 4900 },
  professional: { price_id: 'price_1TWVptPOzpjOvXb6Jz16tkva', name: 'Professional Plan', amount: 9900 },
  enterprise: { price_id: 'price_1TWVpuPOzpjOvXb6z7s62CBI', name: 'Enterprise Plan', amount: 19900 },
};

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, plan, company_name, admin_email, success_url, cancel_url, tenant_id } = body;

    if (action === 'create_checkout') {
      if (!plan || !PLANS[plan]) {
        return Response.json({ error: 'Invalid plan' }, { status: 400 });
      }
      if (!company_name || !admin_email) {
        return Response.json({ error: 'Company name and email are required' }, { status: 400 });
      }

      const customer = await stripe.customers.create({
        email: admin_email,
        name: company_name,
        metadata: { plan, company_name },
      });

      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [{ price: PLANS[plan].price_id, quantity: 1 }],
        mode: 'subscription',
        subscription_data: {
          trial_period_days: 14,
          metadata: { plan, company_name, admin_email },
        },
        success_url: success_url || `${req.headers.get('origin')}/SubscriptionSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${req.headers.get('origin')}/pricing`,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          plan,
          company_name,
          admin_email,
        },
      });

      console.log(`Checkout session created: ${session.id} for ${admin_email} on ${plan} plan`);
      return Response.json({ url: session.url, session_id: session.id });
    }

    if (action === 'create_portal') {
      const base44 = createClientFromRequest(req);
      if (!tenant_id) return Response.json({ error: 'tenant_id required' }, { status: 400 });

      const subs = await base44.asServiceRole.entities.Subscription.filter({ tenant_id });
      if (!subs.length || !subs[0].stripe_customer_id) {
        return Response.json({ error: 'No subscription found' }, { status: 404 });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subs[0].stripe_customer_id,
        return_url: return_url || `${req.headers.get('origin')}/SettingsPage`,
      });
      return Response.json({ url: portalSession.url });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('stripeCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});