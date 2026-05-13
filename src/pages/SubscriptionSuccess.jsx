import React from 'react';
import { CheckCircle, Mail, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SubscriptionSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Truck className="w-7 h-7 text-primary" />
          <span className="text-xl font-bold">TruckOps</span>
        </div>

        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>

        <h1 className="text-3xl font-extrabold mb-3">You're in!</h1>
        <p className="text-slate-400 mb-6">
          Your TruckOps account has been created. Check your email — we've sent your login credentials so you can get started right away.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8 flex items-start gap-3 text-left">
          <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-sm mb-1">Check your inbox</div>
            <p className="text-slate-400 text-sm">
              We sent your temporary password to the email you provided. Use it to log in and set up your fleet.
            </p>
          </div>
        </div>

        <Button
          className="w-full h-11 font-bold"
          onClick={() => window.location.href = '/'}
        >
          Go to Login
        </Button>

        <p className="text-xs text-slate-600 mt-4">
          Your 3-day free trial starts now. No charge until your trial ends.
        </p>
      </div>
    </div>
  );
}