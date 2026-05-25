/**
 * Generates and opens a printable PDF-ready HTML report for driver performance metrics.
 */
export function printDriverPerformanceReport({ drivers, loads, period, periodLabel }) {
  const fmt$ = (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtN = (v, d = 1) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  // Build per-driver metrics
  const driverMap = {};
  loads.forEach(l => {
    if (!l.driver_1_name) return;
    const key = l.driver_1_id || l.driver_1_name;
    if (!driverMap[key]) {
      driverMap[key] = {
        name: l.driver_1_name,
        totalRevenue: 0,
        totalMiles: 0,
        completedLoads: 0,
        inTransitLoads: 0,
        canceledLoads: 0,
        revenues: [],
      };
    }
    const d = driverMap[key];
    const amt = Number(l.invoice_amount) || 0;
    const miles = Number(l.billable_miles) || 0;
    d.totalRevenue += amt;
    d.totalMiles += miles;
    if (l.status === 'completed') d.completedLoads++;
    else if (l.status === 'canceled' || l.canceled) d.canceledLoads++;
    else d.inTransitLoads++;
    d.revenues.push(amt);
  });

  const rows = Object.values(driverMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Grand totals
  const grandRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
  const grandMiles = rows.reduce((s, r) => s + r.totalMiles, 0);
  const grandCompleted = rows.reduce((s, r) => s + r.completedLoads, 0);
  const grandLoads = rows.reduce((s, r) => s + r.completedLoads + r.inTransitLoads + r.canceledLoads, 0);

  const tableRows = rows.map((d, i) => {
    const totalLoads = d.completedLoads + d.inTransitLoads + d.canceledLoads;
    const revPerMile = d.totalMiles > 0 ? d.totalRevenue / d.totalMiles : 0;
    const revPerLoad = totalLoads > 0 ? d.totalRevenue / totalLoads : 0;
    const completionRate = totalLoads > 0 ? (d.completedLoads / totalLoads) * 100 : 0;
    const rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    return `
      <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
        <td class="center rank">${medal || rank}</td>
        <td class="driver-name">${d.name}</td>
        <td class="right">${d.completedLoads}</td>
        <td class="right">${totalLoads}</td>
        <td class="right">${d.totalMiles > 0 ? fmtN(d.totalMiles, 0) : '—'}</td>
        <td class="right revenue">${fmt$(d.totalRevenue)}</td>
        <td class="right">${revPerMile > 0 ? fmt$(revPerMile) : '—'}</td>
        <td class="right">${fmt$(revPerLoad)}</td>
        <td class="center">
          <div class="completion-bar-wrap">
            <div class="completion-bar" style="width:${Math.round(completionRate)}%"></div>
            <span class="completion-label">${Math.round(completionRate)}%</span>
          </div>
        </td>
      </tr>`;
  }).join('');

  const grandRevPerMile = grandMiles > 0 ? grandRevenue / grandMiles : 0;
  const grandRevPerLoad = grandLoads > 0 ? grandRevenue / grandLoads : 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Driver Performance Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; font-size: 11px; color: #1e293b; background: #fff; padding: 28px 32px; }

    /* Header */
    .report-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #1e40af; margin-bottom: 20px; }
    .report-title { font-size: 20px; font-weight: 700; color: #1e40af; }
    .report-subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
    .report-meta { text-align: right; color: #64748b; font-size: 10px; line-height: 1.6; }

    /* Summary cards */
    .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 22px; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .summary-label { font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
    .summary-value { font-size: 17px; font-weight: 700; color: #1e293b; margin-top: 3px; }
    .summary-sub { font-size: 9px; color: #64748b; margin-top: 2px; }

    /* Table */
    .section-title { font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1e40af; color: #fff; }
    thead th { padding: 7px 8px; font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody tr.even { background: #fff; }
    tbody tr.odd { background: #f8fafc; }
    tbody tr:hover { background: #eff6ff; }
    td { padding: 6px 8px; font-size: 10.5px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    td.right { text-align: right; }
    td.center { text-align: center; }
    td.revenue { font-weight: 600; color: #1e40af; }
    td.rank { font-size: 13px; }
    td.driver-name { font-weight: 500; }
    tfoot td { font-weight: 700; background: #f1f5f9; border-top: 2px solid #cbd5e1; font-size: 10.5px; }

    /* Completion bar */
    .completion-bar-wrap { display: flex; align-items: center; gap: 5px; min-width: 80px; }
    .completion-bar { height: 7px; background: #3b82f6; border-radius: 4px; min-width: 2px; }
    .completion-label { font-size: 10px; color: #475569; white-space: nowrap; }

    /* Footer */
    .report-footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #94a3b8; font-size: 9px; }

    /* Print button */
    .print-btn { position: fixed; top: 18px; right: 18px; background: #1e40af; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; box-shadow: 0 2px 8px rgba(30,64,175,0.3); }
    .print-btn:hover { background: #1d4ed8; }
    @media print { .print-btn { display: none !important; } body { padding: 12px 16px; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="doPrint()">🖨 Print</button>

  <div class="report-header">
    <div>
      <div class="report-title">Driver Performance Report</div>
      <div class="report-subtitle">Period: ${periodLabel} &nbsp;·&nbsp; ${rows.length} driver${rows.length !== 1 ? 's' : ''} &nbsp;·&nbsp; ${grandLoads} total loads</div>
    </div>
    <div class="report-meta">
      Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}<br/>
      ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Total Drivers</div>
      <div class="summary-value">${rows.length}</div>
      <div class="summary-sub">with loads in period</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Gross Revenue</div>
      <div class="summary-value">${fmt$(grandRevenue)}</div>
      <div class="summary-sub">${grandLoads} loads</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Completed Loads</div>
      <div class="summary-value">${grandCompleted}</div>
      <div class="summary-sub">${grandLoads > 0 ? Math.round(grandCompleted / grandLoads * 100) : 0}% completion rate</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Total Miles</div>
      <div class="summary-value">${grandMiles > 0 ? fmtN(grandMiles, 0) : '—'}</div>
      <div class="summary-sub">billable miles</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Avg Rev / Mile</div>
      <div class="summary-value">${grandRevPerMile > 0 ? fmt$(grandRevPerMile) : '—'}</div>
      <div class="summary-sub">fleet average</div>
    </div>
  </div>

  <div class="section-title">Individual Driver Metrics</div>
  <table>
    <thead>
      <tr>
        <th class="center" style="width:40px">Rank</th>
        <th>Driver</th>
        <th class="right">Completed</th>
        <th class="right">Total Loads</th>
        <th class="right">Miles</th>
        <th class="right">Gross Revenue</th>
        <th class="right">Rev / Mile</th>
        <th class="right">Rev / Load</th>
        <th class="center" style="width:110px">Completion</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2">Fleet Total</td>
        <td class="right">${grandCompleted}</td>
        <td class="right">${grandLoads}</td>
        <td class="right">${grandMiles > 0 ? fmtN(grandMiles, 0) : '—'}</td>
        <td class="right revenue">${fmt$(grandRevenue)}</td>
        <td class="right">${grandRevPerMile > 0 ? fmt$(grandRevPerMile) : '—'}</td>
        <td class="right">${fmt$(grandRevPerLoad)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="report-footer">
    <span>Confidential — For internal use only</span>
    <span>Driver Performance Report · ${periodLabel}</span>
  </div>
<script>
function doPrint() {
  if (window.electronAPI && window.electronAPI.printToPDF) {
    window.electronAPI.printToPDF();
  } else {
    window.print();
  }
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