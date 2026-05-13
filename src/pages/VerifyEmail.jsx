import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VerifyEmail() {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('Invalid verification link.'); return; }
    base44.functions.invoke('authAdmin', { action: 'verify_email', token })
      .then(res => {
        if (res.data.success) { setStatus('success'); setMessage(res.data.message); }
        else { setStatus('error'); setMessage(res.data.message || 'Verification failed.'); }
      })
      .catch(() => { setStatus('error'); setMessage('Something went wrong. Please try again.'); });
  }, []);

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full text-center space-y-4">
        {status === 'loading' && <><Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" /><p className="text-muted-foreground">Verifying your email...</p></>}
        {status === 'success' && <><CheckCircle className="w-12 h-12 text-green-500 mx-auto" /><h2 className="text-xl font-bold">Email Verified!</h2><p className="text-sm text-muted-foreground">{message}</p><Button className="w-full" onClick={() => window.location.href = '/'}>Go to Sign In</Button></>}
        {status === 'error' && <><XCircle className="w-12 h-12 text-destructive mx-auto" /><h2 className="text-xl font-bold">Verification Failed</h2><p className="text-sm text-muted-foreground">{message}</p><Button className="w-full" onClick={() => window.location.href = '/'}>Back to Sign In</Button></>}
      </div>
    </div>
  );
}