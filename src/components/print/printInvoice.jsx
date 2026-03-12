export function printInvoice({ company, invoice, lineItems, stops }) {
  const fmt = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const allStops = [...stops].sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
  const pickups = allStops.filter(s => s.stop_type === 'pickup');
  const deliveries = allStops.filter(s => s.stop_type === 'delivery');

  const routeSummary = pickups.length && deliveries.length
    ? `${pickups[0].city || ''}, ${pickups[0].state || ''} - ${deliveries[deliveries.length - 1].city || ''}, ${deliveries[deliveries.length - 1].state || ''}`
    : (invoice.route_summary || '');

  const effectiveItems = lineItems.length > 0 ? lineItems : [
    { description: 'Freight Income', amount: invoice.freight_rate || invoice.invoice_amount || invoice.total || 0 },
    ...(invoice.fuel_surcharge ? [{ description: 'Fuel Surcharge', amount: invoice.fuel_surcharge }] : []),
    ...(invoice.extra_charges ? [{ description: 'Extra Charges', amount: invoice.extra_charges }] : []),
  ];
  const subTotal = effectiveItems.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const stopTypeLabel = { pickup: 'PickUp', delivery: 'Delivery', stop: 'Stop' };

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
    }
    .page {
      border: 1.5px dashed #aaa;
      margin: 18px;
      padding: 28px 36px 20px 36px;
      min-height: 96vh;
      display: flex;
      flex-direction: column;
    }

    /* TOP HEADER */
    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 36px;
    }
    .company-block { font-size: 10.5px; line-height: 1.75; }
    .company-block .co-name { font-weight: bold; font-size: 11px; color: #1a3a6b; }
    .company-block .co-detail { color: #cc3300; }
    .invoice-heading {
      font-size: 28px;
      font-weight: bold;
      letter-spacing: 3px;
      color: #000;
      padding-right: 40px;
      padding-top: 4px;
    }

    /* BILL TO + META */
    .bill-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      gap: 24px;
    }
    .bill-to-box {
      border: 1px solid #000;
      padding: 8px 12px 12px;
      width: 42%;
      min-height: 90px;
      font-size: 11px;
      line-height: 1.8;
    }
    .bill-to-box .bt-label { font-weight: bold; margin-bottom: 6px; display: block; }
    .bill-to-box .bt-name { font-weight: bold; font-size: 12px; }
    .meta-table { border-collapse: collapse; font-size: 11px; width: 46%; }
    .meta-table td { padding: 4px 10px; border: 1px solid #ccc; }
    .meta-table td.lbl { font-weight: bold; background: #f5f5f5; text-align: right; width: 48%; border-right: 2px solid #bbb; }

    /* LOAD ROW TABLE */
    table.load-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    table.load-table th { background: #1a3a6b; color: #fff; padding: 5px 8px; font-size: 10.5px; border: 1px solid #122a55; text-align: left; }
    table.load-table td { border: 1px solid #ccc; padding: 5px 8px; font-size: 11px; }

    /* STOPS */
    .stops-section { margin-bottom: 24px; }
    .stops-header {
      display: grid;
      grid-template-columns: 100px 200px 1fr;
      gap: 0;
      font-size: 11px;
      font-weight: bold;
      text-decoration: underline;
      color: #1a56db;
      margin-bottom: 4px;
      padding-left: 2px;
    }
    .stop-row {
      display: grid;
      grid-template-columns: 100px 200px 1fr;
      font-size: 11px;
      color: #1a56db;
      padding: 2px 2px;
      line-height: 1.6;
    }

    /* BOTTOM */
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 8px;
      gap: 20px;
    }
    .notes-col { flex: 1; font-size: 11px; }
    .notes-col strong { display: block; margin-bottom: 4px; }
    .items-col { width: 44%; }

    table.items-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    table.items-table th { border: 1px solid #bbb; padding: 5px 10px; background: #ececec; font-weight: bold; }
    table.items-table td { border: 1px solid #ccc; padding: 5px 10px; }
    table.items-table .item-blue { color: #1a56db; }
    table.items-table .sub-row td { font-weight: bold; border-top: 2px solid #aaa; }

    .total-due-block { display: flex; justify-content: flex-end; margin-top: 20px; }
    table.total-table { border-collapse: collapse; font-size: 11px; }
    table.total-table td { border: 1px solid #000; padding: 5px 14px; }
    table.total-table td.lbl { font-weight: bold; border-right: 1px solid #ccc; background: #f5f5f5; }
    table.total-table td.val { font-weight: bold; }

    /* FOOTER */
    .page-footer {
      margin-top: auto;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #1a56db;
    }

    @page { margin: 0.3in; }
  </style>
</head>
<body>
<div class="page">

  <!-- TOP HEADER -->
  <div class="top-header">
    <div class="company-block">
      <span class="co-name">${company.company_name || ''}</span><br>
      <span class="co-detail">${company.address_1 || ''}${company.address_2 ? '<br>' + company.address_2 : ''}</span><br>
      <span class="co-detail">${company.city || ''}${company.state ? ', ' + company.state : ''} ${company.zip || ''}</span><br>
      ${company.phone ? `<span class="co-detail">Phone #: ${company.phone}</span>` : ''}
    </div>
    <div class="invoice-heading">INVOICE</div>
  </div>

  <!-- BILL TO + META -->
  <div class="bill-meta-row">
    <div class="bill-to-box">
      <span class="bt-label">Bill To :</span>
      <span class="bt-name">${invoice.customer_name || ''}</span><br>
      ${invoice.bill_to_address ? invoice.bill_to_address.replace(/\n/g, '<br>') : ''}
    </div>
    <table class="meta-table">
      <tr><td class="lbl">Invoice Date</td><td>${invoice.invoice_date || ''}</td></tr>
      <tr><td class="lbl">Invoice #</td><td>${invoice.invoice_number || ''}</td></tr>
      <tr><td class="lbl">Customer Load #</td><td>${invoice.load_number || ''}</td></tr>
      <tr><td class="lbl">Terms</td><td>${invoice.payment_terms || 'NET 30'}</td></tr>
      <tr><td class="lbl">Due Date</td><td>${invoice.due_date || ''}</td></tr>
    </table>
  </div>

  <!-- LOAD ROW TABLE -->
  <table class="load-table">
    <thead>
      <tr>
        <th style="width:90px">Date</th>
        <th>Customer Load #</th>
        <th style="width:110px">Trailer #</th>
        <th>Route</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${pickups[0]?.appointment_date || invoice.invoice_date || ''}</td>
        <td>${invoice.load_number || ''}</td>
        <td>${invoice.trailer_number || ''}</td>
        <td>${routeSummary}</td>
      </tr>
    </tbody>
  </table>

  <!-- STOPS -->
  ${allStops.length > 0 ? `
  <div class="stops-section">
    <div class="stops-header">
      <span>Stop Type</span>
      <span>Address</span>
      <span>Ref #</span>
    </div>
    ${allStops.map(s => `
    <div class="stop-row">
      <span>${stopTypeLabel[s.stop_type] || s.stop_type || ''}</span>
      <span>${s.city || ''}${s.state ? ', ' + s.state : ''} ${s.zip || ''}</span>
      <span>${s.reference_number || s.bol_number || ''}</span>
    </div>`).join('')}
  </div>` : '<div style="margin-bottom:24px"></div>'}

  <!-- BOTTOM: NOTES LEFT, ITEMS RIGHT -->
  <div class="bottom-section">
    <div class="notes-col">
      <strong>Notes :</strong>
      ${invoice.notes || ''}
    </div>
    <div class="items-col">
      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align:left">Description</th>
            <th style="text-align:right;width:110px">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${effectiveItems.map(l => `
          <tr>
            <td class="item-blue">${l.description || ''}</td>
            <td style="text-align:right">${fmt(l.amount)}</td>
          </tr>`).join('')}
          <tr class="sub-row">
            <td style="text-align:right">Sub Total :</td>
            <td style="text-align:right">${fmt(subTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- TOTAL DUE -->
  <div class="total-due-block">
    <table class="total-table">
      <tr>
        <td class="lbl">Total Due:</td>
        <td class="val">${fmt(subTotal)}</td>
      </tr>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="page-footer">
    <span>${company.company_name || ''}</span>
    <span></span>
    <span>Page 1 Of 1</span>
  </div>

</div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1200');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}