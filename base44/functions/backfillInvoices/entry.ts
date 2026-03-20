import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all loads that have an invoice status (not not_invoiced)
    const allLoads = await base44.asServiceRole.entities.Load.list('-created_date', 2000);
    const loadsNeedingInvoice = allLoads.filter(l =>
      l.invoice_status && l.invoice_status !== 'not_invoiced' && l.invoice_status !== 'canceled'
    );

    // Get all existing invoices
    const allInvoices = await base44.asServiceRole.entities.Invoice.list('-created_date', 2000);
    const invoicedLoadIds = new Set(allInvoices.map(i => i.load_id).filter(Boolean));

    // Find loads with no invoice record
    const loadsWithoutInvoice = loadsNeedingInvoice.filter(l => !invoicedLoadIds.has(l.id));

    if (loadsWithoutInvoice.length === 0) {
      return Response.json({ success: true, message: 'No missing invoices found', created: 0 });
    }

    // Get highest invoice number
    const invoiceNumbers = allInvoices
      .map(i => parseInt(i.invoice_number?.replace(/\D/g, '') || '0'))
      .filter(n => !isNaN(n));
    let lastNum = invoiceNumbers.length > 0 ? Math.max(...invoiceNumbers) : 999;

    const statusMap = {
      invoiced: 'draft',
      sent: 'sent',
      partial: 'partial',
      paid: 'paid',
      overdue: 'overdue',
    };

    let created = 0;
    for (const load of loadsWithoutInvoice) {
      lastNum++;
      const invoiceNumber = `INV-${lastNum}`;
      const today = new Date().toISOString().split('T')[0];
      await base44.asServiceRole.entities.Invoice.create({
        invoice_number: invoiceNumber,
        load_id: load.id,
        load_number: load.internal_load_number,
        customer_id: load.customer_id || null,
        customer_name: load.customer_name || '',
        invoice_date: load.pickup_date || today,
        total: load.invoice_amount || 0,
        subtotal: load.invoice_amount || 0,
        status: statusMap[load.invoice_status] || 'draft',
        line_items: [
          ...(load.freight_rate ? [{ description: 'Line Haul', quantity: 1, rate: load.freight_rate, amount: load.freight_rate }] : []),
          ...(load.fuel_surcharge ? [{ description: 'Fuel Surcharge', quantity: 1, rate: load.fuel_surcharge, amount: load.fuel_surcharge }] : []),
          ...(load.extra_charges ? [{ description: 'Extra Charges', quantity: 1, rate: load.extra_charges, amount: load.extra_charges }] : []),
        ],
      });
      created++;
    }

    return Response.json({ success: true, created, message: `Created ${created} missing invoices` });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});