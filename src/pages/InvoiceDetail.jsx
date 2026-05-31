import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, ArrowLeft, Plus, Trash2, Download, Check } from 'lucide-react';
import StatusBadge from '../components/shared/StatusBadge';
import { logAudit } from '../components/shared/AuditLogger';
import { toast } from 'sonner';
import { printInvoice } from '../components/print/printInvoice';

export default function InvoiceDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('id');
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const { isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const inv = await base44.entities.Invoice.get(invoiceId);
      if (inv) {
        setForm(inv);
        setLineItems(inv.line_items || []);
      }
      return inv;
    },
    enabled: !!invoiceId,
  });

  const { data: invoiceStops = [] } = useQuery({
    queryKey: ['load-stops-invoice', form?.load_id],
    queryFn: () => base44.entities.LoadStop.filter({ load_id: form.load_id }, 'stop_order', 20),
    enabled: !!form?.load_id,
  });

  const { data: carrierCompany = [] } = useQuery({
    queryKey: ['settings-company'],
    queryFn: () => base44.entities.Company.filter({ company_type: 'carrier' }, '-created_date', 1),
  });

  const handlePrint = () => {
    printInvoice({
      company: carrierCompany[0] || {},
      invoice: form,
      lineItems,
      stops: invoiceStops,
    });
  };

  const addLine = () => setLineItems(prev => [...prev, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  const removeLine = (i) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const setLineItem = (i, key, val) => {
    setLineItems(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, [key]: val };
      if (key === 'quantity' || key === 'rate') updated.amount = (key === 'quantity' ? val : l.quantity) * (key === 'rate' ? val : l.rate);
      return updated;
    }));
  };

  const subtotal = lineItems.reduce((s, l) => s + (l.amount || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, line_items: lineItems, subtotal, total: subtotal };
      await base44.entities.Invoice.update(invoiceId, payload);
      await logAudit({ action_type: 'update', entity_type: 'Invoice', entity_id: invoiceId, entity_label: form.invoice_number });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice saved');
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;
  if (!form) return <div className="p-4 text-sm text-muted-foreground">Invoice not found</div>;

  return (
    <div className="p-4 space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-3.5 h-3.5" /> Invoices
        </Button>
        <h2 className="text-sm font-semibold">Invoice {form.invoice_number}</h2>
        <StatusBadge status={form.status} />
        <div className="ml-auto flex gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">Save</span>
          </Button>
          <Button size="sm" className="h-8 gap-1 bg-green-700 hover:bg-green-800 text-white" onClick={handlePrint}>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Download PDF</span>
          </Button>
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2 text-xs">
            {form.created_date && <div className="flex items-center gap-2"><Check className="w-3 h-3 text-green-600" /> <span className="text-muted-foreground">Created:</span> <span className="font-medium">{new Date(form.created_date).toLocaleDateString()}</span></div>}
            {form.invoice_date && <div className="flex items-center gap-2"><Check className="w-3 h-3 text-blue-600" /> <span className="text-muted-foreground">Invoice Date:</span> <span className="font-medium">{new Date(form.invoice_date + 'T12:00:00').toLocaleDateString()}</span></div>}
            {(form.status === 'sent' || form.status === 'paid' || form.status === 'overdue' || form.status === 'partial') && <div className="flex items-center gap-2"><Check className="w-3 h-3 text-cyan-600" /> <span className="text-muted-foreground">Sent:</span> <span className="font-medium">{form.invoice_date ? new Date(form.invoice_date + 'T12:00:00').toLocaleDateString() : '—'}</span></div>}
            {(form.status === 'paid' || form.status === 'partial') && form.updated_date && <div className="flex items-center gap-2"><Check className="w-3 h-3 text-green-600" /> <span className="text-muted-foreground">Paid:</span> <span className="font-medium">{new Date(form.updated_date).toLocaleDateString()}</span></div>}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="col-span-2">
           <CardHeader className="py-3 px-4"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice Details</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Invoice #</Label>
              <Input value={form.invoice_number || ''} onChange={(e) => set('invoice_number', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Load #</Label>
              <Input value={form.load_number || ''} onChange={(e) => set('load_number', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status || ''} onValueChange={(v) => set('status', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['draft','sent','partial','paid','overdue','canceled'].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Customer</Label>
              <Input value={form.customer_name || ''} onChange={(e) => set('customer_name', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Invoice Date</Label>
              <Input type="date" value={form.invoice_date || ''} onChange={(e) => set('invoice_date', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={form.due_date || ''} onChange={(e) => set('due_date', e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div className="col-span-3">
              <Label className="text-xs">Bill To Address</Label>
              <Textarea value={form.bill_to_address || ''} onChange={(e) => set('bill_to_address', e.target.value)} className="text-xs mt-1 h-16" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-2 text-sm">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold text-xs">Total</span>
              <span className="text-xl font-bold">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line Items</CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addLine}><Plus className="w-3 h-3" /> Add Line</Button>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
              <div className="col-span-6">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Rate</div>
              <div className="col-span-1">Amount</div>
              <div className="col-span-1"></div>
            </div>
            {lineItems.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6"><Input value={line.description || ''} onChange={(e) => setLineItem(i, 'description', e.target.value)} className="h-7 text-xs" placeholder="Description" /></div>
                <div className="col-span-2"><Input type="number" value={line.quantity || ''} onChange={(e) => setLineItem(i, 'quantity', Number(e.target.value))} className="h-7 text-xs" /></div>
                <div className="col-span-2"><Input type="number" value={line.rate || ''} onChange={(e) => setLineItem(i, 'rate', Number(e.target.value))} className="h-7 text-xs" /></div>
                <div className="col-span-1 text-xs font-medium">${(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div className="col-span-1 flex justify-center"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLine(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button></div>
              </div>
            ))}
            {lineItems.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No line items. Click "Add Line" to start.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <Textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} className="text-xs h-20" placeholder="Notes to customer..." />
        </CardContent>
      </Card>
    </div>
  );
}