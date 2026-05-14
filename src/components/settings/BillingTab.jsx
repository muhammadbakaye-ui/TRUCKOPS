import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '../shared/AppSession';

const PLAN_LABELS = { basic: 'Basic', professional: 'Professional', enterprise: 'Enterprise', lifetime: 'Lifetime', starter: 'Starter' };
const PLAN_PRICES = { basic: '$16/mo', professional: '$49/mo', enterprise: '$99/mo', lifetime: '$199 one-time', starter: '$16/mo' };
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700 border-green-200',
  trialing: 'bg-blue-100 text-blue-700 border-blue-200',
  past_due: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  canceled: 'bg-red-100 text-red-700 border-red-200',
  unpaid: 'bg-red-100 text-red-700 border-red-200',
};

export default function BillingTab() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    if (!session?.tenant_id) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('stripeCheckout', {
        action: 'create_portal',
        tenant_id: session.tenant_id,
        return_url: window.location.href,
      });
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      }
    } catch (err) {
      alert('Could not open billing portal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const plan = session?.plan;
  const status = session?.subscription_status;
  const tenantId = session?.tenant_id;

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No subscription found for this account.</p>
          <Button size="sm" onClick={() => window.open('/pricing', '_blank')}>
            View Plans <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-base">{PLAN_LABELS[plan] || plan || 'Unknown'} Plan</div>
              <div className="text-sm text-muted-foreground">{PLAN_PRICES[plan] || ''}</div>
            </div>
            <div className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[status] || 'bg-muted text-muted-foreground border-border'}`}>
              {status === 'trialing' ? 'Free Trial' : status ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown'}
            </div>
          </div>

          {status === 'trialing' && (
            <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              You're on a 3-day free trial. Add a payment method to continue after the trial ends.
            </div>
          )}
          {status === 'past_due' && (
            <div className="mt-3 flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Your payment failed. Update your billing info to keep your account active.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Manage Billing</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-3">
            Update your payment method, view invoices, change your plan, or cancel your subscription through the secure Stripe billing portal.
          </p>
          <Button size="sm" onClick={handleManageBilling} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            Open Billing Portal
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}