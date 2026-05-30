import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '../shared/AppSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Upload, FileText, LogOut, Download, Loader2, Calendar, Printer, User, LayoutGrid } from 'lucide-react';
import DriverMyProfile from './DriverMyProfile';
import DriverDispatchBoard from './DriverDispatchBoard';
import { toast } from 'sonner';
import { formatInUserTimezone, getUserTimezone } from '@/utils/formatTimezone';

import { printStatement } from '../print/printStatement';
import StatementLoadDetails from './StatementLoadDetails';
import AppTour, { DRIVER_TOUR_STEPS } from '../tutorial/AppTour';
import TourButton from '../tutorial/TourButton';

const DOC_TYPES = [
  { value: 'bol', label: 'BOL' },
  { value: 'rate_confirmation', label: 'Rate Confirmation' },
  { value: 'drug_test', label: 'Drug & Alcohol Test Result' },
  { value: 'cdl', label: 'CDL / License' },
  { value: 'medical_card', label: 'Medical Card' },
  { value: 'inspection_report', label: 'Vehicle Inspection Report' },
  { value: 'accident_report', label: 'Accident Report' },
  { value: 'violation_notice', label: 'Violation Notice' },
  { value: 'insurance_document', label: 'Insurance Document' },
  { value: 'registration', label: 'Registration' },
  { value: 'other', label: 'Other' },
];
const DOC_TYPE_LABELS = Object.fromEntries(DOC_TYPES.map(d => [d.value, d.label]));

