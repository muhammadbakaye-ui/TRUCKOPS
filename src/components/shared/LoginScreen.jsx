import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSession } from './AppSession';
import { Shield, User, Loader2, Eye, EyeOff, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from './Logo';
import PreLoginSlideshow from '../tutorial/PreLoginSlideshow';
import AdminAuthOptions from './AdminAuthOptions.jsx';

const ADMIN_GATE_USERNAME = 'administrator';
const ADMIN_GATE_PASSWORD = 'Enow2018#';

export default function LoginScreen() {
  const { login } = useSession();
  const [mode, setMode] = useState('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('truckops_slideshow_seen');
    if (!seen) setShowSlideshow(true);
  }, []);

  const closeSlideshow = () => {
    localStorage.setItem('truckops_slideshow_seen', '1');
    setShowSlideshow(false);
  };

  const switchMode = (m) => { setMode(m); setError(''); setUsername(''); setPassword(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'admin') {
        // Hardcoded gate check
        if (username === ADMIN_GATE_USERNAME && password === ADMIN_GATE_PASSWORD) {
          setShowAdminAuth(true);
        } else {
          setError('Invalid username or password.');
        }
      } else {
        // Driver login
        const [drivers, trucks] = await Promise.all([
          base44.entities.Driver.list('-created_date', 500),
          base44.entities.Truck.list('-created_date', 500),
        ]);
        const truckMap = {};
        trucks.forEach(t => { truckMap[t.id] = t.unit_number; });

        const found = drivers.find(d => {
          const nameMatch = d.full_name?.toLowerCase().trim() === username.toLowerCase().trim();
          const unitNumber = truckMap[d.assigned_truck_id] || d.assigned_truck_id || '';
          const truckMatch = unitNumber.toLowerCase().trim() === password.toLowerCase().trim();
          return nameMatch && truckMatch;
        });
        if (found) {
          const unitNumber = truckMap[found.assigned_truck_id] || found.assigned_truck_id || '';
          login({ role: 'driver', driver_id: found.id, driver_name: found.full_name, truck_number: unitNumber });
        } else {
          setError('Driver not found. Check your full name and Truck ID.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (showAdminAuth) {
    return <AdminAuthOptions
      onBack={() => { setShowAdminAuth(false); setUsername(''); setPassword(''); }}
      onSuccess={(adminId, adminName, extra = {}) => {
        login({ role: 'admin', admin_id: adminId, admin_name: adminName, ...extra });
      }}
    />;
  }

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      {showSlideshow && <PreLoginSlideshow onClose={closeSlideshow} />}
      <div className="w-full max-w-sm">
        <Logo className="mb-8" showCompanyName={true} />

        <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Mode tabs */}
          <div className="flex">
            <button
              type="button"
              onClick={() => switchMode('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all ${
                mode === 'admin'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Shield className="w-4 h-4" /> Admin
            </button>
            <button
              type="button"
              onClick={() => switchMode('driver')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all ${
                mode === 'driver'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <User className="w-4 h-4" /> Driver
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <Label className="text-sm font-medium">{mode === 'admin' ? 'Username' : 'Full Name'}</Label>
              <Input
                className="mt-1.5 h-11"
                placeholder={mode === 'admin' ? 'Enter username' : 'Enter your full name'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-sm font-medium">{mode === 'admin' ? 'Password' : 'Truck ID / Unit #'}</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPass ? 'text' : 'password'}
                  className="h-11 pr-10"
                  placeholder={mode === 'admin' ? 'Enter password' : 'Enter your truck ID'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              className="w-full h-11 font-semibold text-sm mt-2"
              disabled={loading || !username || !password}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-sidebar-foreground/30 mt-6">
          {mode === 'driver' ? 'Contact your dispatcher for login credentials.' : ''}
        </p>

        {mode === 'admin' && (
          <p className="text-center text-xs text-sidebar-foreground/40 mt-2">
            Don't have an account?{' '}
            <a href="/pricing" className="text-primary/70 hover:text-primary underline transition-colors">
              Start free trial
            </a>
          </p>
        )}

        <div className="flex justify-center mt-4">
          <button
            onClick={() => setShowSlideshow(true)}
            className="flex items-center gap-1.5 text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            View App Tour
          </button>
        </div>
      </div>
    </div>
  );
}