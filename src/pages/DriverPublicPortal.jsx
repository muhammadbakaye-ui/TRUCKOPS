import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Truck, Calendar, Fuel, ChevronDown, ChevronUp, AlertCircle, Printer, Upload, FileText, CheckCircle2, X, User } from 'lucide-react';
import DriverMyProfile from '@/components/driver/DriverMyProfile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRef } from 'react';
import { printStatement } from '@/components/print/printStatement';
import { format, parse } from 'date-fns';

const fmt = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusConfig = {
  draft:     { label: 'Ready',     cls: 'bg-green-100 text-green-700 border-green-200' },
  finalized: { label: 'Finalized', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  paid:      { label: 'Paid',      cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  void:      { label: 'Void',      cls: 'bg-muted text-muted-foreground border-border' },
};

function StatementCard({ statement, lines }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[statement.status] || statusConfig.draft;

  const handlePrint = (e) => {
    e.stopPropagation();
    printStatement({ company: {}, statement, allLines: lines });
  };

  const tripLines = lines.filter(l => l.line_type === 'trip' || l.line_type === 'adjustment');
  const creditLines = lines.filter(l => l.line_type === 'credit');
  const deductionLines = lines.filter(l => l.line_type === 'deduction' || l.line_type === 'advance');
  const fuelLines = lines.filter(l => l.line_type === 'fuel');

  const periodLabel = statement.period_start && statement.period_end
    ? `${format(new Date(statement.period_start + 'T12:00:00'), 'MMM d')} – ${format(new Date(statement.period_end + 'T12:00:00'), 'MMM d, yyyy')}`
    : statement.statement_date || '—';

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <p className="text-sm font-semibold">{periodLabel}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={`text-[10px] ${cfg.cls}`}>{cfg.label}</Badge>
            <span className="text-[11px] text-muted-foreground">{tripLines.length} trip{tripLines.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-base font-bold text-primary">{fmt(statement.final_check_amount)}</p>
            <p className="text-[10px] text-muted-foreground">net pay</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
              onClick={handlePrint}
              title="Print"
            >
              <Printer className="w-3.5 h-3.5" />
            </Button>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 space-y-4 pt-3">
          {/* Totals row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-500/10 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Gross</p>
              <p className="text-xs font-bold text-green-600">{fmt(statement.gross_total)}</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Deductions</p>
              <p className="text-xs font-bold text-red-600">-{fmt(statement.deductions_total)}</p>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Fuel</p>
              <p className="text-xs font-bold text-orange-600">-{fmt(statement.fuel_total)}</p>
            </div>
          </div>

          {/* Trips */}
          {tripLines.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Trips</p>
              <div className="space-y-1">
                {tripLines.map(l => (
                  <div key={l.id} className="flex justify-between items-center px-2.5 py-1.5 bg-muted/30 rounded text-xs gap-2">
                    <span className="truncate text-foreground">{l.description || l.route || '—'}</span>
                    <span className="font-semibold shrink-0">{fmt(l.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Credits */}
          {creditLines.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Credits</p>
              <div className="space-y-1">
                {creditLines.map(l => (
                  <div key={l.id} className="flex justify-between items-center px-2.5 py-1.5 bg-green-500/10 rounded text-xs gap-2">
                    <span className="truncate">{l.description || '—'}</span>
                    <span className="font-semibold text-green-600 shrink-0">{fmt(l.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deductions */}
          {deductionLines.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Deductions</p>
              <div className="space-y-1">
                {deductionLines.map(l => (
                  <div key={l.id} className="flex justify-between items-center px-2.5 py-1.5 bg-red-500/10 rounded text-xs gap-2">
                    <span className="truncate">{l.description || '—'}</span>
                    <span className="font-semibold text-red-600 shrink-0">-{fmt(Math.abs(l.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fuel */}
          {fuelLines.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Fuel Card</p>
              <div className="space-y-1">
                {fuelLines.map(l => (
                  <div key={l.id} className="flex justify-between items-center px-2.5 py-1.5 bg-orange-500/10 rounded text-xs gap-2">
                    <span className="truncate">{l.description || '—'}</span>
                    <span className="font-semibold text-orange-600 shrink-0">-{fmt(Math.abs(l.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

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

function DocUploadTab({ driver }) {
  const [docType, setDocType] = useState('bol');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState([]);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.DriverDocument.create({
        driver_id: driver.id,
        driver_name: driver.full_name,
        document_type: docType,
        file_name: file.name,
        file_url,
      });
      setUploaded(prev => [...prev, { name: file.name, type: docType }]);
      setFile(null);
      // Notify admin
      try {
        await base44.entities.Notification.create({
          tenant_id: driver.tenant_id,
          notification_type: 'driver_document_upload',
          title: `${DOC_TYPE_LABELS[docType] || docType} uploaded — ${driver.full_name}`,
          message: `${driver.full_name} uploaded a ${DOC_TYPE_LABELS[docType] || docType}: ${file.name}`,
          link_url: '/AdminDriverDocuments',
          read: false,
        });
      } catch {}
      // Reset file input
      const input = document.getElementById('portal-file-input');
      if (input) input.value = '';
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upload Document</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-3">Submit documents directly to dispatch.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Document Type</label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Select File</label>
                <label
                  htmlFor="portal-file-input"
                  className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  {file ? (
                    <div className="flex items-center gap-2 px-3 text-center">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-xs text-foreground font-medium truncate max-w-[200px]">{file.name}</span>
                      <button onClick={(e) => { e.preventDefault(); setFile(null); const input = document.getElementById('portal-file-input'); if (input) input.value = ''; }}>
                        <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Tap to select a photo or PDF</span>
                    </>
                  )}
                </label>
                <input
                  ref={fileRef}
                  id="portal-file-input"
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
              >
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Submit Document</>}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {uploaded.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uploaded This Session</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {uploaded.map((u, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.name}</p>
                    <p className="text-muted-foreground text-[11px]">{DOC_TYPE_LABELS[u.type] || u.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DriverPublicPortal() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('statements');
  const [token, setToken] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || null);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) { setError('No access token provided.'); setLoading(false); return; }

    base44.functions.invoke('driverPortalData', { token })
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => { setError(err?.response?.data?.error || 'Invalid or expired link.'); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="font-semibold text-lg">Access Denied</h2>
          <p className="text-sm text-muted-foreground">{error || 'This link is invalid or has expired. Please contact your dispatcher for a new link.'}</p>
        </div>
      </div>
    );
  }

  const { driver, truck, statements, statementLines, fuelTransactions } = data;

  const driverSession = {
    driver_id: driver.id,
    driver_name: driver.full_name,
    tenant_id: driver.tenant_id || '',
    truck_id: truck?.id || '',
    truck_number: truck?.unit_number || '',
  };

  const totalNetPay = statements.reduce((s, st) => s + (st.final_check_amount || 0), 0);
  const latestStatement = statements[0] || null;
  const totalGross = latestStatement ? (latestStatement.gross_total || 0) : 0;

  // Group statement lines by statement_id
  const linesByStatement = {};
  for (const line of statementLines) {
    if (!linesByStatement[line.statement_id]) linesByStatement[line.statement_id] = [];
    linesByStatement[line.statement_id].push(line);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="h-13 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 md:px-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-sidebar-primary" />
          <span className="font-bold text-sidebar-primary-foreground text-xs tracking-widest">TRUCKOPS</span>
          <span className="text-sidebar-foreground/40 text-xs ml-1">· Driver Portal</span>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-sidebar-primary-foreground">{driver.full_name}</p>
          {truck && <p className="text-[10px] text-sidebar-foreground/60">Truck #{truck.unit_number}</p>}
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-card border-b border-border px-4 md:px-6 py-3 flex gap-4 md:gap-8">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Net Pay</p>
          <p className="text-lg font-bold text-primary">{fmt(totalNetPay)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Latest Gross</p>
          <p className="text-lg font-bold text-green-600">{fmt(totalGross)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Statements</p>
          <p className="text-lg font-bold">{statements.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border px-4 md:px-6 flex-shrink-0">
        <div className="flex">
          {[
            { key: 'statements', label: 'My Statements', TabIcon: Calendar },
            { key: 'fuel', label: 'Fuel Transactions', TabIcon: Fuel },
            { key: 'upload', label: 'Upload Docs', TabIcon: Upload },
            { key: 'profile', label: 'My Profile', TabIcon: User },
          ].map(({ key, label, TabIcon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-3">

          {activeTab === 'statements' && (
            <>
              {statements.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No statements available yet.</p>
                  <p className="text-xs mt-1 opacity-70">Statements appear here once published by your dispatcher.</p>
                </div>
              ) : (
                statements.map(stmt => (
                  <StatementCard
                    key={stmt.id}
                    statement={stmt}
                    lines={linesByStatement[stmt.id] || []}
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'upload' && <DocUploadTab driver={driver} />}

          {activeTab === 'profile' && <DriverMyProfile session={driverSession} token={token} />}

          {activeTab === 'fuel' && (
            <>
              {fuelTransactions.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Fuel className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No fuel transactions found.</p>
                </div>
              ) : (
                <Card>
                  <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Fuel Transactions ({fuelTransactions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {fuelTransactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between px-4 py-3 text-xs">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{tx.location_name || tx.city || '—'}</p>
                            <p className="text-muted-foreground text-[11px] mt-0.5">
                              {tx.transaction_date || '—'}{tx.city && tx.state ? ` · ${tx.city}, ${tx.state}` : ''}
                              {tx.gallons ? ` · ${tx.gallons} gal` : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="font-bold text-orange-600">{fmt(tx.fuel_amount || tx.total_amount || 0)}</p>
                            {tx.card_number && <p className="text-[10px] text-muted-foreground">#{tx.card_number}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

        </div>
      </div>

      <div className="text-center py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground">Read-only view · {driver.full_name} · TruckOps</p>
      </div>
    </div>
  );
}