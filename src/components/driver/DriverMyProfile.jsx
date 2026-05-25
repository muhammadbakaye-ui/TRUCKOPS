import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Loader2, Paperclip, CheckCircle2, ClipboardCheck, FlaskConical, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const ENDORSEMENTS = [
  { label: 'H - Hazmat', code: 'H' },
  { label: 'N - Tanker', code: 'N' },
  { label: 'T - Double/Triple', code: 'T' },
  { label: 'X - Tanker+Hazmat', code: 'X' },
  { label: 'P - Passenger', code: 'P' },
  { label: 'S - School Bus', code: 'S' },
];

const TEST_TYPES = [
  { value: 'pre_employment', label: 'Pre-Employment' },
  { value: 'random', label: 'Random' },
  { value: 'post_accident', label: 'Post-Accident' },
  { value: 'reasonable_suspicion', label: 'Reasonable Suspicion' },
  { value: 'return_to_duty', label: 'Return-to-Duty' },
];

const CHECKLIST_ITEMS = ['Brakes', 'Tires', 'Lights', 'Mirrors', 'Horn', 'Wipers', 'Fuel Level', 'Trailer Connection', 'Fire Extinguisher'];

function UploadBtn({ label, fileUrl, onUpload, uploading }) {
  const ref = useRef(null);
  return (
    <div className="flex flex-col gap-1.5">
      <input ref={ref} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
      {fileUrl && (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-600 underline flex items-center gap-1">
          <Paperclip className="w-3 h-3" /> View Document
        </a>
      )}
      <Button type="button" variant="outline" size="sm"
        className="h-9 text-xs gap-1.5 border-dashed w-full"
        disabled={uploading}
        onClick={() => ref.current?.click()}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {fileUrl ? 'Replace Document' : label}
      </Button>
    </div>
  );
}

