import React from 'react';
import { Truck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Privacy() {
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

        <h1 className="text-3xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">1. Information We Collect</h2>
            <p>We collect information you provide when creating an account, including your name, company name, and email address. We also collect data you enter into the platform such as load information, driver records, and financial data. Payment processing is handled securely by Stripe — we do not store your credit card details.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">2. How We Use Your Information</h2>
            <p>We use your information to provide and improve the TruckOps platform, send transactional emails (account credentials, billing receipts), and respond to support requests. We do not sell your data to third parties.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">3. Data Storage & Security</h2>
            <p>Your data is stored securely in the cloud. We use industry-standard encryption for data in transit and at rest. Access to your data is restricted to authenticated users only.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">4. Third-Party Services</h2>
            <p>We use Stripe for payment processing and Resend for transactional email delivery. These services have their own privacy policies governing data handling.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">5. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. Upon account deletion, your data is removed from our systems within 30 days.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">6. Contact</h2>
            <p>For privacy-related questions, contact us at <a href="mailto:support@mytruckops.com" className="text-primary hover:underline">support@mytruckops.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}