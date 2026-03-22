import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { load_id, load_invoice_status } = await req.json();

    if (!load_id) {
      return Response.json({ error: 'Missing load_id' }, { status: 400 });
    }

    // Fetch the load
    const load = await base44.entities.Load.get(load_id);
    if (!load) {
      return Response.json({ error: 'Load not found' }, { status: 404 });
    }

    // Check if invoice already exists for this load
    const existing = await base44.entities.Invoice.filter({ load_id });
    
    if (existing.length > 0) {
      // Update existing invoice
      const invoice = existing[0];
      await base44.entities.Invoice.update(invoice.id, {
        status: load_invoice_status || 'draft',
        invoice_date: load.invoice_date || new Date().toISOString().split('T')[0],
      });
      return Response.json({ success: true, action: 'updated', invoiceId: invoice.id });
    }

    // Create new invoice from load
    const invoiceNumber = `INV-${load.internal_load_number}`;
    const total = (load.freight_rate || 0) + (load.fuel_surcharge || 0) + (load.extra_charges || 0);

    const invoice = await base44.entities.Invoice.create({
      invoice_number: invoiceNumber,
      load_id: load.id,
      load_number: load.internal_load_number,
      customer_id: load.customer_id,
      customer_name: load.customer_name,
      invoice_date: load.invoice_date || new Date().toISOString().split('T')[0],
      due_date: load.due_date || null,
      payment_terms: load.payment_terms || 'net_30',
      status: load_invoice_status || 'draft',
      subtotal: total,
      total: total,
      line_items: [
        {
          description: 'Line Haul',
          quantity: 1,
          rate: load.freight_rate || 0,
          amount: load.freight_rate || 0,
        },
        ...(load.fuel_surcharge ? [{
          description: 'Fuel Surcharge',
          quantity: 1,
          rate: load.fuel_surcharge,
          amount: load.fuel_surcharge,
        }] : []),
        ...(load.extra_charges ? [{
          description: 'Extra Charges',
          quantity: 1,
          rate: load.extra_charges,
          amount: load.extra_charges,
        }] : []),
      ],
    });

    return Response.json({ success: true, action: 'created', invoiceId: invoice.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});