import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/shared/AppSession';

export default function AccountCustomization() {
  const { session } = useSession();
  const adminEmail = session?.admin_email || '';

  const [accountForm, setAccountForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: adminEmail,
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!adminEmail) return;
    const fetchAdminData = async () => {
      try {
        const admins = await base44.entities.Admin.filter({ email: adminEmail });
        if (admins.length > 0) {
          const admin = admins[0];
          setAccountForm({
            first_name: admin.first_name || '',
            last_name: admin.last_name || '',
            phone: admin.phone || '',
            email: admin.email || adminEmail,
          });
        } else {
          setAccountForm(prev => ({ ...prev, email: adminEmail }));
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setAccountForm(prev => ({ ...prev, email: adminEmail }));
      }
    };
    fetchAdminData();
  }, [adminEmail]);

  const updateAccountMutation = useMutation({
    mutationFn: async (data) => {
      const admins = await base44.entities.Admin.filter({ email: adminEmail });
      if (admins.length > 0) {
        return base44.entities.Admin.update(admins[0].id, {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || '',
        });
      }
      throw new Error('Admin account not found');
    },
    onSuccess: () => {
      toast.success('Account updated successfully');
    },
    onError: () => {
      toast.error('Failed to update account');
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('updateAdminPassword', {
        admin_email: accountForm.email,
        current_password: data.current_password,
        new_password: data.new_password,
        session_token: session?.session_token,
      });
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to change password');
      }
      return response.data;
    },
    onSuccess: () => {
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswordForm(false);
      setPasswordError('');
      toast.success('Password changed successfully');
    },
    onError: (error) => {
      setPasswordError(error.message || 'Failed to change password');
      toast.error(error.message || 'Failed to change password');
    },
  });

  const handleAccountChange = (field, value) => {
    setAccountForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    setPasswordError('');
  };

  const handleSaveAccount = () => {
    if (!accountForm.first_name.trim()) {
      toast.error('First name is required');
      return;
    }
    updateAccountMutation.mutate(accountForm);
  };

  const handleChangePassword = () => {
    if (!passwordForm.current_password) {
      setPasswordError('Current password is required');
      return;
    }
    if (!passwordForm.new_password) {
      setPasswordError('New password is required');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('Passwords do not match');
      return;
    }
    updatePasswordMutation.mutate(passwordForm);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input
                value={accountForm.first_name}
                onChange={(e) => handleAccountChange('first_name', e.target.value)}
                className="h-8 text-xs mt-1"
                placeholder="First name"
              />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input
                value={accountForm.last_name}
                onChange={(e) => handleAccountChange('last_name', e.target.value)}
                className="h-8 text-xs mt-1"
                placeholder="Last name"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Phone</Label>
              <Input
                value={accountForm.phone}
                onChange={(e) => handleAccountChange('phone', e.target.value)}
                className="h-8 text-xs mt-1"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={accountForm.email}
                readOnly
                disabled
                className="h-8 text-xs mt-1 opacity-60 cursor-not-allowed"
                title="Email cannot be changed. Contact support if you need to update your login email."
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here. Contact support to update.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        size="sm"
        className="gap-1"
        onClick={handleSaveAccount}
        disabled={updateAccountMutation.isPending}
      >
        {updateAccountMutation.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        Save Account
      </Button>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {!showPasswordForm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordForm(true)}
            >
              Change Password
            </Button>
          ) : (
            <div className="space-y-3">
              {passwordError && (
                <div className="flex gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}
              <div>
                <Label className="text-xs">Current Password</Label>
                <Input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                  className="h-8 text-xs mt-1"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <Label className="text-xs">New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                  className="h-8 text-xs mt-1"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label className="text-xs">Confirm Password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                  className="h-8 text-xs mt-1"
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={handleChangePassword}
                  disabled={updatePasswordMutation.isPending}
                >
                  {updatePasswordMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Update Password
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
                    setPasswordError('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}