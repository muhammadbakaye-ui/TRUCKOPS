import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Logo from './Logo';

export default function AdminAuthOptions({ onBack, onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Email and password required');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('authAdmin', {
        action: 'login',
        email: formData.email,
        password: formData.password
      });

      if (response.data.success) {
        onSuccess(response.data.admin_id, response.data.admin_name);
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.password || !formData.confirmPassword) {
      setError('All fields required');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('authAdmin', {
        action: 'create_admin',
        first_name: formData.firstName,
        last_name: formData.lastName,
        password: formData.password
      });

      if (response.data.success) {
        onSuccess(response.data.admin_id, response.data.admin_name);
      } else {
        setError(response.data.message || 'Sign up failed');
      }
    } catch (err) {
      setError('Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-sidebar">
      <div className="w-full max-w-md px-6">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <Logo showCompanyName={true} />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white text-foreground hover:bg-muted'
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin Login
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === 'signup'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white text-foreground hover:bg-muted'
              }`}
            >
              <User className="w-4 h-4" />
              Sign Up
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {/* Login Mode */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  className="w-full"
                  disabled={loading}
                >
                  Back
                </Button>
              </form>
            )}

            {/* Signup Mode */}
            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">First Name</label>
                  <Input
                    type="text"
                    name="firstName"
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Last Name</label>
                  <Input
                    type="text"
                    name="lastName"
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  className="w-full"
                  disabled={loading}
                >
                  Back
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}