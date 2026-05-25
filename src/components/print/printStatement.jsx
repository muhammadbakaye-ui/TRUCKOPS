import { format } from 'date-fns';

export function printStatement({ company, statement, allLines }) {
  const tripLines = allLines.filter(l => l.line_type === 'trip' || l.line_type === 'adjustment');
  const creditLines = allLines.filter(l => l.line_type === 'credit');
  const deductionLines = allLines.filter(l => l.line_type === 'deduction' || l.line_type === 'advance');
  const fuelLines = allLines.filter(l => l.line_type === 'fuel');

  const fmt = (n) => `$${Math.abs(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtNeg = (n) => `($${Math.abs(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;

  const tripsTotal = tripLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const creditsTotal = creditLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const deductionsTotal = deductionLines.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0);
  const fuelTotal = fuelLines.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0);
  const checkAmount = tripsTotal + creditsTotal - deductionsTotal - fuelTotal;
  const ytdAmount = statement.gross_total || tripsTotal;

  const co = company || {};

  const stmtDate = statement.statement_date
    ? (() => { const [y,m,d] = statement.statement_date.split('-'); return `${parseInt(m)}-${parseInt(d)}-${y}`; })()
    : '';
  const docTitle = `Statement ${statement.truck_number || ''} ${stmtDate}`.trim();
  const safeName = (statement.driver_name || 'Driver').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
  const pdfFilename = `${safeName}-${stmtDate.replace(/\//g, '-')}.pdf`;

  const tripsRows = tripLines.map(l => {
    const tripNum = l.description?.includes(' / ') ? l.description.split(' / ')[0].trim() : '';
    return `<tr>
      <td style="text-align:center">${l.date || ''}</td>
      <td style="text-align:center">${tripNum}</td>
      <td>${l.route || ''}</td>
      <td>${l.description || ''}</td>
      <td style="text-align:right">${fmt(l.amount)}</td>
    </tr>`;
  }).join('');

  const deductionRows = deductionLines.map(l => `<tr>
    <td>${l.description || ''}</td>
    <td style="text-align:center">${l.date || ''}</td>
    <td style="text-align:right">${fmtNeg(l.amount)}</td>
  </tr>`).join('');

  const creditRows = creditLines.map(l => `<tr>
    <td>${l.description || ''}</td>
    <td style="text-align:center">${l.date || ''}</td>
    <td style="text-align:right">${fmt(l.amount)}</td>
  </tr>`).join('');

  const fuelRows = fuelLines.map(l => {
    const clean = (v) => (v && v !== 'null') ? v : '';
    return `<tr>
      <td style="text-align:center">${clean(l.card_number)}</td>
      <td>${clean(l.location_name)}</td>
      <td>${clean(l.description)}</td>
      <td style="text-align:center">${clean(l.city_state)}</td>
      <td style="text-align:right">$0.00</td>
      <td style="text-align:right">$0.00</td>
      <td style="text-align:right">$0.00</td>
      <td style="text-align:center">${clean(l.date)}</td>
      <td style="text-align:right">${fmtNeg(l.amount)}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; user-select: text !important; -webkit-user-select: text !important; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
    .page { width: 100%; padding: 32px 48px; max-width: 100%; }

    /* HEADER */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .co-info { font-size: 10px; line-height: 1.7; color: #000; }
    .stmt-title { text-align: right; font-size: 13px; font-weight: bold; line-height: 2; color: #000; }

    /* SECTIONS */
    .driver-name { font-weight: bold; font-size: 11.5px; margin-bottom: 10px; }
    .section-title { font-weight: bold; font-size: 11px; margin: 14px 0 4px 0; }

    /* TABLES */
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    th {
      background: #fff;
      color: #000;
      padding: 4px 6px;
      text-align: center;
      font-size: 9.5px;
      font-weight: bold;
      border: 1px solid #000;
    }
    td {
      border: 1px solid #000;
      padding: 3px 6px;
      font-size: 10px;
      color: #000;
    }
    .total-row td {
      font-weight: bold;
      background: #fff;
      border-top: 1px solid #000;
    }

    /* FOOTER */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
      padding-top: 8px;
      border-top: 2px solid #000;
      font-size: 12px;
      font-weight: bold;
    }
    .footer .ytd { color: #0055bb; }
    .footer .check-box { border: 2px solid #000; padding: 5px 14px; color: #0055bb; font-size: 12px; font-weight: bold; }

    /* PAGE FOOTER */
    .page-footer { text-align: center; margin-top: 32px; font-size: 9.5px; color: #555; border-top: 1px solid #000; padding-top: 6px; }

    /* DOWNLOAD BAR */
    .download-bar { position: fixed; bottom: 24px; right: 32px; display: flex; gap: 10px; z-index: 9999; }
    .btn-print { background: #1a3a6b; color: #fff; border: none; padding: 10px 22px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.25); letter-spacing: 0.5px; }
    .btn-pdf { background: #166534; color: #fff; border: none; padding: 10px 22px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.25); letter-spacing: 0.5px; }
    .btn-print:hover { background: #14306a; }
    .btn-pdf:hover { background: #14532d; }

    @page { size: letter; margin: 0.4in 0.5in; }
    @media print {
      .page { padding: 0; }
      .download-bar { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="co-info">
      ${co.company_name || 'UNITY TRANSPORTATION LLC'}<br>
      ${co.address_1 || 'P.O BOX 56521'}<br>
      ${[co.city, co.state, co.zip].filter(Boolean).join(', ') || 'SAINT LOUIS, MO 63156'}<br>
      Phone #: ${co.phone || '(573)742-8547'}
    </div>
    <div class="stmt-title">
      Statement<br>
      ${statement.statement_date ? format(new Date(statement.statement_date + 'T12:00:00'), 'M-d-yyyy') : ''}<br>
      ${statement.driver_name || ''}<br>
      Unit #${statement.truck_number || ''}<br>
      (${statement.driver_name || ''})
    </div>
  </div>

  <div class="driver-name">${statement.driver_name || ''}</div>

  ${tripLines.length > 0 ? `
  <div class="section-title">Trips :</div>
  <table>
    <thead><tr>
      <th>Date</th>
      <th>Trip #</th>
      <th>Route</th>
      <th>Description</th>
      <th>Amount</th>
    </tr></thead>
    <tbody>
      ${tripsRows}
      <tr class="total-row">
        <td colspan="4" style="text-align:right">Total:</td>
        <td style="text-align:right;font-weight:bold">${fmt(tripsTotal)}</td>
      </tr>
    </tbody>
  </table>` : ''}

  ${deductionLines.length > 0 ? `
  <div class="section-title">Deductions :</div>
  <table>
    <thead><tr>
      <th>Description</th>
      <th>Date</th>
      <th>Amount</th>
    </tr></thead>
    <tbody>
      ${deductionRows}
      <tr class="total-row">
        <td colspan="2" style="text-align:right">Total:</td>
        <td style="text-align:right;font-weight:bold">${fmtNeg(deductionsTotal)}</td>
      </tr>
    </tbody>
  </table>` : ''}

  ${creditLines.length > 0 ? `
  <div class="section-title">Credits :</div>
  <table>
    <thead><tr>
      <th>Description</th>
      <th>Date</th>
      <th>Amount</th>
    </tr></thead>
    <tbody>
      ${creditRows}
      <tr class="total-row">
        <td colspan="2" style="text-align:right">Total:</td>
        <td style="text-align:right;font-weight:bold">${fmt(creditsTotal)}</td>
      </tr>
    </tbody>
  </table>` : ''}

  ${fuelLines.length > 0 ? `
  <div class="section-title">Fuel Card :</div>
  <table>
    <thead><tr>
      <th>Fuel Card#</th>
      <th>Location</th>
      <th>Description</th>
      <th>City, State</th>
      <th>Advance ($)</th>
      <th>Advance Fee ($)</th>
      <th>Misc. ($)</th>
      <th>Date</th>
      <th>Amount</th>
    </tr></thead>
    <tbody>
      ${fuelRows}
      <tr class="total-row">
        <td colspan="8" style="text-align:right">Total:</td>
        <td style="text-align:right;font-weight:bold">${fmtNeg(fuelTotal)}</td>
      </tr>
    </tbody>
  </table>` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <div>Total Gross Year-To-Date : <span class="ytd">${fmt(ytdAmount)}</span></div>
    <div class="check-box">Check Amount: ${fmt(checkAmount)}</div>
  </div>

  <div class="page-footer">Page 1 Of 1</div>

</div>

<!-- DOWNLOAD BUTTON -->
<div class="download-bar">
  <button class="btn-print" onclick="doPrint('${pdfFilename}')">🖨 Print</button>
</div>

<script>
function doPrint(filename) {
  setTimeout(function() {
    if (window.electronAPI && window.electronAPI.printToPDF) {
      window.electronAPI.printToPDF(filename);
    } else {
      window.print();
    }
  }, 500);
}
</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}