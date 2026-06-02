// Generates an HTML document matching the Driver Load Data Sheet design spec
// and opens it in a new window (desktop) or returns it as a string (mobile/viewer).

const COL_DEFS = [
  { key: 'external_load_number',      label: 'BROKER LOAD',  mono: true, blue: true },
  { key: 'trip_number',               label: 'TRIP',         mono: true, muted: true },
  { key: 'customer_reference_number', label: 'REFERENCE',    mono: true, blue: true },
  { key: 'customer_name',             label: 'CUSTOMER',     bold: true },
  { key: '__route',                   label: 'ROUTE' },
  { key: 'pickup_date',               label: 'PICKUP DATE' },
  { key: 'delivery_date',             label: 'DELIVERY DATE' },
  { key: 'freight_rate',              label: 'AMOUNT',       mono: true, bold: true, right: true, amount: true },
];

function hasVal(load, key) {
  if (key === '__route') return !!(load.pickup_city || load.delivery_city);
  return load[key] != null && load[key] !== '';
}

function getRoute(load) {
  const from = [load.pickup_city, load.pickup_state].filter(Boolean).join(', ');
  const to   = [load.delivery_city, load.delivery_state].filter(Boolean).join(', ');
  if (from && to) return `${from} \u2192 ${to}`;
  return from || to || '';
}