// When token is provided, all reads/writes go through the backend function (for public portal).
// When no token, direct entity calls are used (for authenticated session portal).
export default function DriverMyProfile({ session, token }) {
  const driverId = session?.driver_id;
  const driverName = session?.driver_name;
  const tenantId = session?.tenant_id;

  // State for token-based (public portal) reads
  const [localQual, setLocalQual] = useState(null);
  const [localTests, setLocalTests] = useState([]);
  const [profileLoading, setProfileLoading] = useState(!!token);

  // Section 1: CDL
  const [cdlForm, setCdlForm] = useState({ cdl_number: '', cdl_class: '', cdl_expiration_date: '', endorsements: [] });
  const [cdlFileUrl, setCdlFileUrl] = useState('');
  const [cdlUploading, setCdlUploading] = useState(false);
  const [cdlSaving, setCdlSaving] = useState(false);

  // Section 2: Medical
  const [medForm, setMedForm] = useState({ medical_card_expiration_date: '' });
  const [medFileUrl, setMedFileUrl] = useState('');
  const [medUploading, setMedUploading] = useState(false);
  const [medSaving, setMedSaving] = useState(false);

  // Section 3: Drug Test
  const [testForm, setTestForm] = useState({
    test_date: new Date().toISOString().split('T')[0],
    test_type: 'pre_employment',
    result: 'pass',
    notes: '',
  });
  const [testFileUrl, setTestFileUrl] = useState('');
  const [testUploading, setTestUploading] = useState(false);
  const [testSaving, setTestSaving] = useState(false);

  // Section 4: Inspection
  const defaultChecklist = Object.fromEntries(CHECKLIST_ITEMS.map(k => [k, true]));
  const [inspForm, setInspForm] = useState({
    inspection_type: 'pre_trip',
    date: new Date().toISOString().split('T')[0],
    defects_noted: '',
  });
  const [checklist, setChecklist] = useState({ ...defaultChecklist });
  const [inspFileUrl, setInspFileUrl] = useState('');
  const [inspUploading, setInspUploading] = useState(false);
  const [inspSaving, setInspSaving] = useState(false);

  // When using token (public portal), fetch profile data from backend
  useEffect(() => {
    if (!token) return;
    setProfileLoading(true);
    base44.functions.invoke('driverPortalSave', { token, action: 'read' })
      .then(res => {
        const { qualification, tests } = res.data || {};
        if (qualification) {
          setLocalQual(qualification);
          populateFromQual(qualification);
        }
        setLocalTests(tests || []);
      })
      .catch(err => console.error('Failed to load profile:', err))
      .finally(() => setProfileLoading(false));
  }, [token]);

  const populateFromQual = (qual) => {
    const existingCodes = qual.endorsements ? qual.endorsements.split(',').map(s => s.trim()) : [];
    const selectedEndorsements = ENDORSEMENTS.filter(e => existingCodes.includes(e.code)).map(e => e.code);
    setCdlForm({
      cdl_number: qual.cdl_number || '',
      cdl_class: qual.cdl_class || '',
      cdl_expiration_date: qual.cdl_expiration_date || '',
      endorsements: selectedEndorsements,
    });
    setCdlFileUrl(qual.cdl_file_url || '');
    setMedForm({ medical_card_expiration_date: qual.medical_card_expiration_date || '' });
    setMedFileUrl(qual.medical_card_file_url || '');
  };

  // For non-token (session-based) portal, populate from driver entity data
  const [entityQual, setEntityQual] = useState(null);
  const [entityTests, setEntityTests] = useState([]);
  const [entityLoading, setEntityLoading] = useState(false);

  useEffect(() => {
    if (token || !driverId) return;
    setEntityLoading(true);
    Promise.all([
      base44.entities.DriverQualification.filter({ driver_id: driverId }, '-created_date', 1),
      base44.entities.DrugAlcoholTest.filter({ driver_id: driverId }, '-test_date', 30),
    ]).then(([quals, tests]) => {
      const qual = quals[0] || null;
      setEntityQual(qual);
      setEntityTests(tests || []);
      if (qual) populateFromQual(qual);
    }).catch(console.error).finally(() => setEntityLoading(false));
  }, [driverId, token]);

  const qual = token ? localQual : entityQual;
  const pastTests = token ? localTests : entityTests;
  const qualLoading = token ? profileLoading : entityLoading;

  const toggleEndorsement = (code) => {
    setCdlForm(p => ({
      ...p,
      endorsements: p.endorsements.includes(code)
        ? p.endorsements.filter(x => x !== code)
        : [...p.endorsements, code],
    }));
  };

  const uploadFile = async (file, setUrl, setLoading) => {
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUrl(file_url);
      toast.success('Document attached');
    } catch {
      toast.error('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Helper: invoke backend save or use direct entities
  const portalSave = async (action, data) => {
    if (token) {
      const res = await base44.functions.invoke('driverPortalSave', { token, action, data });
      if (!res.data?.success) throw new Error(res.data?.error || 'Save failed');
    } else {
      // Direct entity saves for session-based portal
      if (action === 'save_cdl' || action === 'save_medical') {
        const payload = { driver_id: driverId, driver_name: driverName, tenant_id: tenantId, submitted_by_driver: true, ...data };
        if (qual) {
          await base44.entities.DriverQualification.update(qual.id, payload);
        } else {
          await base44.entities.DriverQualification.create({ ...payload, pending_review: true });
        }
        await base44.entities.Notification.create({
          tenant_id: tenantId,
          notification_type: 'driver_profile_update',
          title: action === 'save_cdl' ? `CDL info updated — ${driverName}` : `Medical card updated — ${driverName}`,
          message: action === 'save_cdl' ? `${driverName} updated their CDL/license information.` : `${driverName} updated their medical card information.`,
          link_url: '/DriverQualifications',
          read: false,
        });
      } else if (action === 'save_drug_test') {
        await base44.entities.DrugAlcoholTest.create({
          driver_id: driverId, driver_name: driverName, tenant_id: tenantId,
          submitted_by_driver: true, pending_review: true, ...data,
        });
        await base44.entities.Notification.create({
          tenant_id: tenantId,
          notification_type: 'driver_test_submitted',
          title: `Drug test submitted — ${driverName}`,
          message: `${driverName} submitted a ${(data.test_type || '').replace(/_/g, ' ')} test result: ${(data.result || '').toUpperCase()}. Pending your review.`,
          link_url: '/DrugAlcoholTests',
          read: false,
        });
      } else if (action === 'save_inspection') {
        await base44.entities.TruckInspection.create({
          driver_id: driverId, driver_name: driverName, tenant_id: tenantId,
          submitted_by_driver: true, pending_review: true, ...data,
        });
        await base44.entities.Notification.create({
          tenant_id: tenantId,
          notification_type: 'driver_inspection_submitted',
          title: `Inspection submitted — ${driverName}`,
          message: `${driverName} submitted a ${(data.inspection_type || '').replace(/_/g, ' ')} inspection. Result: ${data.result}.`,
          link_url: '/TruckInspections',
          read: false,
        });
      }
    }
  };

  const saveCDL = async () => {
    setCdlSaving(true);
    try {
      await portalSave('save_cdl', {
        cdl_number: cdlForm.cdl_number,
        cdl_class: cdlForm.cdl_class,
        cdl_expiration_date: cdlForm.cdl_expiration_date,
        endorsements: cdlForm.endorsements.join(', '),
        cdl_file_url: cdlFileUrl,
      });
      toast.success('CDL information saved — your dispatcher has been notified');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setCdlSaving(false);
    }
  };

  const saveMedical = async () => {
    setMedSaving(true);
    try {
      await portalSave('save_medical', {
        medical_card_expiration_date: medForm.medical_card_expiration_date,
        medical_card_file_url: medFileUrl,
      });
      toast.success('Medical card saved — your dispatcher has been notified');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setMedSaving(false);
    }
  };

  const saveDrugTest = async () => {
    if (!testForm.test_date || !testForm.test_type || !testForm.result) {
      toast.error('Please fill in all required fields');
      return;
    }
    setTestSaving(true);
    try {
      await portalSave('save_drug_test', {
        test_date: testForm.test_date,
        test_type: testForm.test_type,
        result: testForm.result,
        notes: testForm.notes,
        file_url: testFileUrl,
      });
      // Optimistically add to local list
      const newTest = { id: Date.now(), ...testForm, file_url: testFileUrl, pending_review: true };
      if (token) setLocalTests(p => [newTest, ...p]);
      else setEntityTests(p => [newTest, ...p]);
      setTestForm({ test_date: new Date().toISOString().split('T')[0], test_type: 'pre_employment', result: 'pass', notes: '' });
      setTestFileUrl('');
      toast.success('Drug test submitted — your dispatcher has been notified');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setTestSaving(false);
    }
  };

  const saveInspection = async () => {
    if (!session?.truck_id) {
      toast.error('No truck assigned to your profile');
      return;
    }
    setInspSaving(true);
    try {
      const anyFail = Object.values(checklist).some(v => v === false);
      await portalSave('save_inspection', {
        truck_id: session.truck_id,
        truck_number: session.truck_number,
        date: inspForm.date,
        inspection_type: inspForm.inspection_type,
        result: anyFail ? 'fail' : 'pass',
        checklist,
        defects_noted: inspForm.defects_noted,
        file_url: inspFileUrl,
      });
      setChecklist({ ...defaultChecklist });
      setInspForm({ inspection_type: 'pre_trip', date: new Date().toISOString().split('T')[0], defects_noted: '' });
      setInspFileUrl('');
      toast.success('Inspection submitted — your dispatcher has been notified');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setInspSaving(false);
    }
  };

  if (qualLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">

      {/* Section 1: CDL */}
      <Card>
        <CardHeader className="py-3 px-4 md:py-4 md:px-5 border-b">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <CardTitle className="text-xs md:text-sm font-semibold">License &amp; CDL Information</CardTitle>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Keep your CDL details up to date. Your dispatcher will be notified of any changes.</p>
        </CardHeader>
        <CardContent className="px-4 md:px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">CDL Number</Label>
              <Input value={cdlForm.cdl_number}
                onChange={e => setCdlForm(p => ({ ...p, cdl_number: e.target.value }))}
                className="h-9 text-sm mt-1" placeholder="e.g. TX1234567" />
            </div>
            <div>
              <Label className="text-xs">CDL Class</Label>
              <Select value={cdlForm.cdl_class} onValueChange={v => setCdlForm(p => ({ ...p, cdl_class: v }))}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Class A</SelectItem>
                  <SelectItem value="B">Class B</SelectItem>
                  <SelectItem value="C">Class C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">CDL Expiration Date</Label>
              <Input type="date" value={cdlForm.cdl_expiration_date}
                onChange={e => setCdlForm(p => ({ ...p, cdl_expiration_date: e.target.value }))}
                className="h-9 text-sm mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-2 block">Endorsements</Label>
            <div className="grid grid-cols-2 gap-2">
              {ENDORSEMENTS.map(e => (
                <label key={e.code} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={cdlForm.endorsements.includes(e.code)}
                    onCheckedChange={() => toggleEndorsement(e.code)}
                  />
                  <span className="text-xs">{e.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="flex-1">
              <UploadBtn label="Upload CDL" fileUrl={cdlFileUrl} uploading={cdlUploading}
                onUpload={f => uploadFile(f, setCdlFileUrl, setCdlUploading)} />
            </div>
            <Button size="sm" className="h-9 text-xs gap-1.5" onClick={saveCDL} disabled={cdlSaving}>
              {cdlSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save CDL Info
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Medical Card */}
      <Card>
        <CardHeader className="py-3 px-4 md:py-4 md:px-5 border-b">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <CardTitle className="text-xs md:text-sm font-semibold">Medical Card</CardTitle>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Update your medical card expiration to avoid compliance issues.</p>
        </CardHeader>
        <CardContent className="px-4 md:px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Medical Card Expiration Date</Label>
              <Input type="date" value={medForm.medical_card_expiration_date}
                onChange={e => setMedForm(p => ({ ...p, medical_card_expiration_date: e.target.value }))}
                className="h-9 text-sm mt-1" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="flex-1">
              <UploadBtn label="Upload Medical Card" fileUrl={medFileUrl} uploading={medUploading}
                onUpload={f => uploadFile(f, setMedFileUrl, setMedUploading)} />
            </div>
            <Button size="sm" className="h-9 text-xs gap-1.5" onClick={saveMedical} disabled={medSaving}>
              {medSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save Medical Card
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Drug & Alcohol Tests */}
      <Card>
        <CardHeader className="py-3 px-4 md:py-4 md:px-5 border-b">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            <CardTitle className="text-xs md:text-sm font-semibold">Drug &amp; Alcohol Tests</CardTitle>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Submit a test result. Your dispatcher will confirm it before it is finalized.</p>
        </CardHeader>
        <CardContent className="px-4 md:px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Test Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={testForm.test_date}
                onChange={e => setTestForm(p => ({ ...p, test_date: e.target.value }))}
                className="h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Test Type <span className="text-destructive">*</span></Label>
              <Select value={testForm.test_type} onValueChange={v => setTestForm(p => ({ ...p, test_type: v }))}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Result <span className="text-destructive">*</span></Label>
              <Select value={testForm.result} onValueChange={v => setTestForm(p => ({ ...p, result: v }))}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={testForm.notes} onChange={e => setTestForm(p => ({ ...p, notes: e.target.value }))}
                className="h-9 text-sm mt-1" placeholder="Any additional notes..." />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <UploadBtn label="Upload Test Result" fileUrl={testFileUrl} uploading={testUploading}
                onUpload={f => uploadFile(f, setTestFileUrl, setTestUploading)} />
            </div>
            <Button size="sm" className="h-9 text-xs gap-1.5" onClick={saveDrugTest} disabled={testSaving}>
              {testSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Submit Test
            </Button>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Past Submitted Tests</p>
            {pastTests.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">No test records yet.</p>
            ) : (
              <div className="space-y-1.5">
                {pastTests.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">{TEST_TYPES.find(x => x.value === t.test_type)?.label || t.test_type}</p>
                      <p className="text-[10px] text-muted-foreground">{t.test_date}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {t.pending_review && (
                        <Badge variant="outline" className="text-[9px] text-yellow-600 border-yellow-300 bg-yellow-50">
                          Pending Review
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-[10px] ${t.result === 'pass' ? 'text-green-600 border-green-300 bg-green-50' : 'text-red-600 border-red-300 bg-red-50'}`}>
                        {t.result === 'pass' ? 'Pass' : 'Fail'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Vehicle Inspections */}
      <Card>
        <CardHeader className="py-3 px-4 md:py-4 md:px-5 border-b">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <CardTitle className="text-xs md:text-sm font-semibold">Vehicle Inspection</CardTitle>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Complete a pre-trip or post-trip inspection. Submitted for dispatcher review.</p>
        </CardHeader>
        <CardContent className="px-4 md:px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Inspection Type <span className="text-destructive">*</span></Label>
              <Select value={inspForm.inspection_type} onValueChange={v => setInspForm(p => ({ ...p, inspection_type: v }))}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_trip">Pre-Trip</SelectItem>
                  <SelectItem value="post_trip">Post-Trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Truck</Label>
              <Input value={session?.truck_number || 'No truck assigned'} disabled
                className="h-9 text-sm mt-1 bg-muted/40" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={inspForm.date}
                onChange={e => setInspForm(p => ({ ...p, date: e.target.value }))}
                className="h-9 text-sm mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">
              Checklist — uncheck any item to mark it as <span className="text-red-600 font-semibold">Fail</span>
            </Label>
            <div className="grid grid-cols-2 gap-2 bg-muted/20 rounded-lg p-3">
              {CHECKLIST_ITEMS.map(item => (
                <label key={item} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={checklist[item] !== false}
                    onCheckedChange={v => setChecklist(p => ({ ...p, [item]: !!v }))}
                  />
                  <span className={`text-xs ${checklist[item] === false ? 'text-red-600 font-semibold' : ''}`}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Defects / Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea value={inspForm.defects_noted}
              onChange={e => setInspForm(p => ({ ...p, defects_noted: e.target.value }))}
              className="text-sm mt-1 h-16" placeholder="Describe any defects or additional notes..." />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <UploadBtn label="Upload Inspection Report" fileUrl={inspFileUrl} uploading={inspUploading}
                onUpload={f => uploadFile(f, setInspFileUrl, setInspUploading)} />
            </div>
            <Button size="sm" className="h-9 text-xs gap-1.5" onClick={saveInspection} disabled={inspSaving}>
              {inspSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Submit Inspection
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}