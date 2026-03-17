import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLoginFlow({ onLoginSuccess }) {
  const [step, setStep] = useState('master'); // master, select, create, verify
  const [masterPassword, setMasterPassword] = useState('');
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirm, setNewConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMasterVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('authAdmin', {
        action: 'verify_master',
        master_password: masterPassword
      });
      setAdmins(res.data.admins || []);
      setStep(res.data.admins.length > 0 ? 'select' : 'create');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify password');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newFirst || !newLast || !newPassword || !newConfirm) {
      setError('All fields required');
      return;
    }
    if (newPassword !== newConfirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('authAdmin', {
        action: 'create_admin',
        master_password: masterPassword,
        first_name: newFirst,
        last_name: newLast,
        password: newPassword
      });
      toast.success(`Admin ${res.data.admin_name} created`);
      localStorage.setItem('adminId', res.data.admin_id);
      localStorage.setItem('adminName', res.data.admin_name);
      onLoginSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAdmin = () => {
    if (!selectedAdminId) {
      setError('Please select an admin');
      return;
    }
    setStep('verify');
  };

  const handleVerifyAdmin = async () => {
    if (!adminPassword) {
      setError('Password required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('authAdmin', {
        action: 'login_admin',
        admin_id: selectedAdminId,
        password: adminPassword
      });
      localStorage.setItem('adminId', res.data.admin_id);
      localStorage.setItem('adminName', res.data.admin_name);
      onLoginSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <Card className="w-full max-w-md">
        {step === 'master' && (
          <>
            <CardHeader>
              <CardTitle>Admin Login - Master Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <Label className="text-sm">Master Password</Label>
                <Input
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Enter master password"
                  className="mt-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleMasterVerify()}
                />
              </div>
              <Button onClick={handleMasterVerify} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Continue
              </Button>
            </CardContent>
          </>
        )}

        {step === 'select' && (
          <>
            <CardHeader>
              <CardTitle>Select Admin Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                {admins.map(admin => (
                  <label key={admin.id} className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="admin"
                      value={admin.id}
                      checked={selectedAdminId === admin.id}
                      onChange={(e) => setSelectedAdminId(e.target.value)}
                    />
                    <span className="text-sm font-medium">{admin.first_name} {admin.last_name}</span>
                  </label>
                ))}
              </div>
              <Button onClick={handleSelectAdmin} disabled={!selectedAdminId} className="w-full">
                Continue
              </Button>
              <Button variant="outline" onClick={() => setStep('create')} className="w-full">
                Create New Admin
              </Button>
            </CardContent>
          </>
        )}

        {step === 'create' && (
          <>
            <CardHeader>
              <CardTitle>Create Admin Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <Label className="text-sm">First Name</Label>
                <Input value={newFirst} onChange={(e) => setNewFirst(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Last Name</Label>
                <Input value={newLast} onChange={(e) => setNewLast(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Confirm Password</Label>
                <Input type="password" value={newConfirm} onChange={(e) => setNewConfirm(e.target.value)} className="mt-1" onKeyDown={(e) => e.key === 'Enter' && handleCreateAdmin()} />
              </div>
              <Button onClick={handleCreateAdmin} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Admin
              </Button>
              {admins.length > 0 && (
                <Button variant="outline" onClick={() => setStep('select')} className="w-full">
                  Back
                </Button>
              )}
            </CardContent>
          </>
        )}

        {step === 'verify' && (
          <>
            <CardHeader>
              <CardTitle>Verify Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <p className="text-sm text-slate-600">
                {admins.find(a => a.id === selectedAdminId)?.first_name} {admins.find(a => a.id === selectedAdminId)?.last_name}
              </p>
              <div>
                <Label className="text-sm">Password</Label>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter password"
                  className="mt-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyAdmin()}
                />
              </div>
              <Button onClick={handleVerifyAdmin} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Login
              </Button>
              <Button variant="outline" onClick={() => setStep('select')} className="w-full">
                Back
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}