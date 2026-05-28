import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Save, Trash2, LogOut } from 'lucide-react';
import { useSession } from '../components/shared/AppSession';
import BillingTab from '../components/settings/BillingTab';
import PageHeader from '../components/shared/PageHeader';
import AccountCustomization from '../components/settings/AccountCustomization';
import GeneralSettings from '../components/settings/GeneralSettings';
import { toast } from 'sonner';
import { formatPhone } from '../utils/phoneFormatter';

export default function SettingsPage() {
  const { logout, session, login } = useSession();
  const [form, setForm] = useState({
    company_name: '', address_1: '', address_2: '', city: '', state: '', zip: '',
    phone: '', email: '', mc_number: '', dot_number: '',
  });
  const [activeTab, setActiveTab] = useState('general');

  const tenantId = session?.tenant_id;

  const { data: companies = [], isLoading, refetch } = useQuery({
    queryKey: ['settings-company', tenantId],
    queryFn: () => tenantId
      ? base44.entities.Company.filter({ tenant_id: tenantId }, '-created_date', 200).then(async all => {
          const owned = all.find(c => c.is_owner_profile || c.company_type === 'owner_operator' || c.company_type === 'carrier');
          if (owned && !owned.is_owner_profile) {
            base44.entities.Company.update(owned.id, { is_owner_profile: true, company_type: 'owner_operator' }).catch(() => {});
          }
          return owned ? [{ ...owned, is_owner_profile: true, company_type: 'owner_operator' }] : [];
        })
      : Promise.resolve([]),
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (tenantId) refetch();
  }, [tenantId, refetch]);

  useEffect(() => {
    if (isLoading) return;
    if (companies.length > 0) {
      const c = companies[0];
      setForm(prev => ({
        ...prev,
        company_name: c.company_name || '',
        address_1: c.address_1 || '',
        address_2: c.address_2 || '',
        city: c.city || '',
        state: c.state || '',
        zip: c.zip || '',
        phone: c.phone || '',
        email: c.email || '',
        mc_number: c.mc_number || '',
        dot_number: c.dot_number || '',
      }));
    }
  }, [companies, isLoading]);

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        company_name: form.company_name,
        company_type: 'owner_operator',
        is_owner_profile: true,
        tenant_id: tenantId,
        address_1: form.address_1,
        address_2: form.address_2,
        city: form.city,
        state: form.state,
        zip: form.zip,
        phone: form.phone,
        email: form.email,
        mc_number: form.mc_number,
        dot_number: form.dot_number,
      };
      if (companies.length > 0) {
        return base44.entities.Company.update(companies[0].id, payload);
      } else {
        return base44.entities.Company.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-company', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['companies', tenantId] });
      refetch();
      if (session) login({ ...session, company_name: form.company_name || '' });
      toast.success('Settings saved');
    },
  });

  const set = (key, val) => {
    const finalVal = key === 'phone' ? formatPhone(val) : val;
    setForm(prev => ({ ...prev, [key]: finalVal }));
  };

  return (
    <div className="p-4 max-w-2xl">
      <PageHeader title="Settings" description="Carrier / company information" />

      <div className="flex gap-2 mt-4 border-b">
         <button
           onClick={() => setActiveTab('general')}
           className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
             activeTab === 'general'
               ? 'border-primary text-primary'
               : 'border-transparent text-muted-foreground hover:text-foreground'
           }`}
         >
           General
         </button>
         <button
           onClick={() => setActiveTab('account')}
           className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
             activeTab === 'account'
               ? 'border-primary text-primary'
               : 'border-transparent text-muted-foreground hover:text-foreground'
           }`}
         >
           Account
         </button>
         <button
           onClick={() => setActiveTab('company')}
           className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
             activeTab === 'company'
               ? 'border-primary text-primary'
               : 'border-transparent text-muted-foreground hover:text-foreground'
           }`}
         >
           Company
         </button>
         <button
           onClick={() => setActiveTab('billing')}
           className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
             activeTab === 'billing'
               ? 'border-primary text-primary'
               : 'border-transparent text-muted-foreground hover:text-foreground'
           }`}
         >
           Billing
         </button>
       </div>

      <div className="space-y-4 mt-4">
         {activeTab === 'general' && <GeneralSettings />}
         {activeTab === 'account' && <AccountCustomization />}

         {activeTab === 'company' && (
          <>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Company Name</Label>
                <Input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">MC Number</Label>
                <Input value={form.mc_number} onChange={(e) => set('mc_number', e.target.value)} className="h-8 text-xs mt-1" placeholder="MC-123456" />
              </div>
              <div>
                <Label className="text-xs">DOT Number</Label>
                <Input value={form.dot_number} onChange={(e) => set('dot_number', e.target.value)} className="h-8 text-xs mt-1" placeholder="1234567" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="h-8 text-xs mt-1" placeholder="(123)-456-7890" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={form.email} onChange={(e) => set('email', e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Address</Label>
                <Input value={form.address_1} onChange={(e) => set('address_1', e.target.value)} className="h-8 text-xs mt-1" placeholder="Street address" />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">State</Label>
                  <Input value={form.state} onChange={(e) => set('state', e.target.value)} className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">ZIP</Label>
                  <Input value={form.zip} onChange={(e) => set('zip', e.target.value)} className="h-8 text-xs mt-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button size="sm" className="gap-1" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Settings
        </Button>
          </>
        )}

        {activeTab === 'billing' && <BillingTab />}

        {activeTab === 'account' && (
          <Card className="border-destructive/40">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-3">Manage account-level actions. These cannot be undone.</p>

              {/* Sign out all devices */}
              <div className="mb-4">
                <p className="text-xs font-medium mb-1">Sign Out All Devices</p>
                <p className="text-xs text-muted-foreground mb-2">This will immediately end all active sessions across every device.</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
                      <LogOut className="w-3.5 h-3.5" /> Sign Out All Devices
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sign Out All Devices</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will sign you out from all devices and active sessions immediately. You will need to log back in on each device.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => {
                        logout();
                        window.location.href = '/';
                      }}
                      >
                      Sign Out All Devices
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs font-medium mb-1">Delete Account</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to permanently delete your account? All your data will be lost and this cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => {
                        // Clears local session — user must contact support for full data deletion
                        logout();
                        window.location.href = '/';
                      }}
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}