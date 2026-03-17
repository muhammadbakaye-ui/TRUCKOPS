import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminMasterAuth({ onLoginSuccess }) {
  const [step, setStep] = useState('master'); // 'master', 'accountChoice', 'createAccount', 'login'
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPass, setShowMasterPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Account creation fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Admin list
  const [admins, setAdmins] = useState([]);

  const handleMasterAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await base44.functions.invoke('authAdmin', {
        action: 'verify_master',
        master_password: masterPassword,
      });
      if (response.data.success) {
        const adminList = await base44.functions.invoke('authAdmin', {
          action: 'list_admins',
        });
        setAdmins(adminList.data.admins || []);
        setStep('accountChoice');
      } else {
        setError('Invalid master password.');
      }
    } catch (err) {
      setError('Authentication failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (createPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (createPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const response = await base44.functions.invoke('authAdmin', {
        action: 'create_admin',
        first_name: firstName,
        last_name: lastName,
        password: createPassword,
      });
      if (response.data.success) {
        localStorage.setItem('adminId', response.data.admin_id);
        localStorage.setItem('adminName', `${firstName} ${lastName}`);
        toast.success('Account created successfully!');
        onLoginSuccess();
      } else {
        setError(response.data.message || 'Failed to create account.');
      }
    } catch (err) {
      setError('Account creation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const response = await base44.functions.invoke('authAdmin', {
        action: 'login',
        email: loginEmail,
        password: loginPassword,
      });
      if (response.data.success) {
        localStorage.setItem('adminId', response.data.admin_id);
        localStorage.setItem('adminName', response.data.admin_name);
        toast.success('Logged in successfully!');
        onLoginSuccess();
      } else {
        setError('Invalid email or password.');
      }
    } catch (err) {
      setError('Login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'master') {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="p-6 space-y-4">
              <h1 className="text-xl font-bold">Master Authentication</h1>
              <p className="text-sm text-muted-foreground">Enter the master password to continue</p>
              <form onSubmit={handleMasterAuth} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Master Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showMasterPass ? 'text' : 'password'}
                      className="h-11 pr-10"
                      placeholder="Enter master password"
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterPass(!showMasterPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showMasterPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold text-sm"
                  disabled={loading || !masterPassword}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'accountChoice') {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="p-6 space-y-4">
              <h1 className="text-xl font-bold">Account Options</h1>
              <p className="text-sm text-muted-foreground">Choose an action</p>
              <div className="space-y-3">
                <Button
                  onClick={() => setStep('createAccount')}
                  className="w-full h-11 font-semibold"
                >
                  Create New Account
                </Button>
                {admins.length > 0 && (
                  <Button
                    onClick={() => setStep('login')}
                    variant="outline"
                    className="w-full h-11 font-semibold"
                  >
                    Sign In with Existing Account
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setStep('master');
                    setMasterPassword('');
                    setError('');
                  }}
                  variant="ghost"
                  className="w-full h-11 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'createAccount') {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="p-6 space-y-4">
              <h1 className="text-xl font-bold">Create Account</h1>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">First Name</Label>
                  <Input
                    className="mt-1.5 h-11"
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Name</Label>
                  <Input
                    className="mt-1.5 h-11"
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showCreatePass ? 'text' : 'password'}
                      className="h-11 pr-10"
                      placeholder="Create password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePass(!showCreatePass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCreatePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Confirm Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showConfirmPass ? 'text' : 'password'}
                      className="h-11 pr-10"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold text-sm"
                  disabled={loading || !firstName || !lastName || !createPassword || !confirmPassword}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setStep('accountChoice');
                    setError('');
                    setFirstName('');
                    setLastName('');
                    setCreatePassword('');
                    setConfirmPassword('');
                  }}
                  variant="ghost"
                  className="w-full h-11 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'login') {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="p-6 space-y-4">
              <h1 className="text-xl font-bold">Sign In</h1>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <Input
                    type="email"
                    className="mt-1.5 h-11"
                    placeholder="Enter email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showLoginPass ? 'text' : 'password'}
                      className="h-11 pr-10"
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold text-sm"
                  disabled={loading || !loginEmail || !loginPassword}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setStep('accountChoice');
                    setError('');
                    setLoginEmail('');
                    setLoginPassword('');
                  }}
                  variant="ghost"
                  className="w-full h-11 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
}