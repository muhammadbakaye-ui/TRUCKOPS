import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MobileSelect from '@/components/ui/MobileSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, AlertTriangle, Pencil, Paperclip, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import SearchInput from '@/components/shared/SearchInput';

const VIOLATION_TYPES = [
  { value: 'speeding', label: 'Speeding' },
  { value: 'logbook', label: 'Logbook' },
  { value: 'inspection_failure', label: 'Inspection Failure' },
  { value: 'accident', label: 'Accident' },
  { value: 'seatbelt', label: 'Seatbelt' },
  { value: 'hours_of_service', label: 'Hours of Service' },
  { value: 'reckless_driving', label: 'Reckless Driving' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_STYLES = {
  minor: 'text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20',
  major: 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20',
  critical: 'text-white border-red-700 bg-red-700 dark:bg-red-800',
};

function ViolationDialog({ open, onClose, editing, drivers, tenantId, onSave, saving }) {
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { date: new Date().toISOString().split('T')[0], severity: 'minor', follow_up_required: false });
  }, [open, editing]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('file_url', file_url);
      toast.success('Document attached');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const valid = form.driver_id && form.date && form.violation_type;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? 'Edit Violation' : 'Add Violation'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label className="text-xs">Driver <span className="text-destructive">*</span></Label>
            <MobileSelect
              value={form.driver_id || ''}
              onValueChange={v => { const d = drivers.find(d => d.id === v); set('driver_id', v); set('driver_name', d?.full_name || ''); }}
              triggerClassName="h-8 text-xs mt-1 w-full border border-input rounded-md px-2 bg-background"
              options={drivers.map(d => ({ value: d.id, label: d.full_name }))}
            />
          </div>
          <div>
            <Label className="text-xs">Date of Violation <span className="text-destructive">*</span></Label>
            <Input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Violation Type <span className="text-destructive">*</span></Label>
            <MobileSelect
              value={form.violation_type || ''}
              onValueChange={v => set('violation_type', v)}
              triggerClassName="h-8 text-xs mt-1 w-full border border-input rounded-md px-2 bg-background"
              options={VIOLATION_TYPES}
            />
          </div>
          <div>
            <Label className="text-xs">Severity <span className="text-destructive">*</span></Label>
            <MobileSelect
              value={form.severity || 'minor'}
              onValueChange={v => set('severity', v)}
              triggerClassName="h-8 text-xs mt-1 w-full border border-input rounded-md px-2 bg-background"
              options={[
                { value: 'minor', label: 'Minor' },
                { value: 'major', label: 'Major' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
          </div>
          <div>
            <Label className="text-xs">Reported By</Label>
            <Input value={form.reported_by || ''} onChange={e => set('reported_by', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} className="text-xs mt-1 h-16" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Action Taken</Label>
            <Textarea value={form.action_taken || ''} onChange={e => set('action_taken', e.target.value)} className="text-xs mt-1 h-14" />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Label className="text-xs">Follow Up Required</Label>
            <Switch checked={!!form.follow_up_required} onCheckedChange={v => set('follow_up_required', v)} />
          </div>
          {form.follow_up_required && (
            <div>
              <Label className="text-xs">Follow Up Date</Label>
              <Input type="date" value={form.follow_up_date || ''} onChange={e => set('follow_up_date', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
          )}
          <div className="col-span-2">
            <Label className="text-xs">Document (ticket, notice, report)</Label>
            <div className="flex items-center gap-2 mt-1">
              {form.file_url && <a href={form.file_url} target="_blank" rel="noopener noreferrer"><Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary px-2"><ExternalLink className="w-3 h-3" /> View</Button></a>}
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1 pointer-events-none" disabled={uploading} asChild>
                  <span>{uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />} {form.file_url ? 'Replace' : 'Upload'}</span>
                </Button>
              </label>
            </div>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-12" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving || !valid} onClick={() => onSave({ ...form, pending_review: false })}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DriverViolations() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [driverFilter, setDriverFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', tenantId],
    queryFn: () => tenantId ? base44.entities.Driver.filter({ tenant_id: tenantId }, 'full_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: violations = [], isLoading } = useQuery({
    queryKey: ['violations', tenantId],
    queryFn: () => tenantId ? base44.entities.DriverViolation.filter({ tenant_id: tenantId }, '-date', 500) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.DriverViolation.update(editing.id, data)
      : base44.entities.DriverViolation.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['violations'] }); setDialogOpen(false); setEditing(null); toast.success('Saved'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverViolation.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['violations'] }); toast.success('Deleted'); },
  });

  const filtered = violations.filter(v => {
    if (search && !v.driver_name?.toLowerCase().includes(search.toLowerCase()) && !v.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (driverFilter !== 'all' && v.driver_id !== driverFilter) return false;
    if (severityFilter !== 'all' && v.severity !== severityFilter) return false;
    if (dateFrom && v.date < dateFrom) return false;
    if (dateTo && v.date > dateTo) return false;
    return true;
  });

  const openDialog = (rec = null) => { setEditing(rec); setDialogOpen(true); };

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Driver Violations"
        description={`${violations.length} total violations`}
        actions={<Button size="sm" className="h-8 text-xs gap-1" onClick={() => openDialog()}><Plus className="w-3.5 h-3.5" /> Add Violation</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search..." className="w-56" />
        <MobileSelect
          value={driverFilter}
          onValueChange={setDriverFilter}
          triggerClassName="h-8 text-xs w-44 border border-input rounded-md px-2 bg-background"
          options={[
            { value: 'all', label: 'All Drivers' },
            ...drivers.map(d => ({ value: d.id, label: d.full_name }))
          ]}
        />
        <MobileSelect
          value={severityFilter}
          onValueChange={setSeverityFilter}
          triggerClassName="h-8 text-xs w-32 border border-input rounded-md px-2 bg-background"
          options={[
            { value: 'all', label: 'All Severity' },
            { value: 'minor', label: 'Minor' },
            { value: 'major', label: 'Major' },
            { value: 'critical', label: 'Critical' },
          ]}
        />
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No violations found.</p>
          <Button size="sm" className="mt-4 gap-1" onClick={() => openDialog()}><Plus className="w-3.5 h-3.5" /> Add First Violation</Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-xs min-w-[800px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Driver</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Severity</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Reported By</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Follow Up</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Doc</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">{v.date}</td>
                  <td className="px-4 py-3 font-medium">{v.driver_name}</td>
                  <td className="px-4 py-3 capitalize">{v.violation_type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-[10px] ${SEVERITY_STYLES[v.severity] || ''}`}>
                      {v.severity ? v.severity.charAt(0).toUpperCase() + v.severity.slice(1) : '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{v.reported_by || '—'}</td>
                  <td className="px-4 py-3">
                    {v.follow_up_required
                      ? <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300 bg-orange-50">{v.follow_up_date || 'Required'}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {v.file_url
                      ? <a href={v.file_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Paperclip className="w-3 h-3" /></Button></a>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openDialog(v)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Violation?</AlertDialogTitle><AlertDialogDescription>This record will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(v.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ViolationDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} editing={editing} drivers={drivers} tenantId={tenantId} onSave={d => saveMutation.mutate(d)} saving={saveMutation.isPending} />
    </div>
  );
}