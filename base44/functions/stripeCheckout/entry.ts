import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PLANS = {
  basic:        { price_id: 'price_1TWX4zAVTDsGyJQn5XGTK66o', name: 'Basic Plan',        amount: 1600,  mode: 'subscription' },
  professional: { price_id: 'price_1TWWjlAVTDsGyJQnlC9PFxDL', name: 'Professional Plan', amount: 4900,  mode: 'subscription' },
  enterprise:   { price_id: 'price_1TWWjlAVTDsGyJQnA6RopREh', name: 'Enterprise Plan',   amount: 9900,  mode: 'subscription' },
  lifetime:     { price_id: 'price_1TWX52AVTDsGyJQnQKTbPbGH', name: 'Lifetime Plan',     amount: 19900, mode: 'payment' },
};

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, plan, company_name, admin_email, success_url, cancel_url, tenant_id } = body;

    if (action === 'create_checkout') {
       if (!plan || !PLANS[plan]) {
         return Response.json({ error: 'Invalid plan' }, { status: 400 });
       }
       if (!admin_email || !company_name) {
         return Response.json({ error: 'Email and company name are required' }, { status: 400 });
       }

       const customerData = {
         metadata: { plan },
       };
       if (admin_email) customerData.email = admin_email;
       if (company_name) {
         customerData.name = company_name;
         customerData.metadata.company_name = company_name;
       }

       const customer = await stripe.customers.create(customerData);

      const planData = PLANS[plan];
      const isSubscription = planData.mode === 'subscription';

      const defaultOrigin = Deno.env.get('APP_URL') || 'https://mytruckops.com';
      const origin = req.headers.get('origin') || defaultOrigin;
      const sessionParams = {
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [{ price: planData.price_id, quantity: 1 }],
        mode: planData.mode,
        success_url: success_url || `${origin}/SubscriptionSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${origin}/pricing`,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          plan,
          company_name,
          admin_email,
        },
      };

      if (isSubscription) {
        sessionParams.subscription_data = {
          trial_period_days: 3,
          metadata: { plan, company_name, admin_email },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

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

      const returnUrl = body.return_url || `${req.headers.get('origin')}/SettingsPage`;
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subs[0].stripe_customer_id,
        return_url: returnUrl,
      });
      return Response.json({ url: portalSession.url });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('stripeCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});