export function printLoad({ company, load, stops, drivers = [], trucks = [], trailers = [] }) {
  const fmt = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const allStops = [...stops].sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
  const total = (load.freight_rate || 0) + (load.fuel_surcharge || 0) + (load.extra_charges || 0);
  const pickups = allStops.filter(s => s.stop_type === 'pickup');
  const deliveries = allStops.filter(s => s.stop_type === 'delivery');

  const extractTripNum = (desc) => {
    if (!desc) return null;
    const match = desc.match(/_(\d{3})_/);
    return match ? match[1] : null;
  };
  const tripNum = extractTripNum(load.external_load_number) || extractTripNum(load.customer_reference_number) || extractTripNum(load.internal_load_number);

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

  // Letter page at 96dpi = 816x1056px. We use exactly this width so capture = page.
  const PAGE_W = 816;
  const PAGE_H = 1056;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; background: #fff; width: ${PAGE_W}px; }
    .page { width: ${PAGE_W}px; height: ${PAGE_H}px; padding: 36px 48px; display: flex; flex-direction: column; }
    .content { flex: 0 0 auto; }
    .push { flex: 1; }

    /* HEADER */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 3px solid #1a3a6b; margin-bottom: 10px; }
    .co-name { font-size: 14px; font-weight: bold; color: #1a3a6b; text-transform: uppercase; }
    .co-sub { font-size: 9.5px; color: #444; margin-top: 3px; line-height: 1.7; }
    .header-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .doc-title { font-size: 38px; font-weight: 900; color: #1a3a6b; letter-spacing: 3px; line-height: 1; }
    .load-num { font-size: 10px; font-weight: bold; color: #333; }
    .broker-num { font-size: 9.5px; color: #333; }
    .status-badge { display: inline-block; padding: 2px 8px; background: #1a3a6b; color: #fff; font-size: 8px; font-weight: bold; border-radius: 3px; letter-spacing: 1px; }

    /* ROUTE BAR */
    .route-bar { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 10px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; font-size: 9.5px; }
    .city-tag { font-weight: bold; color: #1a3a6b; }
    .route-arrow { color: #1a3a6b; font-weight: bold; }
    .route-meta { color: #555; margin-left: auto; }

    /* INFO GRID */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
    .info-box { border: 1px solid #d1d5db; border-radius: 3px; overflow: hidden; }
    .info-box-hdr { background: #1a3a6b; color: #fff; font-size: 8px; font-weight: bold; padding: 3px 8px; letter-spacing: 0.8px; text-transform: uppercase; }
    .info-box-body { padding: 4px 8px; line-height: 1.55; }
    .irow { display: flex; }
    .ilbl { color: #666; width: 80px; flex-shrink: 0; font-size: 9.5px; }
    .ival { font-weight: 600; color: #111; font-size: 9.5px; }

    /* STOPS */
    .stops-title { font-size: 8.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #666; margin-bottom: 4px; margin-top: 2px; }
    .stop-card { border: 1px solid #d1d5db; border-radius: 3px; margin-bottom: 4px; overflow: hidden; }
    .stop-hdr { display: flex; align-items: center; justify-content: space-between; padding: 3px 8px; font-size: 8.5px; font-weight: bold; }
    .stop-hdr-date { font-size: 9px; font-weight: normal; color: #444; }
    .stop-body { display: grid; grid-template-columns: 2.2fr 1fr 1fr; gap: 6px; padding: 4px 8px 5px; }
    .sf-lbl { font-size: 7.5px; color: #999; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 1px; }
    .sf-val { font-size: 9.5px; font-weight: 600; color: #111; }

    /* FINANCIALS */
    .fin-wrap { margin-top: 10px; display: flex; justify-content: flex-end; }
    .fin-inner { display: flex; border: 2px solid #1a3a6b; }
    table.fin-tbl { border-collapse: collapse; font-size: 9.5px; width: 260px; }
    table.fin-tbl thead tr { border-bottom: 2px solid #1a3a6b; }
    table.fin-tbl th { padding: 4px 10px; text-align: left; font-weight: bold; background: #fff; }
    table.fin-tbl th:last-child { text-align: right; }
    table.fin-tbl td { padding: 3px 10px; background: #fff; }
    table.fin-tbl td:last-child { text-align: right; font-weight: 600; }
    table.fin-tbl .sub-row td { border-top: 1px solid #ccc; font-weight: bold; }
    .total-box { border-left: 2px solid #1a3a6b; padding: 0 18px; display: flex; align-items: center; gap: 24px; font-size: 9.5px; font-weight: bold; white-space: nowrap; min-width: 160px; }

    /* FOOTER */
    .page-footer { padding-top: 6px; border-top: 1px solid #d1d5db; display: flex; justify-content: space-between; font-size: 8px; color: #999; }
  </style>
</head>
<body>
<div class="page">
  <div class="content">

    <!-- HEADER -->
    <div class="header">
      <div>
        <div class="co-name">UNITY TRANSPORTATION LLC</div>
        <div class="co-sub">P.O BOX 56521<br>SAINT LOUIS, MO 63156<br>Phone #: (573)742-8547</div>
      </div>
      <div class="header-right">
        <div class="doc-title">LOAD INVOICE</div>
        <div class="load-num">Load # ${load.internal_load_number || '—'}</div>
        ${load.external_load_number ? `<div class="broker-num">Broker Load #: ${load.external_load_number}</div>` : ''}
        <div><span class="status-badge">${(load.dispatch_status || load.status || 'DRAFT').toUpperCase().replace(/_/g, ' ')}</span></div>
      </div>
    </div>

    <!-- ROUTE BAR -->
    ${pickups.length && deliveries.length ? `
    <div class="route-bar">
      <span class="city-tag">📍 ${pickups[0].city || ''}${pickups[0].state ? ', ' + pickups[0].state : ''}</span>
      <span class="route-arrow">→</span>
      <span class="city-tag">📍 ${deliveries[deliveries.length - 1].city || ''}${deliveries[deliveries.length - 1].state ? ', ' + deliveries[deliveries.length - 1].state : ''}</span>
      ${pickups[0].appointment_date ? `<span class="route-meta">Pickup: ${pickups[0].appointment_date}</span>` : ''}
    </div>` : ''}

    <!-- INFO GRID -->
    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-hdr">Load Information</div>
        <div class="info-box-body">
          <div class="irow"><span class="ilbl">Customer:</span><span class="ival">${load.customer_name || '—'}</span></div>
          ${load.external_load_number ? `<div class="irow"><span class="ilbl">Load #:</span><span class="ival">${load.external_load_number}</span></div>` : ''}
          ${load.trip_number || tripNum ? `<div class="irow"><span class="ilbl">Trip #:</span><span class="ival">${load.trip_number || tripNum}</span></div>` : ''}
          ${load.customer_reference_number ? `<div class="irow"><span class="ilbl">Ref #:</span><span class="ival">${load.customer_reference_number}</span></div>` : ''}
          ${load.billable_miles ? `<div class="irow"><span class="ilbl">Miles:</span><span class="ival">${load.billable_miles.toLocaleString()}</span></div>` : ''}
        </div>
      </div>
      <div class="info-box">
        <div class="info-box-hdr">Assignment</div>
        <div class="info-box-body">
          <div class="irow"><span class="ilbl">Driver:</span><span class="ival">${load.driver_1_name || '—'}</span></div>
          ${load.driver_2_name ? `<div class="irow"><span class="ilbl">Driver 2:</span><span class="ival">${load.driver_2_name}</span></div>` : ''}
          <div class="irow"><span class="ilbl">Truck #:</span><span class="ival">${truckNum || '—'}</span></div>
          <div class="irow"><span class="ilbl">Trailer #:</span><span class="ival">${trailerNum || '—'}</span></div>
        </div>
      </div>
    </div>

    <!-- STOPS -->
    <div class="stops-title">Stops (${allStops.length})</div>
    ${allStops.map((s, i) => `
    <div class="stop-card" style="border-left:4px solid ${stopColor[s.stop_type] || '#555'};">
      <div class="stop-hdr" style="background:${stopBg[s.stop_type] || '#f9f9f9'}; color:${stopColor[s.stop_type] || '#333'};">
        <span>${stopLabel[s.stop_type] || 'STOP'} #${i + 1}${s.company_name ? ' — ' + s.company_name : ''}</span>
        <span class="stop-hdr-date">${s.appointment_date || ''}${s.time_from ? ' · ' + s.time_from : ''}${s.time_to ? ' – ' + s.time_to : ''}</span>
      </div>
      <div class="stop-body">
        <div><div class="sf-lbl">Address</div><div class="sf-val">${[s.street, s.city, s.state, s.zip].filter(Boolean).join(', ') || '—'}</div></div>
        <div><div class="sf-lbl">Ref / BOL #</div><div class="sf-val">${s.reference_number || s.bol_number || '—'}</div></div>
        <div><div class="sf-lbl">Notes</div><div class="sf-val" style="font-weight:normal;">${s.memo || '—'}</div></div>
      </div>
    </div>`).join('')}

    <!-- FINANCIALS -->
    <div class="fin-wrap">
      <div class="fin-inner">
        <table class="fin-tbl">
          <thead><tr><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            <tr><td>Freight Income</td><td>${fmt(load.freight_rate)}</td></tr>
            <tr class="sub-row"><td>Sub Total :</td><td>${fmt(load.freight_rate)}</td></tr>
          </tbody>
        </table>
        <div class="total-box">
          <span>Total Due:</span>
          <span>${fmt(total)}</span>
        </div>
      </div>
    </div>

  </div><!-- end .content -->

  <div class="push"></div>

  <!-- FOOTER -->
  <div class="page-footer">
    <span>${company.company_name || 'Unity Transportation LLC'}</span>
    <span>Load # ${load.internal_load_number || '—'}</span>
    <span>Printed ${new Date().toLocaleDateString()}</span>
  </div>
</div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `position:fixed;left:0;top:0;width:${PAGE_W}px;height:${PAGE_H}px;border:none;opacity:0;pointer-events:none;z-index:-1;`;
  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  setTimeout(async () => {
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');
    const canvas = await html2canvas(iframe.contentDocument.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#fff',
      width: PAGE_W,
      height: PAGE_H,
      windowWidth: PAGE_W,
      windowHeight: PAGE_H,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
    pdf.save(`Load-${load.external_load_number || load.internal_load_number || 'sheet'}.pdf`);
    document.body.removeChild(iframe);
  }, 800);
}