function fmtAmt(val) {
  if (val == null || val === '') return null;
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildDocTitle(customers) {
  if (!customers || customers.length === 0) return 'DRIVER LOADS';
  if (customers.length === 1) return customers[0].toUpperCase() + ' LOADS';
  return customers[0].toUpperCase() + ' & ' + customers[1].toUpperCase() + ' LOADS';
}

export function buildDataSheetHtml(sheet) {
  const {
    loads_snapshot = [],
    driver_name = '',
    truck_number = '',
    sheet_name = '',
    company_name = '',
    company_address = '',
    company_phone = '',
    customers = [],
    badge_label = '',
    generated_at,
  } = sheet;

  const genDate = generated_at
    ? new Date(generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const docTitle = buildDocTitle(customers);

  // Smart column logic — hide columns where ALL loads have no value
  const visibleCols = COL_DEFS.filter((col) => loads_snapshot.some((l) => hasVal(l, col.key)));

  const totalAmount = loads_snapshot.reduce((s, l) => s + (Number(l.freight_rate) || 0), 0);
  const totalAmtStr = fmtAmt(totalAmount) || '\u2014';
  const loadCount = loads_snapshot.length;

  const customersStr = (customers || []).join(', ') || '\u2014';

  const amtColIdx = visibleCols.findIndex((c) => c.key === 'freight_rate');

  // Table header
  const headerCells = visibleCols.map((col) => {
    const align = col.right ? 'text-align:right;' : '';
    return `<th style="padding:8px 10px;font-size:10px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.06em;text-align:left;border-bottom:2px solid #000;${align}">${col.label}</th>`;
  }).join('');

  // Data rows
  const dataRows = loads_snapshot.map((load, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f7f8ff';
    const cells = visibleCols.map((col) => {
      let val = '';
      let cellStyle = `padding:7px 10px;border-bottom:1px solid #000;font-size:11.5px;`;
      if (col.key === '__route') {
        val = getRoute(load) || '<span style="color:#c0c4d0;font-style:italic;">\u2014</span>';
      } else if (col.key === 'freight_rate') {
        const amt = fmtAmt(load.freight_rate);
        val = amt
          ? `<strong style="font-family:monospace;">${amt}</strong>`
          : '<span style="color:#c0c4d0;font-style:italic;">\u2014</span>';
        cellStyle += 'text-align:right;';
      } else {
        const raw = load[col.key];
        if (!raw && raw !== 0) {
          val = '<span style="color:#c0c4d0;font-style:italic;">\u2014</span>';
        } else {
          let style = '';
          if (col.blue)  style += 'color:#1d4ed8;';
          if (col.muted) style += 'color:#8b9db5;';
          if (col.bold)  style += 'font-weight:600;';
          if (col.mono)  style += 'font-family:monospace;';
          val = style ? `<span style="${style}">${raw}</span>` : raw;
        }
      }
      return `<td style="${cellStyle}">${val}</td>`;
    }).join('');
    return `<tr style="background:${bg};">
      <td style="padding:7px 10px;border-bottom:1px solid #000;font-size:11px;color:#9ca3af;width:28px;">${idx + 1}</td>
      ${cells}
    </tr>`;
  }).join('');

  // Total row
  const tfootRow = amtColIdx >= 0
    ? `<tr>
        <td style="padding:9px 10px;border-top:2px solid #000;background:#f0f1f5;"></td>
        <td colspan="${amtColIdx}" style="padding:9px 10px;border-top:2px solid #000;background:#f0f1f5;font-weight:600;font-size:12px;color:#374151;">Total \u2014 ${loadCount} load${loadCount !== 1 ? 's' : ''}</td>
        <td style="padding:9px 10px;border-top:2px solid #000;background:#f0f1f5;text-align:right;font-weight:700;font-family:monospace;font-size:12px;">${totalAmtStr}</td>
      </tr>`
    : `<tr>
        <td style="padding:9px 10px;border-top:2px solid #000;background:#f0f1f5;"></td>
        <td colspan="${visibleCols.length}" style="padding:9px 10px;border-top:2px solid #000;background:#f0f1f5;font-weight:600;font-size:12px;color:#374151;">Total \u2014 ${loadCount} load${loadCount !== 1 ? 's' : ''}</td>
      </tr>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${docTitle} \u2014 ${sheet_name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background:#fff; color:#111; font-size:12px; }
    .page { width:100%; background:#fff; }

    /* Header */
    .doc-header {
      background:#0e1525;
      display:flex; justify-content:space-between; align-items:flex-start;
      padding:24px 32px 22px;
      width:100%;
    }
    .doc-header .co-name { font-size:15px; font-weight:700; color:#fff; letter-spacing:0.02em; margin-bottom:4px; }
    .doc-header .co-sub { font-size:11px; color:#8b9db5; line-height:1.7; }
    .doc-header .right { text-align:right; max-width:55%; }
    .doc-header .eyebrow { font-size:9px; font-weight:600; color:#8b9db5; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:6px; }
    .doc-header .main-title {
      font-size:18px; font-weight:800; color:#fff; letter-spacing:0.03em;
      line-height:1.2; word-break:break-word;
    }
    .doc-header .gen-date { font-size:10px; color:#8b9db5; margin-top:5px; }

    /* Driver band */
    .driver-band {
      background:#090f1d;
      border-bottom:2px solid #1d4ed8;
      display:flex; align-items:center; justify-content:space-between;
      padding:12px 32px;
      gap:16px;
      width:100%;
    }
    .driver-band .fields { display:flex; align-items:center; gap:0; flex-wrap:wrap; }
    .driver-band .field-block { padding:0 20px 0 0; border-right:1px solid #1e2a3a; margin-right:20px; }
    .driver-band .field-block:last-of-type { border-right:none; margin-right:0; }
    .driver-band .field-label { font-size:9px; font-weight:600; color:#4a9eff; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:3px; }
    .driver-band .field-value { font-size:13px; font-weight:700; color:#fff; }
    .driver-band .badge-pill {
      background:#1d4ed8; color:#fff;
      border-radius:20px; padding:6px 16px;
      font-size:12px; font-weight:600;
      white-space:nowrap; flex-shrink:0;
    }

    /* Table */
    .table-wrap { padding:16px 32px 0; width:100%; }
    table.loads-table { width:100%; border-collapse:collapse; table-layout:auto; }
    table.loads-table thead tr { background:#fff; }
    table.loads-table thead th:first-child { width:28px; border-bottom:2px solid #000; }

    /* Footer */
    .doc-footer {
      margin-top:20px; padding:12px 32px;
      border-top:1px solid #e5e7eb;
      display:flex; justify-content:space-between; align-items:center;
      font-size:10px; color:#9ca3af;
      width:100%;
    }
    .doc-footer .logo-block { display:flex; align-items:center; gap:8px; }
    .doc-footer .logo-img { width:22px; height:22px; display:inline-block; flex-shrink:0; }
    .doc-footer .powered { color:#6b7280; }
    .doc-footer .powered strong { color:#4a9eff; }
    .doc-footer .center-meta { text-align:center; color:#9ca3af; }
    .doc-footer .right-meta { text-align:right; }

    @media print {
      .download-bar { display:none !important; }
      .doc-header { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
      .driver-band { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
      @page { size: letter landscape; margin:0.3in; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="doc-header">
    <div class="left">
      <div class="co-name">${company_name || 'Your Company'}</div>
      <div class="co-sub">
        ${company_address ? company_address + '<br>' : ''}
        ${company_phone || ''}
      </div>
    </div>
    <div class="right">
      <div class="eyebrow">TruckOps &nbsp;&middot;&nbsp; Load Data Sheet</div>
      <div class="main-title">${docTitle}</div>
      <div class="gen-date">Generated ${genDate}</div>
    </div>
  </div>

  <!-- DRIVER BAND -->
  <div class="driver-band">
    <div class="fields">
      <div class="field-block">
        <div class="field-label">Driver</div>
        <div class="field-value">${driver_name || '\u2014'}</div>
      </div>
      ${truck_number ? `<div class="field-block">
        <div class="field-label">Truck</div>
        <div class="field-value">#${truck_number}</div>
      </div>` : ''}
      ${customersStr && customersStr !== '\u2014' ? `<div class="field-block">
        <div class="field-label">Customer(s)</div>
        <div class="field-value">${customersStr}</div>
      </div>` : ''}
    </div>
    ${badge_label ? `<div class="badge-pill">${badge_label}</div>` : ''}
  </div>

  <!-- TABLE -->
  <div class="table-wrap">
    <table class="loads-table">
      <thead>
        <tr>
          <th style="padding:8px 10px;width:28px;border-bottom:2px solid #000;"></th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        ${loadCount > 0 ? dataRows : `<tr><td colspan="${visibleCols.length + 1}" style="padding:20px;text-align:center;color:#9ca3af;font-style:italic;">No loads selected</td></tr>`}
      </tbody>
      ${loadCount > 0 ? `<tfoot>${tfootRow}</tfoot>` : ''}
    </table>
  </div>

  <!-- FOOTER -->
  <div class="doc-footer">
    <div class="logo-block">
      <svg class="logo-img" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <!-- White outer shield -->
        <path d="M50 4 C50 4 42 8 32 10 C22 12 10 14 10 14 L10 52 C10 72 50 96 50 96 C50 96 90 72 90 52 L90 14 C90 14 78 12 68 10 C58 8 50 4 50 4Z" fill="#fff"/>
        <!-- Top notch cut -->
        <path d="M35 10 Q50 18 65 10 Q58 14 50 13 Q42 14 35 10Z" fill="#fff"/>
        <!-- Blue inner shield -->
        <path d="M50 11 C50 11 43 15 34 17 C25 19 16 20 16 20 L16 52 C16 70 50 91 50 91 C50 91 84 70 84 52 L84 20 C84 20 75 19 66 17 C57 15 50 11 50 11Z" fill="#2d4a8a"/>
        <!-- Top notch on blue -->
        <path d="M36 17 Q50 26 64 17 Q57 21 50 20 Q43 21 36 17Z" fill="#2d4a8a"/>
        <!-- White arrow head -->
        <polygon points="50,30 36,50 44,50 44,68 56,68 56,50 64,50" fill="#fff"/>
        <!-- White arrow base -->
        <rect x="44" y="70" width="12" height="6" rx="1" fill="#fff"/>
      </svg>
      <span class="powered">Powered by <strong>TruckOps</strong></span>
    </div>
    <div class="center-meta">${company_name}${driver_name ? ' &middot; ' + driver_name : ''}${sheet_name ? ' &middot; ' + sheet_name : ''}</div>
    <div class="right-meta">www.truckops.com &middot; Page 1 of 1</div>
  </div>

</div>

<!-- DOWNLOAD BAR -->
<div class="download-bar" style="position:fixed;bottom:24px;right:32px;z-index:9999;">
  <button onclick="window.print()" style="background:#1d4ed8;color:#fff;border:none;padding:10px 24px;font-size:13px;font-weight:bold;border-radius:6px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);">\u2B07 Download PDF</button>
</div>

</body>
</html>`;

  return html;
}

export function printDataSheet(sheet) {
  const html = buildDataSheetHtml(sheet);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}