import React, { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldCheck, Pencil, CheckCircle2, Paperclip, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import SearchInput from '@/components/shared/SearchInput';
import { differenceInDays, parseISO } from 'date-fns';

const ENDORSEMENT_OPTIONS = [
  { value: 'H', label: 'H – Hazmat' },
  { value: 'N', label: 'N – Tanker' },
  { value: 'T', label: 'T – Double/Triple' },
  { value: 'X', label: 'X – Tanker + Hazmat' },
  { value: 'P', label: 'P – Passenger' },
  { value: 'S', label: 'S – School Bus' },
];

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const days = differenceInDays(parseISO(dateStr), new Date());
  if (days < 0) return { label: 'Expired', className: 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/30 dark:text-red-400', days };
  if (days <= 60) return { label: `Expires in ${days}d`, className: 'text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/30', days };
  return { label: 'Valid', className: 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/30', days };
}

function UploadBtn({ url, label, uploading, onUpload, onView }) {
  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary px-2">
            <ExternalLink className="w-3 h-3" /> View
          </Button>
        </a>
      )}
      <label className="cursor-pointer">
        <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1 pointer-events-none" disabled={uploading} asChild>
          <span>{uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />} {url ? 'Replace' : 'Upload'} {label}</span>
        </Button>
      </label>
    </div>
  );
}

