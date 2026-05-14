import React from 'react';
import { Truck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-10">
          <button onClick={() => navigate('/pricing')} className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <Truck className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">TruckOps</span>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold mb-2">Terms of Service</h1>
        <p className="text-slate-400 text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using TruckOps, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">2. Account Responsibilities</h2>
            <p>You are responsible for maintaining the security of your account credentials. You agree not to share your password or allow unauthorized access to your account. You are responsible for all activity that occurs under your account.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">3. Subscriptions & Billing</h2>
            <p>Subscription plans are billed monthly (or as a one-time payment for the Lifetime plan). Monthly subscriptions include a 3-day free trial — you will not be charged until the trial ends. You may cancel at any time through the billing portal before your trial or billing period ends.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">4. Refund Policy</h2>
            <p>We offer a pro-rated refund within 7 days of your first charge if you are unsatisfied. After that period, all charges are non-refundable. Lifetime plan purchases are final and non-refundable after 14 days.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">5. Acceptable Use</h2>
            <p>You agree to use TruckOps only for lawful purposes related to managing your trucking operations. You may not use the platform to store false, misleading, or illegal information.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">6. Service Availability</h2>
            <p>We strive for high availability but do not guarantee uninterrupted access. We reserve the right to perform maintenance at any time and will notify users of planned downtime when possible.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">7. Limitation of Liability</h2>
            <p>TruckOps is provided "as is" without warranty of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">8. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:support@mytruckops.com" className="text-primary hover:underline">support@mytruckops.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}