import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useHasSubscription } from '../components/shared/SubscriptionGate';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Link, RefreshCw, QrCode, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import SearchInput from '../components/shared/SearchInput';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import { logAudit } from '../components/shared/AuditLogger';
import { QRCodeSVG } from 'qrcode.react';

function DriverFormDialog({ open, onClose, editing, trucks, onSave, saving }) {
  const [form, setForm] = useState({});

  React.useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { status: 'active', pay_type: 'percentage' });
  }, [open, editing]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Driver' : 'New Driver'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 py-3">
            <div className="col-span-2">
              <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
              <Input value={form.full_name || ''} onChange={e => set('full_name', e.target.value)} className="h-8 text-xs mt-1" required />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">CDL Number</Label>
              <Input value={form.cdl_number || ''} onChange={e => set('cdl_number', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Assigned Truck</Label>
              <Select value={form.assigned_truck_id || ''} onValueChange={v => set('assigned_truck_id', v || null)}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.unit_number}{t.make ? ` — ${t.make}` : ''}{t.model ? ` ${t.model}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={form.address || ''} onChange={e => set('address', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city || ''} onChange={e => set('city', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={form.state || ''} onChange={e => set('state', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">ZIP</Label>
              <Input value={form.zip || ''} onChange={e => set('zip', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Pay Type</Label>
              <Select value={form.pay_type || 'percentage'} onValueChange={v => set('pay_type', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="per_mile">Per Mile</SelectItem>
                  <SelectItem value="flat_rate">Flat Rate</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Pay Rate</Label>
              <Input type="number" step="0.01" value={form.pay_rate || ''} onChange={e => set('pay_rate', Number(e.target.value))} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">YTD Gross Legacy</Label>
              <Input type="number" step="0.01" value={form.ytd_gross_legacy || ''} onChange={e => set('ytd_gross_legacy', Number(e.target.value))} className="h-8 text-xs mt-1" placeholder="e.g., 24462.38" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status || 'active'} onValueChange={v => set('status', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-20" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DriverQRModal({ driver, url, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const smsLink = `sms:${driver.phone?.replace(/\D/g, '') || ''}?body=${encodeURIComponent(`Hi ${driver.full_name}, here's your TruckOps driver portal link: ${url}`)}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Portal Access — {driver.full_name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="p-3 bg-white rounded-xl border shadow-sm">
            <QRCodeSVG value={url} size={200} level="M" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Driver scans this QR code on their phone to open their portal — no login needed.
          </p>
          <div className="w-full space-y-2">
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-input bg-background text-xs font-medium hover:bg-muted transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            {driver.phone && (
              <a
                href={smsLink}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                📱 Send via SMS
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Drivers() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [generatingToken, setGeneratingToken] = useState(null);
  const [qrDriver, setQrDriver] = useState(null); // { driver, url }
  const queryClient = useQueryClient();
  const hasSubscription = useHasSubscription();
  const navigate = useNavigate();

  const requireSubscription = () => {
    if (!hasSubscription) {
      toast.error('Subscribe to create and edit data. Redirecting to plans...', { duration: 3000 });
      setTimeout(() => navigate('/pricing'), 1500);
      return false;
    }
    return true;
  };

  const handleShowPortalQR = async (driver, e) => {
    e.stopPropagation();
    if (!driver.portal_token) {
      setGeneratingToken(driver.id);
      try {
        const res = await base44.functions.invoke('generateDriverToken', { driver_id: driver.id });
        const token = res.data.token;
        const url = `${window.location.origin}/DriverPublicPortal?token=${token}`;
        queryClient.invalidateQueries({ queryKey: ['drivers'] });
        setQrDriver({ driver: { ...driver, portal_token: token }, url });
      } catch (err) {
        toast.error('Failed to generate link');
      } finally {
        setGeneratingToken(null);
      }
    } else {
      const url = `${window.location.origin}/DriverPublicPortal?token=${driver.portal_token}`;
      setQrDriver({ driver, url });
    }
  };

  const handleRegenerateToken = async (driver, e) => {
    e.stopPropagation();
    setGeneratingToken(driver.id);
    try {
      const res = await base44.functions.invoke('generateDriverToken', { driver_id: driver.id });
      const token = res.data.token;
      const url = `${window.location.origin}/DriverPublicPortal?token=${token}`;
      await navigator.clipboard.writeText(url);
      toast.success('New portal link generated & copied!');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    } catch (err) {
      toast.error('Failed to regenerate link');
    } finally {
      setGeneratingToken(null);
    }
  };

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 200),
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => base44.entities.Truck.filter({ status: 'active' }, 'unit_number', 200),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let driverId;
      if (editing) {
        await base44.entities.Driver.update(editing.id, data);
        driverId = editing.id;
        await logAudit({ action_type: 'update', entity_type: 'Driver', entity_id: editing.id, entity_label: data.full_name });
      } else {
        const created = await base44.entities.Driver.create(data);
        driverId = created.id;
        await logAudit({ action_type: 'create', entity_type: 'Driver', entity_label: data.full_name });
      }

      // Sync truck's assigned_driver_id
      const prevTruckId = editing?.assigned_truck_id;
      if (prevTruckId && prevTruckId !== data.assigned_truck_id) {
        await base44.entities.Truck.update(prevTruckId, { assigned_driver_id: null });
      }
      if (data.assigned_truck_id) {
        await base44.entities.Truck.update(data.assigned_truck_id, { assigned_driver_id: driverId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setDialogOpen(false);
      setEditing(null);
    }
  });

  const filtered = drivers.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [d.full_name, d.phone, d.email, d.cdl_number, d.city]
      .some(v => v && v.toLowerCase().includes(q));
  });

  const columns = [
    { header: 'Name', render: (r) => <span className="font-medium">{r.full_name}</span> },
    { header: 'Phone', accessor: 'phone' },
    { header: 'CDL', accessor: 'cdl_number' },
    { header: 'Truck', render: (r) => {
      const t = trucks.find(t => t.id === r.assigned_truck_id);
      return t ? <span className="font-mono text-xs">{t.unit_number}</span> : <span className="text-muted-foreground text-xs">—</span>;
    }},
    { header: 'Pay Type', render: (r) => r.pay_type ? r.pay_type.replace(/_/g, ' ') : '—' },
    { header: 'Pay Rate', render: (r) => r.pay_rate || '—' },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { header: 'Portal Link', render: (r) => (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <Button
          variant="outline" size="sm"
          className="h-7 text-[11px] gap-1 px-2"
          onClick={(e) => handleShowPortalQR(r, e)}
          disabled={generatingToken === r.id}
          title={r.portal_token ? 'Show QR & share portal link' : 'Generate portal link'}
        >
          {generatingToken === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />}
          {r.portal_token ? 'Share' : 'Get Link'}
        </Button>
        {r.portal_token && (
          <Button
            variant="ghost" size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => handleRegenerateToken(r, e)}
            disabled={generatingToken === r.id}
            title="Regenerate link (invalidates old link)"
          >
            <RefreshCw className="w-3 h-3 text-muted-foreground" />
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="p-4">
      <PageHeader
        title="Drivers"
        description={`${drivers.length} total drivers`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { if (!requireSubscription()) return; setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Driver
          </Button>
        }
      />
      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search drivers..." className="w-72" />
      </div>
      <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={(row) => { if (!requireSubscription()) return; setEditing(row); setDialogOpen(true); }} emptyMessage="No drivers found" />
      {qrDriver && (
        <DriverQRModal
          driver={qrDriver.driver}
          url={qrDriver.url}
          onClose={() => setQrDriver(null)}
        />
      )}
      <DriverFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        editing={editing}
        trucks={trucks}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}