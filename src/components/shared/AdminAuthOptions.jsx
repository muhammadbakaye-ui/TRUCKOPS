import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

import { Eye, EyeOff, PlayCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from './Logo';

export default function AdminAuthOptions({ onBack, onSuccess, onShowTour, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // login | signup | forgot | forgot_sent
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const switchMode = (m) => { setMode(m); setError(''); };



  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) { setError('Email and password are required'); return; }
    setLoading(true);
    try {
      const pHash = await hashPassword(formData.password);
      const response = await base44.functions.invoke('authAdmin', {
        action: 'login',
        email: formData.email,
        password_hash: pHash,
      });
      if (response.data.success) {
        onSuccess(response.data.admin_id, response.data.admin_name, {
          tenant_id: response.data.tenant_id,
          subscription_status: response.data.subscription_status,
          plan: response.data.plan,
          company_name: response.data.company_name,
          admin_email: formData.email.toLowerCase().trim(),
          session_token: response.data.session_token,
          session_expires: response.data.session_expires,
        });
      } else if (response.data.code === 'subscription_inactive') {
        setError('Your subscription is inactive. Visit pricing to reactivate your plan.');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.companyName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('All fields are required'); return;
    }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const pHash = await hashPassword(formData.password);
      const response = await base44.functions.invoke('authAdmin', {
        action: 'create_admin',
        first_name: formData.firstName,
        last_name: formData.lastName,
        company_name: formData.companyName,
        email: formData.email,
        password_hash: pHash,
      });
      if (response.data.success) {
        onSuccess(response.data.admin_id, response.data.admin_name, {
          tenant_id: response.data.tenant_id,
          subscription_status: response.data.subscription_status,
          plan: response.data.plan,
          company_name: formData.companyName,
          admin_email: formData.email.toLowerCase().trim(),
          session_token: response.data.session_token,
          session_expires: response.data.session_expires,
        });
      } else {
        setError(response.data.message || 'Sign up failed');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) { setError('Email is required'); return; }
    setLoading(true);
    try {
      await base44.functions.invoke('authAdmin', { action: 'forgot_password', email: formData.email });
      setMode('forgot_sent');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-sidebar">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <Logo showCompanyName={false} />
        </div>

        <div className="bg-sidebar-accent border border-sidebar-border rounded-2xl shadow-2xl overflow-hidden">
          <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
          >



          {/* ── SUCCESS: Forgot password sent ── */}
          {mode === 'forgot_sent' && (
            <div className="p-8 text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-blue-400 mx-auto" />
              <h2 className="text-xl font-bold text-sidebar-foreground">Reset link sent</h2>
              <p className="text-sm text-sidebar-foreground/50">
                If an account exists for <strong className="text-sidebar-foreground">{formData.email}</strong>, you'll receive a password reset link shortly.
              </p>
              <Button className="w-full" onClick={() => switchMode('login')}>Back to Sign In</Button>
            </div>
          )}

          {/* ── FORGOT PASSWORD FORM ── */}
          {mode === 'forgot' && (
            <>
              <div className="px-6 pt-6 pb-2">
                <h2 className="text-lg font-bold text-sidebar-foreground">Forgot your password?</h2>
                <p className="text-sm text-sidebar-foreground/50 mt-1">Enter your email and we'll send you a reset link.</p>
              </div>
              <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-sidebar-foreground/70">Email</Label>
                  <Input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} disabled={loading} className="mt-1.5 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-primary" autoFocus />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</Button>
                <Button type="button" variant="ghost" className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar" onClick={() => switchMode('login')} disabled={loading}>Back to Sign In</Button>
              </form>
            </>
          )}

          {/* ── LOGIN / SIGNUP TABS ── */}
          {(mode === 'login' || mode === 'signup') && (
            <>
              <div className="flex border-b border-sidebar-border">
                <button onClick={() => switchMode('login')} className={`flex-1 py-4 font-medium text-sm transition-colors ${mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar'}`}>
                  Sign In
                </button>
                <button onClick={() => switchMode('signup')} className={`flex-1 py-4 font-medium text-sm transition-colors ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar'}`}>
                  Create Account
                </button>
              </div>

              <div className="p-6">
                {/* Login */}
                {mode === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-sidebar-foreground/70">Email</Label>
                      <Input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} disabled={loading} className="mt-1.5 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-primary" autoFocus />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-sidebar-foreground/70">Password</Label>
                      <div className="relative mt-1.5">
                        <Input type={showPassword ? 'text' : 'password'} name="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} disabled={loading} className="pr-10 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-primary" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground/70">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-sidebar-primary hover:underline">Forgot password?</button>
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</Button>
                    {onBack && <Button type="button" variant="ghost" className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar" onClick={onBack} disabled={loading}>Back</Button>}
                  </form>
                )}

                {/* Signup */}
                {mode === 'signup' && (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-sidebar-foreground/70">Company Name</Label>
                      <Input type="text" name="companyName" placeholder="Your trucking company name" value={formData.companyName} onChange={handleChange} disabled={loading} className="mt-1.5 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-primary" autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-sidebar-foreground/70">First Name</Label>
                        <Input type="text" name="firstName" placeholder="First name" value={formData.firstName} onChange={handleChange} disabled={loading} className="mt-1.5 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-primary" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-sidebar-foreground/70">Last Name</Label>
                        <Input type="text" name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleChange} disabled={loading} className="mt-1.5 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-primary" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-sidebar-foreground/70">Email</Label>
                      <Input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} disabled={loading} className="mt-1.5 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-primary" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-sidebar-foreground/70">Password</Label>
                      <div className="relative mt-1.5">
                        <Input type={showPassword ? 'text' : 'password'} name="password" placeholder="At least 8 characters" value={formData.password} onChange={handleChange} disabled={loading} className="pr-10 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-primary" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground/70">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-sidebar-foreground/70">Confirm Password</Label>
                      <div className="relative mt-1.5">
                        <Input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} disabled={loading} className="pr-10 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-primary" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground/70">
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating Account...' : 'Create Account'}</Button>
                    {onBack && <Button type="button" variant="ghost" className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar" onClick={onBack} disabled={loading}>Back</Button>}
                  </form>
                )}
              </div>
            </>
          )}
          </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-white/30 mt-4">
          New customer?{' '}
          <a href="/pricing" className="text-blue-400/70 hover:text-blue-400 underline transition-colors">View Plans</a>
        </p>

        {onShowTour && (
          <div className="flex justify-center mt-3">
            <button onClick={onShowTour} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
              <PlayCircle className="w-3.5 h-3.5" />
              View App Tour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}