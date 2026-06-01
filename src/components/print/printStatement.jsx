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

  const fmtPeriodDate = (d) => {
    if (!d) return '';
    try { return format(new Date(d + 'T12:00:00'), 'MMM d, yyyy'); } catch { return d; }
  };

  const tripsRows = tripLines.map(l => {
    const tripNum = l.description?.includes(' / ') ? l.description.split(' / ')[0].trim() : '';
    return `<tr>
      <td style="text-align:center;color:#374151">${l.date || ''}</td>
      <td style="text-align:center;color:#374151">${tripNum}</td>
      <td style="color:#374151">${l.route || ''}</td>
      <td style="color:#374151">${l.description || ''}</td>
      <td style="text-align:right;color:#111827;font-weight:600">${fmt(l.amount)}</td>
    </tr>`;
  }).join('');

  const deductionRows = deductionLines.map(l => `<tr>
    <td style="color:#374151">${l.description || ''}</td>
    <td style="text-align:center;color:#374151">${l.date || ''}</td>
    <td style="text-align:right;color:#dc2626;font-weight:500">${fmtNeg(l.amount)}</td>
  </tr>`).join('');

  const creditRows = creditLines.map(l => `<tr>
    <td style="color:#374151">${l.description || ''}</td>
    <td style="text-align:center;color:#374151">${l.date || ''}</td>
    <td style="text-align:right;color:#111827;font-weight:600">${fmt(l.amount)}</td>
  </tr>`).join('');

  const fuelRows = fuelLines.map(l => {
    const clean = (v) => (v && v !== 'null') ? v : '—';
    return `<tr>
      <td style="text-align:center;color:#374151">${clean(l.card_number)}</td>
      <td style="color:#374151">${clean(l.location_name)}</td>
      <td style="color:#374151">${clean(l.description)}</td>
      <td style="text-align:right;color:#374151">$0.00</td>
      <td style="text-align:right;color:#374151">$0.00</td>
      <td style="text-align:right;color:#374151">$0.00</td>
      <td style="text-align:center;color:#374151">${clean(l.date)}</td>
      <td style="text-align:right;color:#dc2626;font-weight:500">${fmtNeg(l.amount)}</td>
    </tr>`;
  }).join('');

  const sectionHeader = (title) => `
    <div style="display:flex;align-items:center;gap:10px;margin:22px 0 8px 0;">
      <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#111827;white-space:nowrap">${title}</span>
      <div style="flex:1;height:1px;background:#e5e7eb"></div>
    </div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; user-select: text !important; -webkit-user-select: text !important; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #111827; background: #f3f4f6; }
    .page-wrapper { padding: 24px; }
    .page { width: 100%; padding: 36px 52px; max-width: 100%; background: #fff; border: 1.5px solid #0f1117; }

    /* HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 18px;
      border-bottom: 2px solid #111827;
      margin-bottom: 14px;
    }
    .co-name { font-size: 18px; font-weight: 800; color: #111827; line-height: 1.2; margin-bottom: 5px; }
    .co-detail { font-size: 10px; color: #6b7280; line-height: 1.6; }
    .header-right { text-align: right; }
    .stmt-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #1d4ed8;
      border: 1.5px solid #1d4ed8;
      border-radius: 4px;
      padding: 2px 8px;
      margin-bottom: 8px;
    }
    .driver-name-large { font-size: 18px; font-weight: 800; color: #111827; line-height: 1.2; }
    .unit-number { font-size: 10px; color: #6b7280; margin-top: 3px; }

    /* META ROW */
    .meta-row {
      display: flex;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 6px;
      background: #f9fafb;
    }
    .meta-cell {
      flex: 1;
      padding: 9px 14px;
      border-right: 1px solid #e5e7eb;
    }
    .meta-cell:last-child { border-right: none; }
    .meta-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 3px; }
    .meta-value { font-size: 12px; font-weight: 600; color: #111827; }

    /* TABLES */
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th {
      background: #fff;
      color: #9ca3af;
      padding: 5px 8px;
      text-align: left;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      border-bottom: 1.5px solid #d1d5db;
    }
    th:last-child, td:last-child { text-align: right; }
    td {
      padding: 5px 8px;
      font-size: 10.5px;
      color: #374151;
      border-bottom: 0.5px solid #f3f4f6;
    }
    tbody tr:last-child td { border-bottom: none; }
    .total-row td {
      font-weight: 700;
      color: #111827;
      background: #f9fafb;
      border-top: 1.5px solid #d1d5db;
      border-bottom: none;
      padding-top: 6px;
      padding-bottom: 6px;
    }

    /* FOOTER */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 28px;
      padding-top: 14px;
      border-top: 2px solid #111827;
    }
    .ytd-label { font-size: 9.5px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
    .ytd-value { font-size: 13px; font-weight: 700; color: #374151; }
    .check-label { font-size: 9.5px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; text-align: right; margin-bottom: 3px; }
    .check-amount { font-size: 28px; font-weight: 800; color: #111827; text-align: right; line-height: 1; }

    /* PAGE FOOTER */
    .page-footer { text-align: center; margin-top: 28px; font-size: 9px; color: #d1d5db; }

    /* DOWNLOAD BAR */
    .download-bar { position: fixed; bottom: 24px; right: 32px; display: flex; gap: 10px; z-index: 9999; }
    .btn-print { background: #166534; color: #fff; border: none; padding: 10px 22px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.25); letter-spacing: 0.5px; }
    .btn-print:hover { background: #14532d; }

    @page { size: letter; margin: 0.4in 0.5in; }
    @media print {
      .page { padding: 0; }
      .download-bar { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page-wrapper">
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="co-name">${co.company_name || 'Your Company'}</div>
      <div class="co-detail">
        ${co.address_1 ? co.address_1 + '<br>' : ''}
        ${[co.city, co.state, co.zip].filter(Boolean).join(', ')}${co.phone ? '<br>Phone: ' + co.phone : ''}
      </div>
    </div>
    <div class="header-right">
      <div class="stmt-badge">Driver Statement</div>
      <div class="driver-name-large">${statement.driver_name || ''}</div>
      <div class="unit-number">${statement.truck_number ? 'Unit #' + statement.truck_number : ''}</div>
    </div>
  </div>

  <!-- META ROW -->
  <div class="meta-row">
    <div class="meta-cell">
      <div class="meta-label">Pay Period</div>
      <div class="meta-value">${fmtPeriodDate(statement.period_start)}${statement.period_end ? ' – ' + fmtPeriodDate(statement.period_end) : ''}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Due Date</div>
      <div class="meta-value">${fmtPeriodDate(statement.statement_date)}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Statement For</div>
      <div class="meta-value">${statement.driver_name || ''}</div>
    </div>
  </div>

  ${tripLines.length > 0 ? `
  ${sectionHeader('Trips')}
  <table>
    <thead><tr>
      <th>Date</th>
      <th>Trip #</th>
      <th>Route</th>
      <th>Description</th>
      <th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>
      ${tripsRows}
      <tr class="total-row">
        <td colspan="4" style="text-align:right">Total</td>
        <td style="text-align:right">${fmt(tripsTotal)}</td>
      </tr>
    </tbody>
  </table>` : ''}

  ${deductionLines.length > 0 ? `
  ${sectionHeader('Deductions')}
  <table>
    <thead><tr>
      <th>Description</th>
      <th style="text-align:center">Date</th>
      <th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>
      ${deductionRows}
      <tr class="total-row">
        <td colspan="2" style="text-align:right">Total</td>
        <td style="text-align:right;color:#dc2626">${fmtNeg(deductionsTotal)}</td>
      </tr>
    </tbody>
  </table>` : ''}

  ${creditLines.length > 0 ? `
  ${sectionHeader('Credits')}
  <table>
    <thead><tr>
      <th>Description</th>
      <th style="text-align:center">Date</th>
      <th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>
      ${creditRows}
      <tr class="total-row">
        <td colspan="2" style="text-align:right">Total</td>
        <td style="text-align:right">${fmt(creditsTotal)}</td>
      </tr>
    </tbody>
  </table>` : ''}

  ${fuelLines.length > 0 ? `
  ${sectionHeader('Fuel Card')}
  <table>
    <thead><tr>
      <th>Fuel Card #</th>
      <th>Location</th>
      <th>Description</th>
      <th style="text-align:right">Advance</th>
      <th style="text-align:right">Adv. Fee</th>
      <th style="text-align:right">Misc.</th>
      <th style="text-align:center">Date</th>
      <th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>
      ${fuelRows}
      <tr class="total-row">
        <td colspan="7" style="text-align:right">Total</td>
        <td style="text-align:right;color:#dc2626">${fmtNeg(fuelTotal)}</td>
      </tr>
    </tbody>
  </table>` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <div class="ytd-label">Total Gross Year-To-Date</div>
      <div class="ytd-value">${fmt(ytdAmount)}</div>
    </div>
    <div>
      <div class="check-label">Check Amount</div>
      <div class="check-amount">${fmt(checkAmount)}</div>
    </div>
  </div>

  <div class="page-footer">Page 1 of 1</div>

</div>
</div>

<!-- DOWNLOAD BUTTON -->
<div class="download-bar">
  <button class="btn-print" onclick="doPrint('${pdfFilename}')">⬇ Download PDF</button>
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