export function printInvoice({ company, invoice, lineItems, stops }) {
  const fmt = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const total = lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const pickups = stops.filter(s => s.stop_type === 'pickup');
  const deliveries = stops.filter(s => s.stop_type === 'delivery');
  const route = stops.length >= 2
    ? `${pickups[0]?.city || ''}, ${pickups[0]?.state || ''} - ${deliveries[deliveries.length-1]?.city || ''}, ${deliveries[deliveries.length-1]?.state || ''}`
    : (invoice.route_summary || '');

  const allStops = [...pickups, ...deliveries, ...stops.filter(s => s.stop_type === 'stop')].sort((a,b) => (a.stop_order||0)-(b.stop_order||0));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number || ''}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:24px 32px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
    .company-info{font-size:10px;line-height:1.6}
    .invoice-title{font-size:22px;font-weight:bold;text-align:right}
    .two-col{display:flex;justify-content:space-between;margin-bottom:20px;gap:20px}
    .bill-to{border:1px solid #000;padding:8px 12px;flex:1;font-size:11px;line-height:1.7}
    .invoice-meta{border:1px solid #000;font-size:10px}
    .invoice-meta td{padding:3px 10px;border-bottom:1px solid #eee}
    .invoice-meta td:first-child{font-weight:bold;border-right:1px solid #ccc;background:#f5f5f5}
    table.data{width:100%;border-collapse:collapse;margin-bottom:12px}
    table.data th{background:#3a6bbf;color:#fff;padding:4px 8px;text-align:left;font-size:10px;border:1px solid #2a5baf}
    table.data td{border:1px solid #ccc;padding:4px 8px;font-size:10px}
    .stops-section{margin-bottom:14px}
    .stops-section p{font-size:10.5px;font-weight:bold;margin-bottom:4px;text-decoration:underline}
    .stop-row{display:flex;gap:24px;font-size:10px;padding:2px 0;color:#1155cc}
    .stop-row span{min-width:80px;font-weight:bold}
    .totals-section{display:flex;justify-content:flex-end;margin-top:8px}
    .totals-table{border:1px solid #000;font-size:10.5px}
    .totals-table td{padding:4px 12px;border-bottom:1px solid #eee}
    .totals-table td:first-child{border-right:1px solid #ccc}
    .totals-table .grand{font-weight:bold;font-size:11px;background:#f0f0f0}
    .notes{margin-top:20px;font-size:10px}
    .page-footer{text-align:center;margin-top:40px;font-size:9.5px;color:#555;border-top:1px solid #ccc;padding-top:6px}
    @page{margin:0.5in}
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <strong>${company.company_name || ''}</strong><br>
      ${company.address_1 || ''}<br>
      ${company.city || ''}${company.state ? ', ' + company.state : ''} ${company.zip || ''}<br>
      ${company.phone ? 'Phone #: ' + company.phone : ''}
    </div>
    <div class="invoice-title">INVOICE</div>
  </div>

  <div class="two-col">
    <div class="bill-to">
      <strong>Bill To :</strong><br><br>
      <strong>${invoice.customer_name || ''}</strong><br>
      ${invoice.bill_to_address ? invoice.bill_to_address.replace(/\n/g, '<br>') : ''}
    </div>
    <table class="invoice-meta">
      <tr><td>Invoice Date</td><td>${invoice.invoice_date || ''}</td></tr>
      <tr><td>Invoice #</td><td>${invoice.invoice_number || ''}</td></tr>
      <tr><td>Customer Load #</td><td>${invoice.load_number || ''}</td></tr>
      <tr><td>Terms</td><td>${invoice.payment_terms || 'NET 30'}</td></tr>
      <tr><td>Due Date</td><td>${invoice.due_date || ''}</td></tr>
    </table>
  </div>

  ${allStops.length > 0 ? `
  <table class="data" style="margin-bottom:10px">
    <thead><tr><th>Date</th><th>Customer Load #</th><th>Trailer #</th><th>Route</th></tr></thead>
    <tbody><tr>
      <td>${pickups[0]?.appointment_date || invoice.invoice_date || ''}</td>
      <td>${invoice.load_number || ''}</td>
      <td>${invoice.trailer_number || ''}</td>
      <td>${route}</td>
    </tr></tbody>
  </table>

  <div class="stops-section">
    <p>Stop Type &nbsp;&nbsp;&nbsp;&nbsp; Address &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Ref #</p>
    ${allStops.map(s => `
    <div class="stop-row">
      <span>${s.stop_type?.charAt(0).toUpperCase() + s.stop_type?.slice(1) || ''}</span>
      <span style="min-width:200px">${s.city || ''}${s.state ? ', ' + s.state : ''} ${s.zip || ''}</span>
      <span>${s.reference_number || s.bol_number || ''}</span>
    </div>`).join('')}
  </div>` : ''}

  <div style="margin-top:16px">
    <table class="data">
      <thead><tr><th style="width:80%">Description</th><th>Amount</th></tr></thead>
      <tbody>
        ${lineItems.length > 0 ? lineItems.map(l => `<tr>
          <td style="color:#1155cc">${l.description || ''}</td>
          <td style="text-align:right">${fmt(l.amount)}</td>
        </tr>`).join('') : `<tr><td style="color:#1155cc">Freight Income</td><td style="text-align:right">${fmt(invoice.freight_rate || invoice.total || 0)}</td></tr>`}
        <tr><td style="text-align:right;font-weight:bold">Sub Total :</td><td style="text-align:right;font-weight:bold">${fmt(total || invoice.total || 0)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="totals-section">
    <table class="totals-table">
      <tr class="grand"><td>Total Due:</td><td>${fmt(total || invoice.total || 0)}</td></tr>
    </table>
  </div>

  ${invoice.notes ? `<div class="notes"><strong>Notes :</strong> ${invoice.notes}</div>` : '<div class="notes"><strong>Notes :</strong></div>'}

  <div class="page-footer">${company.company_name || ''}&nbsp;&nbsp;&nbsp;&nbsp;Page 1 Of 1</div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1200');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}