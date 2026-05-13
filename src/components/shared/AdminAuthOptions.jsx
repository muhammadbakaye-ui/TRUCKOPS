import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

import { Eye, EyeOff, PlayCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from './Logo';

export default function AdminAuthOptions({ onBack, onSuccess, onShowTour }) {
  const [mode, setMode] = useState('login'); // login | signup | forgot | forgot_sent | verify_email
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const countdownRef = useRef(null);

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

  const startResendCountdown = () => {
    setResendCountdown(30);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const pHash = await hashPassword(formData.password);
      await base44.functions.invoke('authAdmin', {
        action: 'create_admin',
        first_name: formData.firstName,
        last_name: formData.lastName,
        company_name: formData.companyName,
        email: formData.email,
        password_hash: pHash,
      });
      setResendSuccess(true);
      startResendCountdown();
    } catch (err) {
      // silently fail on resend
    } finally {
      setResendLoading(false);
    }
  };

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
        });
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
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }
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
        setMode('verify_email');
        startResendCountdown();
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

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* ── SUCCESS: Verify email ── */}
          {mode === 'verify_email' && (
            <div className="p-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Verify your email</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  A verification link has been sent to
                </p>
                <p className="text-sm font-semibold text-foreground mt-1">{formData.email}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Click the link in that email to activate your account, then come back here to sign in.
              </p>

              {/* Resend */}
              <div className="space-y-2">
                {resendSuccess && (
                  <p className="text-xs text-green-600 font-medium">Verification email resent!</p>
                )}
                {resendCountdown > 0 ? (
                  <p className="text-xs text-muted-foreground">Resend available in {resendCountdown}s</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {resendLoading ? 'Sending...' : "Didn't receive it? Resend email"}
                  </button>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-left">
                <p className="text-xs text-amber-700">
                  <strong>Can't find the email?</strong> Check your <strong>spam or junk folder</strong> — it may have been filtered automatically.
                </p>
              </div>

              <Button className="w-full" onClick={() => switchMode('login')}>Back to Sign In</Button>
            </div>
          )}

          {/* ── SUCCESS: Forgot password sent ── */}
          {mode === 'forgot_sent' && (
            <div className="p-8 text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-blue-500 mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Reset link sent</h2>
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong>{formData.email}</strong>, you'll receive a password reset link shortly.
              </p>
              <Button className="w-full" onClick={() => switchMode('login')}>Back to Sign In</Button>
            </div>
          )}

          {/* ── FORGOT PASSWORD FORM ── */}
          {mode === 'forgot' && (
            <>
              <div className="px-6 pt-6 pb-2">
                <h2 className="text-lg font-bold text-foreground">Forgot your password?</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send you a reset link.</p>
              </div>
              <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <Input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} disabled={loading} className="mt-1.5" autoFocus />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => switchMode('login')} disabled={loading}>Back to Sign In</Button>
              </form>
            </>
          )}

          {/* ── LOGIN / SIGNUP TABS ── */}
          {(mode === 'login' || mode === 'signup') && (
            <>
              <div className="flex border-b">
                <button onClick={() => switchMode('login')} className={`flex-1 py-4 font-medium transition-colors ${mode === 'login' ? 'bg-primary text-primary-foreground' : 'bg-white text-foreground hover:bg-muted'}`}>
                  Sign In
                </button>
                <button onClick={() => switchMode('signup')} className={`flex-1 py-4 font-medium transition-colors ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'bg-white text-foreground hover:bg-muted'}`}>
                  Create Account
                </button>
              </div>

              <div className="p-6">
                {/* Login */}
                {mode === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <Input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} disabled={loading} className="mt-1.5" autoFocus />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Password</Label>
                      <div className="relative mt-1.5">
                        <Input type={showPassword ? 'text' : 'password'} name="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} disabled={loading} className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-primary hover:underline">Forgot password?</button>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</Button>
                    {onBack && <Button type="button" variant="ghost" onClick={onBack} className="w-full" disabled={loading}>Back</Button>}
                  </form>
                )}

                {/* Signup */}
                {mode === 'signup' && (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Company Name</Label>
                      <Input type="text" name="companyName" placeholder="Your trucking company name" value={formData.companyName} onChange={handleChange} disabled={loading} className="mt-1.5" autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium">First Name</Label>
                        <Input type="text" name="firstName" placeholder="First name" value={formData.firstName} onChange={handleChange} disabled={loading} className="mt-1.5" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Last Name</Label>
                        <Input type="text" name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleChange} disabled={loading} className="mt-1.5" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <Input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} disabled={loading} className="mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Password</Label>
                      <div className="relative mt-1.5">
                        <Input type={showPassword ? 'text' : 'password'} name="password" placeholder="At least 6 characters" value={formData.password} onChange={handleChange} disabled={loading} className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Confirm Password</Label>
                      <div className="relative mt-1.5">
                        <Input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} disabled={loading} className="pr-10" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating Account...' : 'Create Account'}</Button>
                    {onBack && <Button type="button" variant="ghost" onClick={onBack} className="w-full" disabled={loading}>Back</Button>}
                  </form>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-white/30 mt-4">
          New customer?{' '}
          <a href="/pricing" className="text-blue-400/70 hover:text-blue-400 underline transition-colors">Start free trial</a>
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