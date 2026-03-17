import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '../shared/AppSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Truck, Upload, FileText, LogOut, Download, Loader2, FileCheck, Calendar, AlertCircle, X, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isPast, subDays } from 'date-fns';
import { getPeriodForDate } from '@/components/shared/statementCalendar';
import { printStatement } from '../print/printStatement';
import StatementLoadDetails from './StatementLoadDetails';
import AppTour, { DRIVER_TOUR_STEPS } from '../tutorial/AppTour';
import TourButton from '../tutorial/TourButton';

const statusConfig = {
  draft:     { label: 'Pending',   cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  finalized: { label: 'Ready',     cls: 'bg-green-100 text-green-700 border-green-300' },
  paid:      { label: 'Paid',      cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  void:      { label: 'Void',      cls: 'bg-muted text-muted-foreground border-border' },
};

export default function DriverPortalView() {
  const { session, logout } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('documents');
  const [uploading, setUploading] = useState(null);
  const [viewingStatement, setViewingStatement] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const bolRef = useRef(null);
  const rcRef = useRef(null);

  // Auto-show driver tour on first login
  useEffect(() => {
    const key = `truckops_driver_tour_seen_${session?.driver_id}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      const t = setTimeout(() => { setShowTour(true); localStorage.setItem(key, '1'); }, 800);
      return () => clearTimeout(t);
    }
  }, [session?.driver_id]);

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
    setUploading(docType);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const doc = await base44.entities.DriverDocument.create({
        driver_id: session.driver_id,
        driver_name: session.driver_name,
        document_type: docType,
        file_name: file.name,
        file_url,
      });
      // Create notification for admins
      await base44.entities.Notification.create({
        notification_type: 'driver_document_upload',
        title: `New ${docType === 'bol' ? 'BOL' : 'Rate Confirmation'} uploaded`,
        message: `${session.driver_name} uploaded a ${docType === 'bol' ? 'Bill of Lading' : 'Rate Confirmation'}: ${file.name}`,
        related_entity_type: 'driver_document',
        related_entity_id: doc.id,
        link_url: '/AdminDriverDocuments',
        read: false,
      });
      toast.success(`${docType === 'bol' ? 'BOL' : 'Rate Confirmation'} uploaded successfully`);
      queryClient.invalidateQueries({ queryKey: ['driver-docs', session.driver_id] });
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(null);
      if (bolRef.current) bolRef.current.value = '';
      if (rcRef.current) rcRef.current.value = '';
    }
  };

  const getDueDate = (period_end) => {
    if (!period_end) return null;
    // Look up the due date from the hardcoded calendar
    const period = getPeriodForDate(period_end);
    return period ? new Date(period.due) : null;
  };
  const checkOverdue = (period_end, status) => {
    const due = getDueDate(period_end);
    return due && isPast(due) && !['finalized', 'paid', 'void'].includes(status);
  };

  const tabs = [
    { key: 'documents', label: 'My Documents', icon: FileText, tourAttr: 'driver-documents-tab' },
    { key: 'statements', label: 'My Statements', icon: Calendar, tourAttr: 'driver-statements-tab' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showTour && <AppTour steps={DRIVER_TOUR_STEPS} onClose={() => setShowTour(false)} />}
      {/* Header */}
      <div className="h-12 md:h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-3 md:px-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 md:w-5 md:h-5 text-sidebar-primary" />
          <span className="font-bold text-sidebar-primary-foreground text-xs md:text-sm tracking-widest">TRUCKOPS</span>
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
            onClick={logout}
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
      <div className="flex-1 overflow-auto p-3 md:p-6">
        <div className="max-w-3xl mx-auto space-y-3 md:space-y-5">

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <>
              {/* Upload buttons */}
              <Card>
                <CardHeader className="py-2.5 px-3 md:py-4 md:px-5 border-b">
                  <CardTitle className="text-xs md:text-sm font-semibold">Upload Documents</CardTitle>
                  <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">PDF, JPG, PNG, DOC supported.</p>
                </CardHeader>
                <CardContent className="px-3 md:px-5 py-3 md:py-5">
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <input ref={bolRef} type="file" className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleUpload(e.target.files[0], 'bol')} />
                    <input ref={rcRef} type="file" className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleUpload(e.target.files[0], 'rate_confirmation')} />

                    <button
                      onClick={() => bolRef.current?.click()}
                      disabled={!!uploading}
                      data-tour="driver-upload-bol"
                      className="h-14 md:h-20 rounded-lg md:rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 active:bg-primary/15 hover:bg-primary/10 hover:border-primary/60 transition-all flex flex-col items-center justify-center gap-1 md:gap-2 disabled:opacity-50"
                      >
                      {uploading === 'bol' ? <Loader2 className="w-4 md:w-6 h-4 md:h-6 animate-spin text-primary" /> : <Upload className="w-4 md:w-6 h-4 md:h-6 text-primary" />}
                      <span className="text-[11px] md:text-sm font-semibold text-primary text-center">Upload BOL</span>
                    </button>

                    <button
                      onClick={() => rcRef.current?.click()}
                      disabled={!!uploading}
                      data-tour="driver-upload-rc"
                      className="h-14 md:h-20 rounded-lg md:rounded-xl border-2 border-dashed border-border active:bg-muted/60 hover:border-muted-foreground/40 bg-muted/30 hover:bg-muted/50 transition-all flex flex-col items-center justify-center gap-1 md:gap-2 disabled:opacity-50"
                      >
                      {uploading === 'rate_confirmation' ? <Loader2 className="w-4 md:w-6 h-4 md:h-6 animate-spin text-muted-foreground" /> : <FileCheck className="w-4 md:w-6 h-4 md:h-6 text-muted-foreground" />}
                      <span className="text-[11px] md:text-sm font-semibold text-foreground text-center leading-tight">Upload RC</span>
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
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${doc.document_type === 'bol'
                              ? 'text-blue-600 border-blue-300 bg-blue-50'
                              : 'text-purple-600 border-purple-300 bg-purple-50'
                            }`}>
                              {doc.document_type === 'bol' ? 'BOL' : 'RC'}
                            </Badge>
                            <div className="min-w-0">
                              <p className="text-[11px] md:text-xs font-medium truncate">{doc.file_name}</p>
                              <p className="text-[10px] text-muted-foreground">{doc.created_date ? format(new Date(doc.created_date), 'MMM d, yyyy') : '—'}</p>
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
                       const dueDate = getDueDate(stmt.period_end);
                       const overdue = checkOverdue(stmt.period_end, stmt.status);
                       const cfg = statusConfig[stmt.status] || statusConfig.draft;
                       return (
                         <button
                           key={stmt.id}
                           onClick={() => setViewingStatement(stmt)}
                           className={`w-full flex items-center justify-between px-3 md:px-5 py-3 md:py-4 transition-colors text-left active:bg-muted/40 ${
                             overdue ? 'bg-red-50/60' : ''
                           }`}
                         >
                           <div className="space-y-0.5 flex-1 min-w-0">
                             <div className="flex items-center gap-1.5">
                               <p className="text-xs md:text-sm font-semibold">
                                 {stmt.period_start && stmt.period_end
                                   ? `${format(new Date(stmt.period_start + 'T12:00:00'), 'MMM d')} – ${format(new Date(stmt.period_end + 'T12:00:00'), 'MMM d')}`
                                   : stmt.statement_date || '—'}
                               </p>
                               {overdue && (
                                 <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600">
                                   <AlertCircle className="w-2.5 h-2.5" /> OVERDUE
                                 </span>
                               )}
                             </div>
                             <p className="text-[10px] md:text-xs text-muted-foreground">
                               Due {dueDate ? format(dueDate, 'MMM d') : '—'}
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
                              ? `${format(new Date(viewingStatement.period_start + 'T12:00:00'), 'MMM d')} – ${format(new Date(viewingStatement.period_end + 'T12:00:00'), 'MMM d, yyyy')}`
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
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground leading-tight">Gross</p>
                          <p className="text-xs font-bold text-green-700 mt-0.5">
                            ${(viewingStatement.gross_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground leading-tight">Deductions</p>
                          <p className="text-xs font-bold text-red-700 mt-0.5">
                            -${(viewingStatement.deductions_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground leading-tight">Fuel</p>
                          <p className="text-xs font-bold text-orange-700 mt-0.5">
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
                           {/* Trips */}
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

                            {/* Credits */}
                            {(() => {
                              const creditLines = statementLines.filter(l => l.line_type === 'credit');
                              const creditTotal = creditLines.reduce((sum, l) => sum + (l.amount || 0), 0);
                              return creditLines.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Credits</p>
                                  <div className="space-y-1 text-xs">
                                    {creditLines.map((line) => (
                                      <div key={line.id} className="flex justify-between p-1.5 md:p-2 bg-green-50/50 rounded text-xs md:text-sm gap-2">
                                        <span className="truncate">{line.description || '—'}</span>
                                        <span className="font-medium text-green-600 whitespace-nowrap">${(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between p-1.5 md:p-2 bg-green-50 rounded text-xs md:text-sm gap-2 border-t-2 border-green-200">
                                      <span className="font-bold text-green-700">Total Credits</span>
                                      <span className="font-bold text-green-600 whitespace-nowrap">${creditTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Deductions */}
                            {(() => {
                              const deductionLines = statementLines.filter(l => l.line_type === 'deduction' || l.line_type === 'advance');
                              const deductionTotal = deductionLines.reduce((sum, l) => sum + Math.abs(l.amount || 0), 0);
                              return deductionLines.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Deductions</p>
                                  <div className="space-y-1 text-xs">
                                    {deductionLines.map((line) => (
                                      <div key={line.id} className="flex justify-between p-1.5 md:p-2 bg-red-50/50 rounded text-xs md:text-sm gap-2">
                                        <span className="truncate">{line.description || '—'}</span>
                                        <span className="font-medium text-red-600 whitespace-nowrap">-${Math.abs(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between p-1.5 md:p-2 bg-red-50 rounded text-xs md:text-sm gap-2 border-t-2 border-red-200">
                                      <span className="font-bold text-red-700">Total Deductions</span>
                                      <span className="font-bold text-red-600 whitespace-nowrap">-${deductionTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Fuel */}
                            {(() => {
                              const fuelLines = statementLines.filter(l => l.line_type === 'fuel');
                              const fuelTotal = fuelLines.reduce((sum, l) => sum + Math.abs(l.amount || 0), 0);
                              return fuelLines.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Fuel Card Charges</p>
                                  <div className="space-y-1 text-xs">
                                    {fuelLines.map((line) => (
                                      <div key={line.id} className="flex justify-between p-1.5 md:p-2 bg-orange-50/50 rounded text-xs md:text-sm gap-2">
                                        <span className="truncate">{line.description || '—'}</span>
                                        <span className="font-medium text-orange-600 whitespace-nowrap">-${Math.abs(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between p-1.5 md:p-2 bg-orange-50 rounded text-xs md:text-sm gap-2 border-t-2 border-orange-200">
                                      <span className="font-bold text-orange-700">Total Fuel</span>
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

                    <DialogFooter className="flex gap-2 pt-3 md:pt-4 border-t">
                      <Button variant="outline" size="sm" className="text-xs md:text-sm h-8 md:h-9" onClick={() => setViewingStatement(null)}>
                        Close
                      </Button>
                      <Button size="sm" className="gap-1 text-xs md:text-sm h-8 md:h-9" onClick={() => {
                        printStatement({ company: {}, statement: viewingStatement, allLines: statementLines });
                      }}>
                        <Printer className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden sm:inline">Download PDF</span><span className="sm:hidden">PDF</span>
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