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

  const tableSection = (title, headers, rows, totalLabel, totalValue) => {
    if (rows.length === 0) return '';
    return `
      <p class="section-title">${title} :</p>
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows}
          <tr class="total-row">${totalLabel}<td style="text-align:right;font-weight:bold">${totalValue}</td></tr>
        </tbody>
      </table>`;
  };

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Statement - ${statement.driver_name || ''}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:24px 32px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
    .company-info{font-size:10px;line-height:1.6}
    .statement-title{text-align:center;font-size:13px;font-weight:bold;line-height:1.9}
    .section-title{font-weight:bold;font-size:11.5px;margin:12px 0 3px 0}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}
    th{background:#3a6bbf;color:#fff;padding:4px 6px;text-align:center;font-size:9.5px;border:1px solid #2a5baf}
    td{border:1px solid #ccc;padding:3px 6px;font-size:10px}
    .total-row td{font-weight:bold;background:#eee}
    .footer{display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:8px;border-top:2px solid #000;font-size:12px;font-weight:bold}
    .footer .ytd{color:#0055bb}
    .footer .check{border:1px solid #000;padding:4px 14px;color:#0055bb}
    .page-footer{text-align:center;margin-top:32px;font-size:9.5px;color:#555;border-top:1px solid #ccc;padding-top:6px}
    @page{margin:0.5in}
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      UNITY TRANSPORTATION LLC<br>
      P.O BOX 56521<br>
      SAINT LOUIS, MO 63156<br>
      Phone #: (573)742-8547
    </div>
    <div class="statement-title">
      Statement<br>
      ${statement.driver_name || ''}<br>
      ${statement.statement_date || ''}<br>
      Unit #${statement.truck_number || ''}<br>
      (${statement.driver_name || ''})
    </div>
  </div>

  <div style="margin-bottom:20px;font-size:11px"><strong>${statement.driver_name || ''}</strong></div>

  ${tableSection('Trips', ['Date','Trip #','Route','Description','Amount'],
    tripLines.map(l => `<tr>
      <td style="text-align:center">${l.date || ''}</td>
      <td style="text-align:center">${l.description?.split('/')[0]?.trim() || ''}</td>
      <td style="text-align:center">${l.route || ''}</td>
      <td style="text-align:center">${l.description || ''}</td>
      <td style="text-align:right">${fmt(l.amount)}</td>
    </tr>`).join(''),
    `<td colspan="4" style="text-align:right">Total:</td>`, fmt(tripsTotal)
  )}

  ${tableSection('Deductions', ['Description','Date','Amount'],
    deductionLines.map(l => `<tr>
      <td style="text-align:center">${l.description || ''}</td>
      <td style="text-align:center">${l.date || ''}</td>
      <td style="text-align:right">${fmtNeg(l.amount)}</td>
    </tr>`).join(''),
    `<td colspan="2" style="text-align:right">Total:</td>`, fmtNeg(deductionsTotal)
  )}

  ${tableSection('Credits', ['Description','Date','Amount'],
    creditLines.map(l => `<tr>
      <td style="text-align:center">${l.description || ''}</td>
      <td style="text-align:center">${l.date || ''}</td>
      <td style="text-align:right">${fmt(l.amount)}</td>
    </tr>`).join(''),
    `<td colspan="2" style="text-align:right">Total:</td>`, fmt(creditsTotal)
  )}

  ${tableSection('Fuel Card', ['Fuel Card#','Location','Description','City, State','Advance ($)','Advance Fee ($)','Misc. ($)','Date','Amount'],
    fuelLines.map(l => {
      const cleanVal = (v) => (v && v !== 'null') ? v : '';
      return `<tr>
      <td>${cleanVal(l.card_number)}</td>
      <td>${cleanVal(l.location_name)}</td>
      <td>${cleanVal(l.description)}</td>
      <td style="text-align:center">${cleanVal(l.city_state)}</td>
      <td style="text-align:right">$0.00</td>
      <td style="text-align:right">$0.00</td>
      <td style="text-align:right">$0.00</td>
      <td style="text-align:center">${cleanVal(l.date)}</td>
      <td style="text-align:right">${fmtNeg(l.amount)}</td>
    </tr>`;
    }).join(''),
    `<td colspan="8" style="text-align:right">Total:</td>`, fmtNeg(fuelTotal)
  )}

  <div class="footer">
    <div>Total Gross Year-To-Date : <span class="ytd">${fmt(tripsTotal)}</span></div>
    <div class="check">Check Amount: <span class="ytd">${fmt(checkAmount)}</span></div>
  </div>

  <div class="page-footer">${company.company_name || ''}&nbsp;&nbsp;&nbsp;&nbsp;Page 1 Of 1</div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1200');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}