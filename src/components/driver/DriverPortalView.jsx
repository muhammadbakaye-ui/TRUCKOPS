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
      <div className="bg-card border-b border-border px-6 flex-shrink-0">
        <div className="flex">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <>
              {/* Upload buttons */}
              <Card>
                <CardHeader className="py-4 px-5 border-b">
                  <CardTitle className="text-sm font-semibold">Upload Documents</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Select the type of document to upload. Accepted formats: PDF, JPG, PNG, DOC.</p>
                </CardHeader>
                <CardContent className="px-5 py-5">
                  <div className="grid grid-cols-2 gap-4">
                    <input ref={bolRef} type="file" className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleUpload(e.target.files[0], 'bol')} />
                    <input ref={rcRef} type="file" className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleUpload(e.target.files[0], 'rate_confirmation')} />

                    <button
                      onClick={() => bolRef.current?.click()}
                      disabled={!!uploading}
                      className="h-20 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploading === 'bol' ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6 text-primary" />}
                      <span className="text-sm font-semibold text-primary">Upload BOL</span>
                    </button>

                    <button
                      onClick={() => rcRef.current?.click()}
                      disabled={!!uploading}
                      className="h-20 rounded-xl border-2 border-dashed border-border hover:border-muted-foreground/40 bg-muted/30 hover:bg-muted/50 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploading === 'rate_confirmation' ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : <FileCheck className="w-6 h-6 text-muted-foreground" />}
                      <span className="text-sm font-semibold text-foreground">Upload Rate Confirmation</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Document list */}
              <Card>
                <CardHeader className="py-4 px-5 border-b">
                  <CardTitle className="text-sm font-semibold">Uploaded Documents
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({documents.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 py-4">
                  {docsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No documents uploaded yet.</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-[11px] text-muted-foreground uppercase tracking-wide">
                          <th className="text-left pb-2 font-semibold">Date Sent</th>
                          <th className="text-left pb-2 font-semibold">Type</th>
                          <th className="text-left pb-2 font-semibold">File Name</th>
                          <th className="text-right pb-2 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => (
                          <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-3 text-xs text-muted-foreground">
                              {doc.created_date ? format(new Date(doc.created_date), 'MMM d, yyyy') : '—'}
                            </td>
                            <td className="py-3">
                              <Badge variant="outline" className={doc.document_type === 'bol'
                                ? 'text-blue-600 border-blue-300 bg-blue-50'
                                : 'text-purple-600 border-purple-300 bg-purple-50'
                              }>
                                {doc.document_type === 'bol' ? 'BOL' : 'Rate Confirmation'}
                              </Badge>
                            </td>
                            <td className="py-3 text-xs font-medium max-w-[180px] truncate">{doc.file_name}</td>
                            <td className="py-3 text-right">
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                  <Download className="w-3 h-3" /> View
                                </Button>
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* STATEMENTS TAB */}
          {activeTab === 'statements' && (
            <Card>
              <CardHeader className="py-4 px-5 border-b">
                <CardTitle className="text-sm font-semibold">My Weekly Statements</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Each statement covers Sunday–Saturday. Statements are due the following Tuesday.
                </p>
              </CardHeader>
              <CardContent className="px-5 py-4">
                {stmtsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : statements.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No statements available yet.</p>
                    <p className="text-xs mt-1">Your statements will appear here once created by your dispatcher.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
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
                          className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors text-left ${
                            overdue
                              ? 'border-red-200 bg-red-50/60 hover:bg-red-50'
                              : 'border-border bg-muted/10 hover:bg-muted/20'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">
                                {sundayStart && stmt.period_end
                                  ? `${format(sundayStart, 'MMM d')} – ${format(new Date(stmt.period_end), 'MMM d, yyyy')}`
                                  : stmt.statement_date || '—'}
                              </p>
                              {overdue && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-red-600">
                                  <AlertCircle className="w-3 h-3" /> OVERDUE
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Due: {dueDate ? format(dueDate, 'EEEE, MMM d, yyyy') : '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-lg font-bold text-primary">
                              ${(stmt.final_check_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>
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
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b">
                      <DialogTitle className="text-sm">Statement Details</DialogTitle>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewingStatement(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <DialogFooter className="flex gap-2 pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => setViewingStatement(null)}>
                        Close
                      </Button>
                      <Button size="sm" className="gap-1" onClick={() => {
                        printStatement({ company: {}, statement: viewingStatement, allLines: [] });
                        setViewingStatement(null);
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