function QualDialog({ open, onClose, driver, qual, onSave, saving }) {
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState({});
  const [endorsements, setEndorsements] = useState([]);

  React.useEffect(() => {
    if (open) {
      const q = qual ? { ...qual } : { driver_id: driver?.id, driver_name: driver?.full_name };
      setForm(q);
      setEndorsements(q.endorsements ? q.endorsements.split(',').map(s => s.trim()).filter(Boolean) : []);
    }
  }, [open, qual, driver]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleEndorsement = (code) => {
    setEndorsements(prev => {
      const next = prev.includes(code) ? prev.filter(e => e !== code) : [...prev, code];
      setForm(p => ({ ...p, endorsements: next.join(', ') }));
      return next;
    });
  };

  const handleUpload = async (field, file) => {
    setUploading(u => ({ ...u, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set(field, file_url);
      toast.success('Document uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(u => ({ ...u, [field]: false })); }
  };

  const valid = !!form.driver_id;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Qualifications — {driver?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {/* CDL Info */}
          <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1 border-t">CDL Information</div>
          <div>
            <Label className="text-xs">CDL Class</Label>
            <MobileSelect
              value={form.cdl_class || ''}
              onValueChange={v => set('cdl_class', v)}
              triggerClassName="h-8 text-xs mt-1 w-full border border-input rounded-md px-2 bg-background"
              options={[
                { value: 'A', label: 'Class A' },
                { value: 'B', label: 'Class B' },
                { value: 'C', label: 'Class C' },
              ]}
            />
          </div>
          <div>
            <Label className="text-xs">CDL Number</Label>
            <Input value={form.cdl_number || ''} onChange={e => set('cdl_number', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">CDL Expiration Date</Label>
            <Input type="date" value={form.cdl_expiration_date || ''} onChange={e => set('cdl_expiration_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Medical Card Expiration</Label>
            <Input type="date" value={form.medical_card_expiration_date || ''} onChange={e => set('medical_card_expiration_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Issuing Doctor / Clinic</Label>
            <Input value={form.issuing_doctor || ''} onChange={e => set('issuing_doctor', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Hire Date</Label>
            <Input type="date" value={form.hire_date || ''} onChange={e => set('hire_date', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs mb-1.5 block">Endorsements</Label>
            <div className="flex flex-wrap gap-3">
              {ENDORSEMENT_OPTIONS.map(e => (
                <label key={e.value} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={endorsements.includes(e.value)} onCheckedChange={() => toggleEndorsement(e.value)} />
                  <span className="text-xs">{e.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Personal Info */}
          <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3 border-t">Personal Information</div>
          <div>
            <Label className="text-xs">Date of Birth</Label>
            <Input type="date" value={form.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Emergency Contact Name</Label>
            <Input value={form.emergency_contact_name || ''} onChange={e => set('emergency_contact_name', e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Emergency Contact Phone</Label>
            <Input value={form.emergency_contact_phone || ''} onChange={e => set('emergency_contact_phone', e.target.value)} className="h-8 text-xs mt-1" />
          </div>

          {/* Documents */}
          <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3 border-t">Documents</div>
          <div>
            <Label className="text-xs">CDL Document</Label>
            <UploadBtn url={form.cdl_file_url} label="CDL" uploading={uploading.cdl_file_url} onUpload={f => handleUpload('cdl_file_url', f)} />
          </div>
          <div>
            <Label className="text-xs">Medical Card</Label>
            <UploadBtn url={form.medical_card_file_url} label="Med Card" uploading={uploading.medical_card_file_url} onUpload={f => handleUpload('medical_card_file_url', f)} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Other Document</Label>
            <UploadBtn url={form.other_document_url} label="Document" uploading={uploading.other_document_url} onUpload={f => handleUpload('other_document_url', f)} />
          </div>

          <div className="col-span-2 pt-2 border-t">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="text-xs mt-1 h-16" />
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

export default function DriverQualifications() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers', tenantId],
    queryFn: () => tenantId ? base44.entities.Driver.filter({ tenant_id: tenantId }, 'full_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: quals = [], isLoading: qualsLoading } = useQuery({
    queryKey: ['driver-quals', tenantId],
    queryFn: () => tenantId ? base44.entities.DriverQualification.filter({ tenant_id: tenantId }, 'driver_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const qualMap = useMemo(() => {
    const m = {};
    quals.forEach(q => { m[q.driver_id] = q; });
    return m;
  }, [quals]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existing = qualMap[data.driver_id];
      if (existing) return base44.entities.DriverQualification.update(existing.id, data);
      return base44.entities.DriverQualification.create({ ...data, tenant_id: tenantId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['driver-quals'] }); setDialogOpen(false); toast.success('Qualifications saved'); },
  });

  const confirmMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverQualification.update(id, { pending_review: false }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['driver-quals'] }); toast.success('Record confirmed'); },
  });

  const filtered = drivers.filter(d => !search || d.full_name?.toLowerCase().includes(search.toLowerCase()));
  const isLoading = driversLoading || qualsLoading;

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Driver Qualifications" description={`${drivers.length} drivers`} />
      <SearchInput value={search} onChange={setSearch} placeholder="Search drivers..." className="w-72" />

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ShieldCheck className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No drivers found.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Driver</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">CDL Class / #</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">CDL Exp.</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Med Card Exp.</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Endorsements</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Hire Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Docs</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(d => {
                const q = qualMap[d.id];
                const cdlStatus = expiryStatus(q?.cdl_expiration_date);
                const medStatus = expiryStatus(q?.medical_card_expiration_date);
                return (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{d.full_name}</td>
                    <td className="px-4 py-3">
                      {q?.cdl_class ? <Badge variant="outline" className="text-[10px] mr-1">Class {q.cdl_class}</Badge> : null}
                      <span className="font-mono text-muted-foreground">{q?.cdl_number || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {q?.cdl_expiration_date ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{q.cdl_expiration_date}</span>
                          {cdlStatus && <Badge variant="outline" className={`text-[10px] ${cdlStatus.className}`}>{cdlStatus.label}</Badge>}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {q?.medical_card_expiration_date ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{q.medical_card_expiration_date}</span>
                          {medStatus && <Badge variant="outline" className={`text-[10px] ${medStatus.className}`}>{medStatus.label}</Badge>}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{q?.endorsements || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{q?.hire_date || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {q?.cdl_file_url && <a href={q.cdl_file_url} target="_blank" rel="noopener noreferrer" title="CDL Doc"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Paperclip className="w-3 h-3" /></Button></a>}
                        {q?.medical_card_file_url && <a href={q.medical_card_file_url} target="_blank" rel="noopener noreferrer" title="Med Card"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Paperclip className="w-3 h-3" /></Button></a>}
                        {q?.other_document_url && <a href={q.other_document_url} target="_blank" rel="noopener noreferrer" title="Other Doc"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Paperclip className="w-3 h-3" /></Button></a>}
                        {!q?.cdl_file_url && !q?.medical_card_file_url && <span className="text-muted-foreground text-[10px]">None</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {q?.submitted_by_driver && q?.pending_review ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-300 bg-yellow-50">Pending Review</Badge>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-green-600 hover:text-green-700" onClick={() => confirmMutation.mutate(q.id)}>
                            <CheckCircle2 className="w-3 h-3" /> Confirm
                          </Button>
                        </div>
                      ) : q ? (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 bg-green-50">On File</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">No Record</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setSelectedDriver(d); setDialogOpen(true); }}>
                        <Pencil className="w-3 h-3" /> {q ? 'Edit' : 'Add'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <QualDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        driver={selectedDriver}
        qual={selectedDriver ? qualMap[selectedDriver.id] : null}
        onSave={data => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}