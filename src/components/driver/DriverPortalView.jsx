import React, { useState, useRef } from 'react';
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
import { printStatement } from '../print/printStatement';

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
  const [uploading, setUploading] = useState(null); // null | 'bol' | 'rate_confirmation'
  const [viewingStatement, setViewingStatement] = useState(null);
  const bolRef = useRef(null);
  const rcRef = useRef(null);

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
      await base44.entities.DriverDocument.create({
        driver_id: session.driver_id,
        driver_name: session.driver_name,
        document_type: docType,
        file_name: file.name,
        file_url,
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

  const getDueDate = (period_end) => period_end ? addDays(new Date(period_end), 3) : null;
  const checkOverdue = (period_end, status) => {
    const due = getDueDate(period_end);
    return due && isPast(due) && !['finalized', 'paid', 'void'].includes(status);
  };

  const tabs = [
    { key: 'documents', label: 'My Documents', icon: FileText },
    { key: 'statements', label: 'My Statements', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Truck className="w-5 h-5 text-sidebar-primary" />
          <span className="font-bold text-sidebar-primary-foreground text-sm tracking-widest">TRUCKOPS</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-xs font-semibold text-sidebar-primary-foreground">{session?.driver_name}</p>
            <p className="text-[11px] text-sidebar-foreground/60">Truck # {session?.truck_number}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={logout}
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-card border-b border-border px-4 md:px-6 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-1 md:gap-0">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1 md:gap-2 px-3 md:px-5 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-3 md:space-y-5">

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <>
              {/* Upload buttons */}
              <Card>
                <CardHeader className="py-3 px-4 md:py-4 md:px-5 border-b">
                  <CardTitle className="text-xs md:text-sm font-semibold">Upload Documents</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Select document type. Formats: PDF, JPG, PNG, DOC.</p>
                </CardHeader>
                <CardContent className="px-4 md:px-5 py-4 md:py-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <input ref={bolRef} type="file" className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleUpload(e.target.files[0], 'bol')} />
                    <input ref={rcRef} type="file" className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleUpload(e.target.files[0], 'rate_confirmation')} />

                    <button
                      onClick={() => bolRef.current?.click()}
                      disabled={!!uploading}
                      className="h-16 md:h-20 rounded-lg md:rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all flex flex-col items-center justify-center gap-1 md:gap-2 disabled:opacity-50"
                      >
                      {uploading === 'bol' ? <Loader2 className="w-5 md:w-6 h-5 md:h-6 animate-spin text-primary" /> : <Upload className="w-5 md:w-6 h-5 md:h-6 text-primary" />}
                      <span className="text-xs md:text-sm font-semibold text-primary text-center">Upload BOL</span>
                    </button>

                    <button
                      onClick={() => rcRef.current?.click()}
                      disabled={!!uploading}
                      className="h-16 md:h-20 rounded-lg md:rounded-xl border-2 border-dashed border-border hover:border-muted-foreground/40 bg-muted/30 hover:bg-muted/50 transition-all flex flex-col items-center justify-center gap-1 md:gap-2 disabled:opacity-50"
                      >
                      {uploading === 'rate_confirmation' ? <Loader2 className="w-5 md:w-6 h-5 md:h-6 animate-spin text-muted-foreground" /> : <FileCheck className="w-5 md:w-6 h-5 md:h-6 text-muted-foreground" />}
                      <span className="text-xs md:text-sm font-semibold text-foreground text-center">Upload Rate Confirmation</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Document list */}
              <Card>
                <CardHeader className="py-3 px-4 md:py-4 md:px-5 border-b">
                  <CardTitle className="text-xs md:text-sm font-semibold">Uploaded Documents
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({documents.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-5 py-3 md:py-4">
                  {docsLoading ? (
                    <div className="flex items-center justify-center py-8 md:py-10">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 md:py-10 text-muted-foreground">
                      <FileText className="w-6 md:w-8 h-6 md:h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs md:text-sm">No documents uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs md:text-sm">
                        <thead>
                          <tr className="border-b text-[10px] md:text-[11px] text-muted-foreground uppercase tracking-wide">
                            <th className="text-left pb-2 font-semibold px-1">Date</th>
                            <th className="text-left pb-2 font-semibold px-1">Type</th>
                            <th className="text-left pb-2 font-semibold px-1">File</th>
                            <th className="text-center pb-2 font-semibold px-1">View</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.map((doc) => (
                            <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="py-2 md:py-3 text-[10px] md:text-xs text-muted-foreground px-1">
                                {doc.created_date ? format(new Date(doc.created_date), 'MMM d') : '—'}
                              </td>
                              <td className="py-2 md:py-3 px-1">
                                <Badge variant="outline" className={`text-[10px] md:text-xs ${doc.document_type === 'bol'
                                  ? 'text-blue-600 border-blue-300 bg-blue-50'
                                  : 'text-purple-600 border-purple-300 bg-purple-50'
                                }`}>
                                  {doc.document_type === 'bol' ? 'BOL' : 'RC'}
                                </Badge>
                              </td>
                              <td className="py-2 md:py-3 text-[10px] md:text-xs font-medium max-w-[100px] md:max-w-[180px] truncate px-1">{doc.file_name}</td>
                              <td className="py-2 md:py-3 text-center px-1">
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm" className="h-6 md:h-7 text-[10px] md:text-xs gap-0.5 px-2">
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* STATEMENTS TAB */}
          {activeTab === 'statements' && (
            <Card>
              <CardHeader className="py-3 px-4 md:py-4 md:px-5 border-b">
                <CardTitle className="text-xs md:text-sm font-semibold">My Weekly Statements</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sunday–Saturday periods. Due following Tuesday.
                </p>
              </CardHeader>
              <CardContent className="px-4 md:px-5 py-3 md:py-4">
                {stmtsLoading ? (
                   <div className="flex items-center justify-center py-8 md:py-10">
                     <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                   </div>
                 ) : statements.length === 0 ? (
                   <div className="text-center py-8 md:py-10 text-muted-foreground">
                     <Calendar className="w-6 md:w-8 h-6 md:h-8 mx-auto mb-2 opacity-30" />
                     <p className="text-xs md:text-sm">No statements available yet.</p>
                     <p className="text-xs mt-1">Statements appear here once created by dispatcher.</p>
                   </div>
                 ) : (
                   <div className="space-y-2 md:space-y-2.5">
                     {statements.map((stmt) => {
                       const dueDate = getDueDate(stmt.period_end);
                       const overdue = checkOverdue(stmt.period_end, stmt.status);
                       const cfg = statusConfig[stmt.status] || statusConfig.draft;
                       // period_start is Monday, so Sunday is one day before
                       const sundayStart = stmt.period_start ? subDays(new Date(stmt.period_start), 1) : null;
                       return (
                         <button
                           key={stmt.id}
                           onClick={() => setViewingStatement(stmt)}
                           className={`w-full flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 rounded-lg md:rounded-xl border transition-colors text-left gap-3 md:gap-0 ${
                             overdue
                               ? 'border-red-200 bg-red-50/60 hover:bg-red-50'
                               : 'border-border bg-muted/10 hover:bg-muted/20'
                           }`}
                         >
                           <div className="space-y-1 flex-1">
                             <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 gap-1">
                               <p className="text-xs md:text-sm font-semibold">
                                 {sundayStart && stmt.period_end
                                   ? `${format(sundayStart, 'MMM d')} – ${format(new Date(stmt.period_end), 'MMM d')}`
                                   : stmt.statement_date || '—'}
                               </p>
                               {overdue && (
                                 <span className="flex items-center gap-1 text-[10px] md:text-[11px] font-bold text-red-600">
                                   <AlertCircle className="w-3 h-3" /> OVERDUE
                                 </span>
                               )}
                             </div>
                             <p className="text-[10px] md:text-xs text-muted-foreground">
                               Due: {dueDate ? format(dueDate, 'MMM d') : '—'}
                             </p>
                           </div>
                           <div className="flex items-center gap-2 md:gap-4 justify-between md:justify-end">
                             <p className="text-base md:text-lg font-bold text-primary">
                               ${(stmt.final_check_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                             </p>
                             <Badge variant="outline" className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge>
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
                  <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-lg md:rounded-xl">
                    <DialogHeader className="flex flex-row items-center justify-between pb-3 md:pb-4 border-b">
                      <DialogTitle className="text-xs md:text-sm">Statement Details</DialogTitle>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewingStatement(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </DialogHeader>

                    <div className="space-y-3 md:space-y-4 py-3 md:py-4">
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Period</p>
                          <p className="text-sm font-semibold">
                            {viewingStatement.period_start && viewingStatement.period_end
                              ? `${format(subDays(new Date(viewingStatement.period_start), 1), 'MMM d')} – ${format(new Date(viewingStatement.period_end), 'MMM d, yyyy')}`
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge variant="outline" className={statusConfig[viewingStatement.status]?.cls}>
                            {statusConfig[viewingStatement.status]?.label}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Gross Total</p>
                          <p className="text-sm font-semibold text-green-600">
                            ${(viewingStatement.gross_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Deductions</p>
                          <p className="text-sm font-semibold text-red-600">
                            -${(viewingStatement.deductions_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fuel</p>
                          <p className="text-sm font-semibold text-orange-600">
                            -${(viewingStatement.fuel_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net Pay (Final Check)</p>
                          <p className="text-lg font-bold text-primary">
                            ${(viewingStatement.final_check_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Detailed Breakdown */}
                      <div className="pt-3 md:pt-4 border-t space-y-2 md:space-y-3">
                        {linesLoading ? (
                          <div className="flex items-center justify-center py-6 md:py-8">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <>
                            {/* Trips */}
                            {statementLines.filter(l => l.line_type === 'trip' || l.line_type === 'adjustment').length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Trips</p>
                                <div className="space-y-1 text-xs">
                                  {statementLines.filter(l => l.line_type === 'trip' || l.line_type === 'adjustment').map((line) => (
                                    <div key={line.id} className="flex justify-between p-1.5 md:p-2 bg-muted/30 rounded text-xs md:text-sm gap-2">
                                      <span className="truncate">{line.description || line.route || '—'}</span>
                                      <span className="font-medium whitespace-nowrap">${(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Credits */}
                            {statementLines.filter(l => l.line_type === 'credit').length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Credits</p>
                                <div className="space-y-1 text-xs">
                                  {statementLines.filter(l => l.line_type === 'credit').map((line) => (
                                    <div key={line.id} className="flex justify-between p-1.5 md:p-2 bg-green-50/50 rounded text-xs md:text-sm gap-2">
                                      <span className="truncate">{line.description || '—'}</span>
                                      <span className="font-medium text-green-600 whitespace-nowrap">${(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Deductions */}
                            {statementLines.filter(l => l.line_type === 'deduction' || l.line_type === 'advance').length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Deductions</p>
                                <div className="space-y-1 text-xs">
                                  {statementLines.filter(l => l.line_type === 'deduction' || l.line_type === 'advance').map((line) => (
                                    <div key={line.id} className="flex justify-between p-1.5 md:p-2 bg-red-50/50 rounded text-xs md:text-sm gap-2">
                                      <span className="truncate">{line.description || '—'}</span>
                                      <span className="font-medium text-red-600 whitespace-nowrap">-${Math.abs(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Fuel */}
                            {statementLines.filter(l => l.line_type === 'fuel').length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Fuel Card Charges</p>
                                <div className="space-y-1 text-xs">
                                  {statementLines.filter(l => l.line_type === 'fuel').map((line) => (
                                    <div key={line.id} className="flex justify-between p-1.5 md:p-2 bg-orange-50/50 rounded text-xs md:text-sm gap-2">
                                      <span className="truncate">{line.description || '—'}</span>
                                      <span className="font-medium text-orange-600 whitespace-nowrap">-${Math.abs(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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
                        setViewingStatement(null);
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