import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const token = new URLSearchParams(window.location.search).get('token');

  if (!token) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
          <XCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Invalid Link</h2>
          <p className="text-sm text-muted-foreground">This password reset link is invalid or has expired.</p>
          <Button className="w-full" onClick={() => window.location.href = '/'}>Back to Sign In</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirm) { setError('Both fields are required'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const hash = await hashPassword(password);
      const res = await base44.functions.invoke('authAdmin', { action: 'reset_password_token', token, new_password_hash: hash });
      if (res.data.success) { setSuccess(true); }
      else { setError(res.data.message || 'Reset failed. The link may have expired.'); }
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Password Updated!</h2>
            <p className="text-sm text-muted-foreground">Your password has been reset successfully.</p>
            <Button className="w-full" onClick={() => window.location.href = '/'}>Go to Sign In</Button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-1">Set New Password</h2>
            <p className="text-sm text-muted-foreground mb-6">Choose a new password for your account.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm font-medium">New Password</Label>
                <div className="relative mt-1.5">
                  <Input type={showPass ? 'text' : 'password'} placeholder="At least 8 characters" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} disabled={loading} className="pr-10" autoFocus />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Confirm Password</Label>
                <Input type="password" placeholder="Confirm new password" value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }} disabled={loading} className="mt-1.5" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}