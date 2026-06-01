import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, PlayCircle, CheckCircle, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const inputClass =
  'w-full bg-[#0e1016] border border-[#2a2f3d] text-white placeholder-white/25 rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors h-[42px]';

const labelClass = 'block text-xs font-medium text-white/50 mb-1';

function PasswordInput({ name, placeholder, value, onChange, disabled, show, onToggle }) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={inputClass + ' pr-9'}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

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
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#0e1016' }}>
      <div className="w-full max-w-[440px] px-4">

        {/* Logo + App Name */}
        <div className="flex items-center justify-center mb-6">
          <Logo showCompanyName={true} />
        </div>

        {/* Card */}
        <div style={{ background: '#161b26', border: '1px solid #2a2f3d' }} className="rounded-xl overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: 'easeInOut' }}
            >

              {/* ── Forgot Password Sent ── */}
              {mode === 'forgot_sent' && (
                <div className="p-7 text-center space-y-4">
                  <CheckCircle className="w-11 h-11 text-blue-400 mx-auto" />
                  <h2 className="text-lg font-bold text-white">Reset link sent</h2>
                  <p className="text-sm text-white/40">
                    If an account exists for <strong className="text-white/70">{formData.email}</strong>, you'll receive a reset link shortly.
                  </p>
                  <button
                    onClick={() => switchMode('login')}
                    className="w-full py-2.5 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              )}

              {/* ── Forgot Password Form ── */}
              {mode === 'forgot' && (
                <div className="p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-white">Forgot your password?</h2>
                    <p className="text-xs text-white/40 mt-1">Enter your email and we'll send you a reset link.</p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className={labelClass}>Email</label>
                      <input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} disabled={loading} className={inputClass} autoFocus />
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full py-2.5 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors">
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <button type="button" onClick={() => switchMode('login')} disabled={loading} className="w-full py-2 rounded-md text-sm text-white/40 hover:text-white/70 transition-colors">
                      Back to Sign In
                    </button>
                  </form>
                </div>
              )}

              {/* ── Login / Signup Tabs ── */}
              {(mode === 'login' || mode === 'signup') && (
                <>
                  {/* Tab bar */}
                  <div className="flex" style={{ borderBottom: '1px solid #2a2f3d' }}>
                    {['login', 'signup'].map((tab) => {
                      const active = mode === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => switchMode(tab)}
                          className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${active ? 'text-white' : 'text-white/35 hover:text-white/60'}`}
                        >
                          {tab === 'login' ? 'Sign in' : 'Create account'}
                          {active && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-6">

                    {/* ── Sign In ── */}
                    {mode === 'login' && (
                      <form onSubmit={handleLogin} className="space-y-3.5">
                        <div>
                          <label className={labelClass}>Email</label>
                          <input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} disabled={loading} className={inputClass} autoFocus />
                        </div>
                        <div>
                          <label className={labelClass}>Password</label>
                          <PasswordInput name="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} disabled={loading} show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                          <div className="flex justify-end mt-1.5">
                            <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                              Forgot password?
                            </button>
                          </div>
                        </div>
                        {error && <p className="text-xs text-red-400">{error}</p>}
                        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors mt-1">
                          {loading ? 'Signing in...' : 'Sign in'}
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3 py-1">
                          <div className="flex-1 h-px" style={{ background: '#2a2f3d' }} />
                          <span className="text-xs text-white/25">or continue with</span>
                          <div className="flex-1 h-px" style={{ background: '#2a2f3d' }} />
                        </div>

                        {/* OAuth buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled
                            className="flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-white/60 transition-colors cursor-not-allowed"
                            style={{ border: '1px solid #2a2f3d', background: '#0e1016' }}
                            title="Google sign-in coming soon"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                          </button>
                          <button
                            type="button"
                            disabled
                            className="flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-white/60 transition-colors cursor-not-allowed"
                            style={{ border: '1px solid #2a2f3d', background: '#0e1016' }}
                            title="Apple sign-in coming soon"
                          >
                            <svg className="w-4 h-4 fill-white/60" viewBox="0 0 24 24">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                            </svg>
                            Apple
                          </button>
                        </div>
                      </form>
                    )}

                    {/* ── Create Account ── */}
                    {mode === 'signup' && (
                      <form onSubmit={handleSignup} className="space-y-3">
                        {/* Trial banner */}
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-md text-xs font-medium text-green-400" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                          <Gift className="w-4 h-4 shrink-0" />
                          Start free — 3 days on us, no credit card needed
                        </div>

                        <div>
                          <label className={labelClass}>Company name</label>
                          <input type="text" name="companyName" placeholder="Your trucking company name" value={formData.companyName} onChange={handleChange} disabled={loading} className={inputClass} autoFocus />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={labelClass}>First name</label>
                            <input type="text" name="firstName" placeholder="First name" value={formData.firstName} onChange={handleChange} disabled={loading} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Last name</label>
                            <input type="text" name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleChange} disabled={loading} className={inputClass} />
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Email</label>
                          <input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} disabled={loading} className={inputClass} />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={labelClass}>Password</label>
                            <PasswordInput name="password" placeholder="Min 8 characters" value={formData.password} onChange={handleChange} disabled={loading} show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                          </div>
                          <div>
                            <label className={labelClass}>Confirm password</label>
                            <PasswordInput name="confirmPassword" placeholder="Repeat password" value={formData.confirmPassword} onChange={handleChange} disabled={loading} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} />
                          </div>
                        </div>

                        {error && <p className="text-xs text-red-400">{error}</p>}
                        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-md text-sm font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white transition-colors mt-1">
                          {loading ? 'Creating account...' : 'Create account'}
                        </button>
                      </form>
                    )}
                  </div>
                </>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center space-y-2">
          {mode === 'signup' ? (
            <p className="text-xs text-white/30">
              Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="text-blue-400 hover:text-blue-300 transition-colors underline">
                Sign in
              </button>
            </p>
          ) : (
            <p className="text-xs text-white/30">
              New customer?{' '}
              <a href="/pricing" className="text-blue-400/70 hover:text-blue-400 underline transition-colors">View Plans</a>
            </p>
          )}

          {onShowTour && (
            <button onClick={onShowTour} className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors mx-auto">
              <PlayCircle className="w-3.5 h-3.5" />
              View App Tour
            </button>
          )}
        </div>

      </div>
    </div>
  );
}