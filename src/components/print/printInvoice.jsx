export function printInvoice({ company, invoice, lineItems, stops }) {
  const fmt = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const total = lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0) || invoice.total || invoice.invoice_amount || 0;
  const allStops = [...stops].sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));

  const pickups = allStops.filter(s => s.stop_type === 'pickup');
  const deliveries = allStops.filter(s => s.stop_type === 'delivery');
  const routeSummary = pickups.length && deliveries.length
    ? `${pickups[0].city || ''}, ${pickups[0].state || ''} - ${deliveries[deliveries.length - 1].city || ''}, ${deliveries[deliveries.length - 1].state || ''}`
    : (invoice.route_summary || '');

  const stopTypeLabel = { pickup: 'PickUp', delivery: 'Delivery', stop: 'Stop' };
  const stopTypeColor = { pickup: '#1a56db', delivery: '#1a56db', stop: '#555' };

  const effectiveItems = lineItems.length > 0 ? lineItems : [
    { description: 'Freight Income', amount: invoice.freight_rate || invoice.total || 0 },
    ...(invoice.fuel_surcharge ? [{ description: 'Fuel Surcharge', amount: invoice.fuel_surcharge }] : []),
    ...(invoice.extra_charges ? [{ description: 'Extra Charges', amount: invoice.extra_charges }] : []),
  ];
  const effectiveTotal = effectiveItems.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number || ''}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:32px 40px;border:1px dashed #aaa;margin:16px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
    .company-info{font-size:11px;line-height:1.8;color:#1a56db}
    .company-info strong{font-size:12px;display:block;color:#1a56db}
    .invoice-word{font-size:26px;font-weight:bold;letter-spacing:2px;color:#000}
    .two-col{display:flex;justify-content:space-between;gap:20px;margin-bottom:24px;align-items:flex-start}
    .bill-to-box{border:1px solid #000;padding:10px 14px;width:42%;font-size:11px;line-height:1.9;min-height:90px}
    .bill-to-box .label{font-weight:bold;margin-bottom:4px}
    .bill-to-box .name{font-weight:bold;font-size:12px}
    .meta-table{border-collapse:collapse;font-size:11px;width:46%}
    .meta-table td{padding:4px 10px;border:1px solid #ccc}
    .meta-table td:first-child{font-weight:bold;background:#f7f7f7;width:44%;border-right:2px solid #ccc;text-align:right}
    table.data{width:100%;border-collapse:collapse;margin-bottom:16px}
    table.data th{background:#1a56db;color:#fff;padding:5px 8px;text-align:left;font-size:10px;border:1px solid #1247a3}
    table.data td{border:1px solid #ccc;padding:4px 8px;font-size:11px}
    .stops-block{margin-bottom:20px}
    .stops-header{display:grid;grid-template-columns:100px 220px 1fr;gap:0;font-size:10.5px;font-weight:bold;text-decoration:underline;margin-bottom:4px;color:#1a56db}
    .stop-row{display:grid;grid-template-columns:100px 220px 1fr;gap:0;font-size:11px;padding:2px 0;color:#1a56db}
    .stop-row span:first-child{font-weight:bold}
    .bottom-section{display:flex;justify-content:space-between;align-items:flex-start;margin-top:8px;gap:20px}
    .notes-area{flex:1;font-size:11px}
    .notes-area strong{display:block;margin-bottom:4px}
    .items-area{width:42%}
    table.items{width:100%;border-collapse:collapse;font-size:11px}
    table.items th{border:1px solid #ccc;padding:4px 8px;background:#f0f0f0;font-weight:bold}
    table.items td{border:1px solid #ccc;padding:4px 8px}
    table.items .item-desc{color:#1a56db}
    table.items .subtotal td{font-weight:bold;border-top:2px solid #ccc}
    .total-box{margin-top:16px;display:flex;justify-content:flex-end}
    .total-table{border:1px solid #000;font-size:11px}
    .total-table td{padding:5px 14px}
    .total-table td:first-child{font-weight:bold;border-right:1px solid #ccc}
    .total-table .total-val{font-weight:bold}
    .page-footer{display:flex;justify-content:space-between;margin-top:40px;padding-top:8px;border-top:1px solid #ccc;font-size:10px;color:#1a56db}
    .page-footer .center{text-align:center;color:#1a56db}
    @page{margin:0.4in}
  </style>
</head>
<body>
  <div class="top">
    <div class="company-info">
      <strong>${company.company_name || ''}</strong>
      ${company.address_1 ? company.address_1 + '<br>' : ''}
      ${company.address_2 ? company.address_2 + '<br>' : ''}
      ${company.city || ''}${company.state ? ', ' + company.state : ''} ${company.zip || ''}<br>
      ${company.phone ? 'Phone #: ' + company.phone : ''}
    </div>
    <div class="invoice-word">INVOICE</div>
  </div>

  <div class="two-col">
    <div class="bill-to-box">
      <div class="label">Bill To :</div><br>
      <div class="name">${invoice.customer_name || ''}</div>
      ${invoice.bill_to_address ? invoice.bill_to_address.replace(/\n/g, '<br>') : ''}
    </div>
    <table class="meta-table">
      <tr><td>Invoice Date</td><td>${invoice.invoice_date || ''}</td></tr>
      <tr><td>Invoice #</td><td>${invoice.invoice_number || ''}</td></tr>
      <tr><td>Customer Load #</td><td>${invoice.load_number || ''}</td></tr>
      <tr><td>Terms</td><td>${invoice.payment_terms || 'NET 30'}</td></tr>
      <tr><td>Due Date</td><td>${invoice.due_date || ''}</td></tr>
    </table>
  </div>

  ${allStops.length > 0 ? `
  <table class="data" style="margin-bottom:16px">
    <thead>
      <tr>
        <th style="width:90px">Date</th>
        <th>Customer Load #</th>
        <th>Trailer #</th>
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

  <div class="stops-block">
    <div class="stops-header">
      <span>Stop Type</span>
      <span>Address</span>
      <span>Ref #</span>
    </div>
    ${allStops.map(s => `
    <div class="stop-row" style="color:${stopTypeColor[s.stop_type] || '#555'}">
      <span>${stopTypeLabel[s.stop_type] || s.stop_type || ''}</span>
      <span>${s.city || ''}${s.state ? ', ' + s.state : ''} ${s.zip || ''}</span>
      <span>${s.reference_number || s.bol_number || ''}</span>
    </div>`).join('')}
  </div>` : ''}

  <div class="bottom-section">
    <div class="notes-area">
      <strong>Notes :</strong>
      ${invoice.notes || ''}
    </div>
    <div class="items-area">
      <table class="items">
        <thead><tr><th style="width:70%">Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${effectiveItems.map(l => `<tr>
            <td class="item-desc">${l.description || ''}</td>
            <td style="text-align:right">${fmt(l.amount)}</td>
          </tr>`).join('')}
          <tr class="subtotal">
            <td style="text-align:right;font-weight:bold">Sub Total :</td>
            <td style="text-align:right;font-weight:bold">${fmt(effectiveTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div class="total-box">
        <table class="total-table">
          <tr><td>Total Due:</td><td class="total-val">${fmt(effectiveTotal)}</td></tr>
        </table>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>${company.company_name || ''}</span>
    <span class="center"></span>
    <span>Page 1 Of 1</span>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1200');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}