const statusConfig = {
  draft:     { label: 'Ready',     cls: 'bg-green-100 text-green-700 border-green-300' },
  finalized: { label: 'Finalized', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  paid:      { label: 'Paid',      cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  void:      { label: 'Void',      cls: 'bg-muted text-muted-foreground border-border' },
};

export default function DriverPortalView() {
  const { session, logout } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dispatch');
  const [uploading, setUploading] = useState(false);
  const [viewingStatement, setViewingStatement] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileRef = useRef(null);
  const [selectedDocType, setSelectedDocType] = useState('bol');

  // Auto-show driver tour on first login
  useEffect(() => {
    const key = `truckops_driver_tour_seen_${session?.driver_id}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      const t = setTimeout(() => { setShowTour(true); localStorage.setItem(key, '1'); }, 800);
      return () => clearTimeout(t);
    }
  }, [session?.driver_id]);

  const { data: carrierCompanies = [] } = useQuery({
    queryKey: ['carrier-company-portal', session?.tenant_id],
    queryFn: () => base44.entities.Company.filter({ tenant_id: session.tenant_id }, '-created_date', 10).then(cos => {
      return (cos.find(c => c.is_owner_profile) || cos.find(c => c.company_type === 'owner_operator') || cos.find(c => c.company_type === 'carrier') || cos[0]) ? [cos.find(c => c.is_owner_profile) || cos.find(c => c.company_type === 'owner_operator') || cos.find(c => c.company_type === 'carrier') || cos[0]] : [];
    }),
    enabled: !!session?.tenant_id,
  });
  const companyName = carrierCompanies[0]?.company_name || '';

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['driver-docs', session?.driver_id],
    queryFn: () => base44.entities.DriverDocument.filter({ driver_id: session.driver_id }, '-created_date', 200),
    enabled: !!session?.driver_id,
  });

  const { data: statements = [], isLoading: stmtsLoading } = useQuery({
    queryKey: ['driver-statements-portal', session?.driver_id],
    queryFn: () => base44.entities.DriverStatement.filter({ driver_id: session.driver_id, published: true }, '-period_start', 52),
    enabled: !!session?.driver_id,
  });

  const { data: statementLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['statement-lines', viewingStatement?.id],
    queryFn: () => base44.entities.StatementLine.filter({ statement_id: viewingStatement.id }, 'date', 500),
    enabled: !!viewingStatement?.id,
  });

  const handleUpload = async (file, docType) => {
    if (!file) return;
    setUploading(true);
    try {
      // Read file as base64 (drivers aren't Base44-authed so we go via backend)
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const uploadRes = await base44.functions.invoke('driverPortalSave', {
        token: session.portal_token,
        action: 'upload_file',
        data: { file_base64: base64, file_name: file.name, mime_type: file.type },
      });
      const file_url = uploadRes.data?.file_url;
      if (!file_url) throw new Error('Upload failed — no URL returned');
      const doc = await base44.entities.DriverDocument.create({
        driver_id: session.driver_id,
        driver_name: session.driver_name,
        document_type: docType,
        file_name: file.name,
        file_url,
      });
      await base44.entities.Notification.create({
        tenant_id: session.tenant_id,
        notification_type: 'driver_document_upload',
        title: `New ${DOC_TYPE_LABELS[docType] || docType} uploaded`,
        message: `${session.driver_name} uploaded a ${DOC_TYPE_LABELS[docType] || docType}: ${file.name}`,
        related_entity_type: 'driver_document',
        related_entity_id: doc.id,
        link_url: '/AdminDriverDocuments',
        read: false,
      });
      toast.success('Document uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['driver-docs', session.driver_id] });
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const tabs = [
    { key: 'dispatch', label: 'My Loads', icon: LayoutGrid, tourAttr: 'driver-dispatch-tab' },
    { key: 'documents', label: 'My Documents', icon: FileText, tourAttr: 'driver-documents-tab' },
    { key: 'statements', label: 'My Statements', icon: Calendar, tourAttr: 'driver-statements-tab' },
    { key: 'profile', label: 'My Profile', icon: User, tourAttr: 'driver-profile-tab' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showTour && <AppTour steps={DRIVER_TOUR_STEPS} onClose={() => setShowTour(false)} />}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You'll need to log back in to access your statements and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={logout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Logout
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="h-12 md:h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-3 md:px-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 md:w-5 md:h-5 text-sidebar-primary" />
          <div>
            <span className="font-bold text-sidebar-primary-foreground text-xs md:text-sm tracking-widest">TRUCKOPS</span>
            {(companyName || session?.company_name) && (
              <p className="text-[10px] md:text-[11px] font-bold leading-tight" style={{ color: '#a855f7' }}>{companyName || session?.company_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-5">
          <div className="text-right">
            <p className="text-[11px] md:text-xs font-semibold text-sidebar-primary-foreground leading-tight">{session?.driver_name}</p>
            <p className="text-[10px] md:text-[11px] text-sidebar-foreground/60 leading-tight">Truck #{session?.truck_number}</p>
          </div>
          <TourButton onClick={() => setShowTour(true)} />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 md:h-8 text-[11px] md:text-xs gap-1 px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-card border-b border-border px-2 md:px-6 flex-shrink-0">
        <div className="flex">
          {tabs.map(({ key, label, icon: Icon, tourAttr }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              data-tour={tourAttr}
              className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-5 py-2.5 md:py-3 text-[11px] md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* DISPATCH BOARD TAB — full width, no container constraint */}
        {activeTab === 'dispatch' && (
          <DriverDispatchBoard session={session} tenantId={session?.tenant_id} />
        )}
        <div className={`max-w-3xl mx-auto space-y-3 md:space-y-5 p-3 md:p-6${activeTab === 'dispatch' ? ' hidden' : ''}`}>

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <>
              <Card>
                <CardHeader className="py-2.5 px-3 md:py-4 md:px-5 border-b">
                  <CardTitle className="text-xs md:text-sm font-semibold">Upload Documents</CardTitle>
                  <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">PDF, JPG, PNG, DOC supported.</p>
                </CardHeader>
                <CardContent className="px-3 md:px-5 py-3 md:py-5">
                  <input ref={fileRef} type="file" className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => { if (e.target.files[0]) handleUpload(e.target.files[0], selectedDocType); }} />
                  <div className="space-y-3">
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      data-tour="driver-upload-bol"
                      className="w-full h-16 md:h-20 rounded-lg md:rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 active:bg-primary/15 hover:bg-primary/10 hover:border-primary/60 transition-all flex flex-col items-center justify-center gap-1 md:gap-2 disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-5 md:w-6 h-5 md:h-6 animate-spin text-primary" /> : <Upload className="w-5 md:w-6 h-5 md:h-6 text-primary" />}
                      <span className="text-[11px] md:text-sm font-semibold text-primary text-center">
                        {uploading ? 'Uploading...' : `Upload ${DOC_TYPE_LABELS[selectedDocType] || 'Document'}`}
                      </span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Document list */}
              <Card>
                <CardHeader className="py-2.5 px-3 md:py-4 md:px-5 border-b">
                  <CardTitle className="text-xs md:text-sm font-semibold">
                    Uploaded Documents <span className="ml-1 text-[11px] font-normal text-muted-foreground">({documents.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 py-0">
                  {docsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No documents uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between px-3 md:px-5 py-2.5 md:py-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Badge variant="outline" className="text-[10px] shrink-0 text-primary border-primary/30 bg-primary/10">
                              {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] md:text-xs font-medium truncate">{doc.file_name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {doc.updated_date ? formatInUserTimezone(doc.updated_date, 'datetime', getUserTimezone()) : doc.created_date ? formatInUserTimezone(doc.created_date, 'date', getUserTimezone()) : '—'}
                              </p>
                            </div>
                          </div>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0 ml-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <DriverMyProfile session={session} />
          )}

          {/* STATEMENTS TAB */}
          {activeTab === 'statements' && (
            <Card>
              <CardHeader className="py-2.5 px-3 md:py-4 md:px-5 border-b">
                <CardTitle className="text-xs md:text-sm font-semibold">My Weekly Statements</CardTitle>
                <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">Sun–Sat periods · due following Tuesday</p>
              </CardHeader>
              <CardContent className="px-0 py-0">
                {stmtsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : statements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-7 h-7 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No statements available yet.</p>
                    <p className="text-[11px] mt-1 opacity-70">Statements appear here once created by dispatcher.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {statements.map((stmt) => {
                      const cfg = statusConfig[stmt.status] || statusConfig.draft;
                      return (
                        <button
                          key={stmt.id}
                          onClick={() => setViewingStatement(stmt)}
                          className="w-full flex items-center justify-between px-3 md:px-5 py-3 md:py-4 transition-colors text-left active:bg-muted/40"
                        >
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <p className="text-xs md:text-sm font-semibold">
                              {stmt.period_start && stmt.period_end
                                ? `${formatInUserTimezone(stmt.period_start + 'T12:00:00', 'short', getUserTimezone())} – ${formatInUserTimezone(stmt.period_end + 'T12:00:00', 'short', getUserTimezone())}`
                                : stmt.statement_date || '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <div className="text-right">
                              <p className="text-sm md:text-base font-bold text-primary">
                                ${(stmt.final_check_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                              <Badge variant="outline" className={`text-[10px] md:text-xs ${cfg.cls}`}>{cfg.label}</Badge>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>

              {/* Statement View Modal */}
              {viewingStatement && (
                <Dialog open={!!viewingStatement} onOpenChange={(open) => !open && setViewingStatement(null)}>
                  <DialogContent className="w-full max-w-2xl max-h-[92vh] overflow-y-auto p-3 md:p-6 rounded-xl">
                    <DialogHeader className="pb-2.5 md:pb-4 border-b">
                      <DialogTitle className="text-sm md:text-base">Statement Details</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 py-2.5 md:py-4">
                      {/* Summary row */}
                      <div className="bg-primary/5 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Period</p>
                          <p className="text-xs font-semibold">
                            {viewingStatement.period_start && viewingStatement.period_end
                              ? `${formatInUserTimezone(viewingStatement.period_start + 'T12:00:00', 'short', getUserTimezone())} – ${formatInUserTimezone(viewingStatement.period_end + 'T12:00:00', 'datetime', getUserTimezone())}`
                              : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Net Pay</p>
                          <p className="text-lg font-bold text-primary">
                            ${(viewingStatement.final_check_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-green-500/10 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground leading-tight">Gross</p>
                          <p className="text-xs font-bold text-green-600 mt-0.5">
                            ${(viewingStatement.gross_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-red-500/10 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground leading-tight">Deductions</p>
                          <p className="text-xs font-bold text-red-600 mt-0.5">
                            -${(viewingStatement.deductions_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-orange-500/10 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground leading-tight">Fuel</p>
                          <p className="text-xs font-bold text-orange-600 mt-0.5">
                            -${(viewingStatement.fuel_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusConfig[viewingStatement.status]?.cls}>
                          {statusConfig[viewingStatement.status]?.label}
                        </Badge>
                      </div>

                      {/* Load Details */}
                      <div className="pt-3 md:pt-4 border-t space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Trip Details</p>
                        <StatementLoadDetails statementId={viewingStatement.id} driverId={session.driver_id} />
                      </div>

                      {/* Statement Summary */}
                      <div className="pt-3 md:pt-4 border-t space-y-2 md:space-y-3">
                        {linesLoading ? (
                          <div className="flex items-center justify-center py-6 md:py-8">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const tripLines = statementLines.filter(l => l.line_type === 'trip' || l.line_type === 'adjustment');
                              const tripTotal = tripLines.reduce((sum, l) => sum + (l.amount || 0), 0);
                              return tripLines.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Trips</p>
                                  <div className="space-y-1 text-xs">
                                    {tripLines.map((line) => (
                                      <div key={line.id} className="flex justify-between p-1.5 md:p-2 bg-muted/30 rounded text-xs md:text-sm gap-2">
                                        <span className="truncate">{line.description || line.route || '—'}</span>
                                        <span className="font-medium whitespace-nowrap">${(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between p-1.5 md:p-2 bg-muted/50 rounded text-xs md:text-sm gap-2 border-t-2 border-border">
                                      <span className="font-bold">Total Trips</span>
                                      <span className="font-bold whitespace-nowrap">${tripTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {(() => {
                              const creditLines = statementLines.filter(l => l.line_type === 'credit');
                              const creditTotal = creditLines.reduce((sum, l) => sum + (l.amount || 0), 0);
                              return creditLines.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Credits</p>
                                  <div className="space-y-1 text-xs">
                                    {creditLines.map((line) => (
                                      <div key={line.id} className="flex justify-between p-1.5 md:p-2 bg-green-500/10 rounded text-xs md:text-sm gap-2">
                                        <span className="truncate">{line.description || '—'}</span>
                                        <span className="font-medium text-green-600 whitespace-nowrap">${(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between p-1.5 md:p-2 bg-green-500/10 rounded text-xs md:text-sm gap-2 border-t-2 border-green-500/30">
                                      <span className="font-bold text-green-600">Total Credits</span>
                                      <span className="font-bold text-green-600 whitespace-nowrap">${creditTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {(() => {
                              const deductionLines = statementLines.filter(l => l.line_type === 'deduction' || l.line_type === 'advance');
                              const deductionTotal = deductionLines.reduce((sum, l) => sum + Math.abs(l.amount || 0), 0);
                              return deductionLines.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Deductions</p>
                                  <div className="space-y-1 text-xs">
                                    {deductionLines.map((line) => (
                                      <div key={line.id} className="flex justify-between p-1.5 md:p-2 bg-red-500/10 rounded text-xs md:text-sm gap-2">
                                        <span className="truncate">{line.description || '—'}</span>
                                        <span className="font-medium text-red-600 whitespace-nowrap">-${Math.abs(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between p-1.5 md:p-2 bg-red-500/10 rounded text-xs md:text-sm gap-2 border-t-2 border-red-500/30">
                                      <span className="font-bold text-red-600">Total Deductions</span>
                                      <span className="font-bold text-red-600 whitespace-nowrap">-${deductionTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {(() => {
                              const fuelLines = statementLines.filter(l => l.line_type === 'fuel');
                              const fuelTotal = fuelLines.reduce((sum, l) => sum + Math.abs(l.amount || 0), 0);
                              return fuelLines.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Fuel Card Charges</p>
                                  <div className="space-y-1 text-xs">
                                    {fuelLines.map((line) => (
                                      <div key={line.id} className="flex justify-between p-1.5 md:p-2 bg-orange-500/10 rounded text-xs md:text-sm gap-2">
                                        <span className="truncate">{line.description || '—'}</span>
                                        <span className="font-medium text-orange-600 whitespace-nowrap">-${Math.abs(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between p-1.5 md:p-2 bg-orange-500/10 rounded text-xs md:text-sm gap-2 border-t-2 border-orange-500/30">
                                      <span className="font-bold text-orange-600">Total Fuel</span>
                                      <span className="font-bold text-orange-600 whitespace-nowrap">-${fuelTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>

                    <DialogFooter className="flex gap-2 pt-2.5 md:pt-4 border-t">
                      <Button variant="outline" size="sm" className="text-xs h-9 flex-1 md:flex-none" onClick={() => setViewingStatement(null)}>
                        Close
                      </Button>
                      <Button size="sm" className="gap-1.5 text-xs h-9 flex-1 md:flex-none" onClick={() => {
                        printStatement({ company: carrierCompanies[0] || {}, statement: viewingStatement, allLines: statementLines });
                      }}>
                        <Printer className="w-3.5 h-3.5" /> Download PDF
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}