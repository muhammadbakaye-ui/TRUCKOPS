export function printLoad({ company, load, stops, drivers = [], trucks = [], trailers = [] }) {
  const fmt = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const allStops = [...stops].sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
  const total = (load.freight_rate || 0) + (load.fuel_surcharge || 0) + (load.extra_charges || 0);
  const pickups = allStops.filter(s => s.stop_type === 'pickup');
  const deliveries = allStops.filter(s => s.stop_type === 'delivery');

  // Extract Trip # from description pattern (e.g., "63247_803_030126_1" -> "803")
  const extractTripNum = (desc) => {
    if (!desc) return null;
    const match = desc.match(/_(\d{3})_/);
    return match ? match[1] : null;
  };
  const tripNum = extractTripNum(load.external_load_number) || extractTripNum(load.customer_reference_number) || extractTripNum(load.internal_load_number);

  // Auto-fill truck from driver if not on load
  let truckNum = load.truck_number || '';
  let trailerNum = load.trailer_number || '';
  if (!truckNum.trim() && load.driver_1_id) {
    const driver = drivers.find(d => d.id === load.driver_1_id);
    if (driver?.assigned_truck_id) {
      const truck = trucks.find(t => t.id === driver.assigned_truck_id);
      if (truck) truckNum = truck.unit_number;
    }
  }

  const stopColor = { pickup: '#1a3a6b', delivery: '#166534', stop: '#7c3aed' };
  const stopLabel = { pickup: 'PICKUP', delivery: 'DELIVERY', stop: 'STOP' };
  const stopBg = { pickup: '#eff6ff', delivery: '#f0fdf4', stop: '#faf5ff' };

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Load Sheet - ${load.internal_load_number || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 11px; color: #111; background: #fff; }
    .page { padding: 24px 32px; min-height: 96vh; display: flex; flex-direction: column; }

    /* HEADER */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #1a3a6b; margin-bottom: 16px; }
    .header-left .co-name { font-size: 16px; font-weight: bold; color: #1a3a6b; }
    .header-left .co-sub { font-size: 10px; color: #555; margin-top: 2px; line-height: 1.7; }
    .header-right { text-align: right; }
    .header-right .title { font-size: 22px; font-weight: 900; color: #1a3a6b; letter-spacing: 2px; }
    .header-right .load-num { font-size: 13px; font-weight: bold; color: #333; margin-top: 4px; }
    .header-right .status-badge { display: inline-block; margin-top: 4px; padding: 2px 10px; background: #1a3a6b; color: #fff; font-size: 9px; font-weight: bold; border-radius: 3px; letter-spacing: 1px; }

    /* INFO GRID */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .info-box { border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; }
    .info-box-header { background: #1a3a6b; color: #fff; font-size: 9.5px; font-weight: bold; padding: 4px 10px; letter-spacing: 1px; text-transform: uppercase; }
    .info-box-body { padding: 8px 10px; font-size: 11px; line-height: 2; }
    .info-box-body .row { display: flex; }
    .info-box-body .lbl { color: #555; width: 110px; flex-shrink: 0; }
    .info-box-body .val { font-weight: 600; color: #111; }

    /* ROUTE SUMMARY BAR */
    .route-bar { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; font-size: 11px; }
    .route-bar .arrow { color: #1a3a6b; font-weight: bold; font-size: 14px; }
    .route-bar .city-tag { font-weight: bold; color: #1a3a6b; }
    .route-bar .meta { color: #555; margin-left: auto; }

    /* STOPS */
    .stops-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 8px; }
    .stop-card { border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
    .stop-card-header { display: flex; align-items: center; justify-content: space-between; padding: 5px 12px; font-size: 10px; font-weight: bold; }
    .stop-card-body { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; padding: 8px 12px; font-size: 11px; }
    .stop-field .sf-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px; }
    .stop-field .sf-val { font-weight: 600; color: #111; }

    /* FINANCIALS */
    .fin-section { margin-top: 14px; display: flex; justify-content: flex-end; }
    table.fin-table { border-collapse: collapse; font-size: 11px; width: 300px; }
    table.fin-table th { background: #1a3a6b; color: #fff; padding: 5px 12px; text-align: left; }
    table.fin-table th:last-child { text-align: right; }
    table.fin-table td { border: 1px solid #d1d5db; padding: 5px 12px; }
    table.fin-table td:last-child { text-align: right; font-weight: 600; }
    table.fin-table .total-row td { background: #1a3a6b; color: #fff; font-weight: bold; border-color: #1a3a6b; }

    /* NOTES */
    .notes-section { margin-top: 14px; border: 1px solid #d1d5db; border-radius: 4px; padding: 8px 12px; font-size: 11px; min-height: 50px; }
    .notes-section strong { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 4px; }

    /* FOOTER */
    .page-footer { margin-top: auto; padding-top: 14px; border-top: 1px solid #d1d5db; display: flex; justify-content: space-between; font-size: 9px; color: #888; }

    @page { margin: 0.3in; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="co-name">UNITY TRANSPORTATION LLC</div>
      <div class="co-sub">
        P.O BOX 56521<br>SAINT LOUIS, MO 63156<br>Phone #: (573)742-8547
      </div>
    </div>
    <div class="header-right">
      <div class="title">LOAD INVOICE</div>
      <div class="load-num">Load # ${load.internal_load_number || '—'}</div>
      ${load.external_load_number ? `<div style="font-size:10px;color:#555;margin-top:2px;">Broker Load #: ${load.external_load_number}</div>` : ''}
      <div><span class="status-badge">${(load.dispatch_status || load.status || 'DRAFT').toUpperCase().replace(/_/g, ' ')}</span></div>
    </div>
  </div>

  <!-- ROUTE SUMMARY -->
  ${pickups.length && deliveries.length ? `
  <div class="route-bar">
    <span class="city-tag">📍 ${pickups[0].city || ''}${pickups[0].state ? ', ' + pickups[0].state : ''}</span>
    <span class="arrow">→</span>
    <span class="city-tag">📍 ${deliveries[deliveries.length - 1].city || ''}${deliveries[deliveries.length - 1].state ? ', ' + deliveries[deliveries.length - 1].state : ''}</span>
    ${load.billable_miles ? `<span class="meta">${load.billable_miles.toLocaleString()} mi</span>` : ''}
    ${pickups[0].appointment_date ? `<span class="meta">Pickup: ${pickups[0].appointment_date}</span>` : ''}
  </div>` : ''}

  <!-- INFO GRID -->
  <div class="info-grid">
    <div class="info-box">
      <div class="info-box-header">Load Information</div>
      <div class="info-box-body">
        <div class="row"><span class="lbl">Customer:</span><span class="val">${load.customer_name || '—'}</span></div>
        ${load.external_load_number ? `<div class="row"><span class="lbl">Load #:</span><span class="val">${load.external_load_number}</span></div>` : ''}
        ${load.trip_number || tripNum ? `<div class="row"><span class="lbl">Trip #:</span><span class="val">${load.trip_number || tripNum}</span></div>` : ''}
        ${load.customer_reference_number ? `<div class="row"><span class="lbl">Ref #:</span><span class="val">${load.customer_reference_number}</span></div>` : ''}
        ${load.billable_miles ? `<div class="row"><span class="lbl">Miles:</span><span class="val">${load.billable_miles.toLocaleString()}</span></div>` : ''}
      </div>
    </div>
    <div class="info-box">
      <div class="info-box-header">Assignment</div>
      <div class="info-box-body">
        <div class="row"><span class="lbl">Driver:</span><span class="val">${load.driver_1_name || '—'}</span></div>
        ${load.driver_2_name ? `<div class="row"><span class="lbl">Driver 2:</span><span class="val">${load.driver_2_name}</span></div>` : ''}
        <div class="row"><span class="lbl">Truck #:</span><span class="val">${truckNum || '—'}</span></div>
        <div class="row"><span class="lbl">Trailer #:</span><span class="val">${trailerNum || '—'}</span></div>
      </div>
    </div>
  </div>

  <!-- STOPS -->
  <div class="stops-title">Stops (${allStops.length})</div>
  ${allStops.map((s, i) => `
  <div class="stop-card" style="border-left: 4px solid ${stopColor[s.stop_type] || '#555'};">
    <div class="stop-card-header" style="background:${stopBg[s.stop_type] || '#f9f9f9'}; color:${stopColor[s.stop_type] || '#333'};">
      <span>${stopLabel[s.stop_type] || 'STOP'} #${i + 1} — ${s.company_name || ''}</span>
      <span style="font-size:10px; font-weight:normal; color:#555;">${s.appointment_date || ''}${s.time_from ? ' · ' + s.time_from : ''}${s.time_to ? ' – ' + s.time_to : ''}</span>
    </div>
    <div class="stop-card-body">
      <div class="stop-field">
        <div class="sf-label">Address</div>
        <div class="sf-val">${[s.street, s.city, s.state, s.zip].filter(Boolean).join(', ') || '—'}</div>
      </div>
      <div class="stop-field">
        <div class="sf-label">Ref / BOL #</div>
        <div class="sf-val">${s.reference_number || s.bol_number || '—'}</div>
      </div>
      <div class="stop-field">
        <div class="sf-label">Notes</div>
        <div class="sf-val" style="font-weight:normal;">${s.memo || '—'}</div>
      </div>
    </div>
  </div>`).join('')}



  <!-- FINANCIALS -->
  <div class="fin-section">
    <table class="fin-table">
      <thead><tr><th>Description</th><th>Amount</th></tr></thead>
      <tbody>
        <tr class="total-row"><td>TOTAL</td><td>${fmt(total)}</td></tr>
      </tbody>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="page-footer">
    <span>${company.company_name || 'Unity Transportation LLC'}</span>
    <span>Load # ${load.internal_load_number || '—'}</span>
    <span>Printed ${new Date().toLocaleDateString()}</span>
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