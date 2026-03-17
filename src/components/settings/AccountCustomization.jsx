import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountCustomization() {
  const [accountForm, setAccountForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-admin-user'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user;
    },
  });

  useEffect(() => {
    if (currentUser) {
      // Split full_name from auth into first and last name
      const [firstName = '', lastName = ''] = (currentUser.full_name || '').split(' ');
      
      // Fetch the admin record to get phone and email
       const fetchAdminData = async () => {
         try {
           const admins = await base44.entities.Admin.filter({ email: currentUser.email });
           if (admins.length > 0) {
             const admin = admins[0];
             setAccountForm({
               first_name: admin.first_name || firstName || '',
               last_name: admin.last_name || lastName || '',
               phone: admin.phone || '',
               email: admin.email || currentUser.email || '',
             });
           } else {
             // If no admin record exists, use auth data
             setAccountForm({
               first_name: firstName,
               last_name: lastName,
               phone: '',
               email: currentUser.email || '',
             });
           }
         } catch (error) {
           console.error('Error fetching admin data:', error);
           // Fallback to auth data
           setAccountForm({
             first_name: firstName,
             last_name: lastName,
             phone: '',
             email: currentUser.email || '',
           });
         }
       };
       fetchAdminData();
    }
  }, [currentUser]);

  const updateAccountMutation = useMutation({
    mutationFn: async (data) => {
      const fullName = `${data.first_name} ${data.last_name}`.trim();
      const updateData = {
        full_name: fullName,
      };
      if (data.phone) updateData.phone = data.phone;
      await base44.auth.updateMe(updateData);
      
      // Update the Admin entity
       const admins = await base44.entities.Admin.filter({ email: currentUser?.email });
       if (admins.length > 0) {
         return base44.entities.Admin.update(admins[0].id, {
           first_name: data.first_name,
           last_name: data.last_name,
           email: data.email,
           phone: data.phone || '',
         });
       }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-admin-user'] });
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Account updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update account');
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('updateAdminPassword', {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      return response.data;
    },
    onSuccess: () => {
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswordForm(false);
      setPasswordError('');
      toast.success('Password changed successfully');
    },
    onError: (error) => {
      setPasswordError(error.response?.data?.error || 'Failed to change password');
      toast.error('Failed to change password');
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
    if (passwordForm.new_password.length < 6) {
      setPasswordError('New password must be at least 6 characters');
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
                onChange={(e) => handleAccountChange('email', e.target.value)}
                className="h-8 text-xs mt-1"
                placeholder="your.email@company.com"
              />
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