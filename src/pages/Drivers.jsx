import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePreviewGate, PreviewFeatureDialog } from '../components/shared/PreviewFeatureGate';
import { useSession } from '../components/shared/AppSession';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader as AlertDialogHeaderComponent, AlertDialogTitle as AlertDialogTitleComponent } from '@/components/ui/alert-dialog';
const AlertDialogFooter = AlertDialogFooterComponent;
const AlertDialogHeader = AlertDialogHeaderComponent;
const AlertDialogTitle = AlertDialogTitleComponent;
import { Loader2, Plus, RefreshCw, QrCode, Copy, Check, Trash2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import SearchInput from '../components/shared/SearchInput';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';

import { logAudit } from '../components/shared/AuditLogger';
import { QRCodeSVG } from 'qrcode.react';
import { usePagination } from '../hooks/usePagination';
import { useEntitySubscription } from '../hooks/useEntitySubscription';
import Paginator from '../components/shared/Paginator';

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
  const [qrDriver, setQrDriver] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { showDialog, setShowDialog, checkFeatureAccess, handleDismiss, navigate } = usePreviewGate();
  const isInPreview = session?.subscription_status !== 'active' && session?.subscription_status !== 'trialing';

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
    queryKey: ['drivers', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Driver.filter({ tenant_id: session.tenant_id }, '-created_date', 200) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Truck.filter({ tenant_id: session.tenant_id, status: 'active' }, 'unit_number', 200) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let driverId;
      const isNewDriver = !editing;
      if (editing) {
        await base44.entities.Driver.update(editing.id, data);
        driverId = editing.id;
        await logAudit({ action_type: 'update', entity_type: 'Driver', entity_id: editing.id, entity_label: data.full_name });
      } else {
        const created = await base44.entities.Driver.create({ ...data, tenant_id: session.tenant_id });
        driverId = created.id;
        await logAudit({ action_type: 'create', entity_type: 'Driver', entity_label: data.full_name });
      }
      const prevTruckId = editing?.assigned_truck_id;
      if (prevTruckId && prevTruckId !== data.assigned_truck_id) {
        await base44.entities.Truck.update(prevTruckId, { assigned_driver_id: null });
      }
      if (data.assigned_truck_id) {
        await base44.entities.Truck.update(data.assigned_truck_id, { assigned_driver_id: driverId });
      }
      return { isNewDriver };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setDialogOpen(false);
      setEditing(null);
      if (result.isNewDriver && isInPreview) {
        setShowDialog(true);
      }
    }
  });

  const filtered = drivers.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [d.full_name, d.phone, d.email, d.cdl_number, d.city]
      .some(v => v && v.toLowerCase().includes(q));
  });

  useEntitySubscription('Driver', ['drivers', session?.tenant_id], !!session?.tenant_id);

  const pagination = usePagination(filtered, 56, 'drivers_page');

  const deleteMutation = useMutation({
    mutationFn: async (driver) => {
      await base44.entities.Driver.delete(driver.id);
      await logAudit({ action_type: 'delete', entity_type: 'Driver', entity_id: driver.id, entity_label: driver.full_name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setDeleteTarget(null);
      toast.success('Driver deleted');
    }
  });

  const getPayRateDisplay = (driver) => {
    if (!driver.pay_rate) return '—';
    const typeMap = { percentage: 'pct', per_mile: 'mi', flat_rate: 'flat', custom: 'custom' };
    return `${driver.pay_rate} · ${typeMap[driver.pay_type] || driver.pay_type}`;
  };

  const getInitials = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    return (parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '');
  };

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
      <PreviewFeatureDialog open={showDialog} onSubscribe={() => navigate('/pricing')} onDismiss={handleDismiss} />
      
      {/* Desktop layout */}
      <div className="hidden md:block">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Drivers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{drivers.length} total drivers</p>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Driver
          </Button>
        </div>
        <div className="mb-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search drivers..." className="w-72" />
        </div>
        <DataTable columns={columns} data={pagination.paginatedItems} isLoading={isLoading} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} emptyMessage="No drivers found" />
        <Paginator {...pagination} itemLabel="drivers" />
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-primary mb-0.5">Drivers</h2>
          <p className="text-xs text-muted-foreground mb-3">{drivers.length} total driver{drivers.length !== 1 ? 's' : ''}</p>
          <SearchInput value={search} onChange={setSearch} placeholder="Search drivers..." className="w-full" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">No drivers found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((driver) => {
              const truck = trucks.find(t => t.id === driver.assigned_truck_id);
              return (
                <div
                  key={driver.id}
                  onClick={() => { setEditing(driver); setDialogOpen(true); }}
                  className="tap-card bg-card border border-border rounded-[10px] overflow-hidden box-border"
                >
                  {/* Row 1: Avatar + Name + Phone + Status */}
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <div className="flex-shrink-0 w-8.5 h-8.5 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{getInitials(driver.full_name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-primary">{driver.full_name}</p>
                      <p className="text-xs text-muted-foreground">{driver.phone || '—'}</p>
                    </div>
                    <div className={`text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap ${
                      driver.status === 'active' ? 'bg-green-500/10 text-green-600' :
                      driver.status === 'inactive' ? 'bg-orange-500/10 text-orange-600' :
                      driver.status === 'terminated' ? 'bg-red-500/10 text-red-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {driver.status?.charAt(0).toUpperCase() + driver.status?.slice(1)}
                    </div>
                  </div>

                  {/* Row 2: 3-column info grid */}
                  <div className="grid grid-cols-3 gap-1.5 px-3 py-2.5 border-t border-border/40">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3px] mb-0.5">CDL</p>
                      <p className="text-xs text-secondary-foreground">{driver.cdl_number || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3px] mb-0.5">Truck</p>
                      <p className="text-xs text-secondary-foreground">{truck ? truck.unit_number : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3px] mb-0.5">Pay</p>
                      <p className="text-xs text-secondary-foreground">{getPayRateDisplay(driver)}</p>
                    </div>
                  </div>

                  {/* Footer: Buttons + Delete */}
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/40">
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] gap-0.5 border-border bg-transparent text-primary rounded-[6px]"
                        onClick={(e) => { e.stopPropagation(); handleShowPortalQR(driver, e); }}
                        disabled={generatingToken === driver.id}
                      >
                        {generatingToken === driver.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Share2 className="w-2.5 h-2.5" />}
                        {driver.portal_token ? 'Share' : 'Portal'}
                      </Button>
                      {driver.portal_token && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] gap-0.5 border-border bg-transparent text-muted-foreground rounded-[6px]"
                          onClick={(e) => { e.stopPropagation(); handleRegenerateToken(driver, e); }}
                          disabled={generatingToken === driver.id}
                        >
                          {generatingToken === driver.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                          Regen
                        </Button>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(driver); }}
                      className="p-2.5 text-destructive hover:bg-destructive/10 rounded transition-colors w-10 h-10 flex items-center justify-center flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAB Button */}
        <button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="fixed right-4 bottom-20 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      {qrDriver && (
        <DriverQRModal
          driver={qrDriver.driver}
          url={qrDriver.url}
          onClose={() => setQrDriver(null)}
        />
      )}
      
      {/* Delete confirmation */}
      {deleteTarget && (
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Driver</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deleteTarget.full_name}</strong>? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate(deleteTarget)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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