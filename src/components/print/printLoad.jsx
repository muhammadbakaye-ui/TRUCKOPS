export function printLoad({ company, load, stops, drivers = [], trucks = [], trailers = [] }) {
  const fmt = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const allStops = [...stops].sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
  const lineItems = load.charge_line_items?.length
    ? load.charge_line_items
    : [
        ...(load.freight_rate ? [{ description: 'Line Haul', amount: load.freight_rate }] : []),
        ...(load.fuel_surcharge ? [{ description: 'Fuel Surcharge', amount: load.fuel_surcharge }] : []),
        ...(load.extra_charges ? [{ description: 'Extra Charges', amount: load.extra_charges }] : []),
        ...(!load.freight_rate && !load.fuel_surcharge ? [{ description: 'Freight Income', amount: 0 }] : []),
      ];
  const subTotal = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
  const total = load.invoice_amount || subTotal;
  const firstStop = allStops[0];
  const lastStop = allStops[allStops.length - 1];

  const extractTripNum = (desc) => {
    if (!desc) return null;
    const match = desc.match(/_(\d{3})_/);
    return match ? match[1] : null;
  };
  const tripNum = extractTripNum(load.external_load_number) || extractTripNum(load.customer_reference_number) || extractTripNum(load.internal_load_number);
  const pdfFilename = `Load-${(load.internal_load_number || 'load').replace(/[^a-zA-Z0-9\-]/g, '-')}-${(load.customer_reference_number || load.external_load_number || '').replace(/[^a-zA-Z0-9\-]/g, '-')}.pdf`.replace(/-+/g, '-').replace(/-\.pdf$/, '.pdf');

  let truckNum = load.truck_number || '';
  let trailerNum = load.trailer_number || '';
  if (!truckNum.trim() && load.driver_1_id) {
    const driver = drivers.find(d => d.id === load.driver_1_id);
    if (driver?.assigned_truck_id) {
      const truck = trucks.find(t => t.id === driver.assigned_truck_id);
      if (truck) truckNum = truck.unit_number;
    }
  }

  const ds = (load.dispatch_status || load.status || '').toLowerCase().replace(/_/g,' ');
  const isDelivered = ds.includes('deliver') || ds.includes('completed');
  const isInTransit = ds.includes('transit');
  const statusLabel = (load.dispatch_status || load.status || 'DRAFT').toUpperCase().replace(/_/g, ' ');
  const statusBorderColor = isDelivered ? '#16a34a' : isInTransit ? '#1d4ed8' : '#6b7280';
  const statusTextColor = isDelivered ? '#16a34a' : isInTransit ? '#1d4ed8' : '#6b7280';

  const stopRows = allStops.map((s, i) => {
    const isPickup = s.stop_type === 'pickup';
    const isDelivery = s.stop_type === 'delivery';
    const hdrBg = isPickup ? '#eff6ff' : isDelivery ? '#f0fdf4' : '#f9fafb';
    const hdrColor = isPickup ? '#1d4ed8' : isDelivery ? '#16a34a' : '#374151';
    const hdrBorderColor = isPickup ? '#bfdbfe' : isDelivery ? '#bbf7d0' : '#1a1a2e';
    const label = isPickup ? 'PICKUP' : isDelivery ? 'DELIVERY' : 'STOP';
    const addr = [s.street, s.city, s.state, s.zip].filter(Boolean).join(', ') || '—';
    const clean = (v) => { const sv = v && String(v).trim().toLowerCase(); return sv && sv !== 'none' && sv !== 'null' ? v : null; };
    const ref = clean(s.reference_number) || clean(s.bol_number) || clean(load.customer_reference_number) || '—';
    const dateTime = [s.appointment_date, s.time_from].filter(Boolean).join(' · ');
    return `
    <div style="border:1px solid #1a1a2e;border-radius:5px;margin-bottom:8px;overflow:hidden;">
      <div style="background:${hdrBg};border-bottom:1px solid ${hdrBorderColor};padding:5px 12px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:9px;font-weight:700;color:${hdrColor};text-transform:uppercase;letter-spacing:0.06em;">${label} #${i+1}${s.company_name ? ' \u2014 ' + s.company_name : ''}</span>
        <span style="font-size:9px;color:#6b7280;">${dateTime}</span>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;padding:8px 12px;">
        <div>
          <div style="font-size:7.5px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">Address</div>
          <div style="font-size:9.5px;color:#111827;font-weight:500;">${addr}</div>
        </div>
        <div>
          <div style="font-size:7.5px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">Ref / BOL #</div>
          <div style="font-size:9.5px;color:#111827;font-weight:500;">${ref}</div>
        </div>
        <div>
          <div style="font-size:7.5px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">Notes</div>
          <div style="font-size:9.5px;color:#374151;">${s.memo || '—'}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${load.external_load_number || load.internal_load_number || 'Load'} - Load Invoice</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; user-select: text !important; -webkit-user-select: text !important; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #111827; background: #f3f4f6; }
    .page-wrapper { padding: 24px; }
    .page { width: 100%; padding: 36px 48px; background: #fff; border: 1.5px solid #0f1117; }
    .download-bar { position: fixed; bottom: 24px; right: 32px; z-index: 9999; }
    .btn-print { background: #166534; color: #fff; border: none; padding: 10px 22px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.25); letter-spacing: 0.5px; }
    .btn-print:hover { background: #14532d; }
    @page { size: letter; margin: 0.4in 0.5in; }
    @media print {
      body { background: #fff; }
      .page-wrapper { padding: 0; }
      .page { border: 1.5px solid #0f1117; padding: 0; }
      .download-bar { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page-wrapper">
<div class="page">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #0f1117;margin-bottom:14px;">
    <div>
      <div style="font-size:18px;font-weight:800;color:#111827;line-height:1.2;margin-bottom:5px;">${company.company_name || 'Your Company'}</div>
      <div style="font-size:10px;color:#6b7280;line-height:1.7;">
        ${company.address_1 ? company.address_1 + '<br>' : ''}
        ${[company.city, company.state, company.zip].filter(Boolean).join(', ')}
        ${company.phone ? '<br>Phone: ' + company.phone : ''}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:26px;font-weight:900;color:#111827;letter-spacing:1px;line-height:1;margin-bottom:6px;">LOAD INVOICE</div>
      <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">Load # <strong style="color:#111827;">L-${load.internal_load_number || '—'}</strong>${load.external_load_number ? ' &nbsp;·&nbsp; Broker Load # <strong style="color:#111827;">' + load.external_load_number + '</strong>' : ''}</div>
      <div style="margin-top:6px;">
        <span style="display:inline-block;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${statusTextColor};border:1.5px solid ${statusBorderColor};border-radius:4px;padding:2px 8px;">${statusLabel}</span>
      </div>
    </div>
  </div>

  <!-- ROUTE BAR -->
  ${allStops.length >= 2 ? `
  <div style="background:#f9fafb;border:1px solid #1a1a2e;border-radius:5px;padding:8px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;">
    <span style="width:8px;height:8px;background:#111827;border-radius:50%;display:inline-block;flex-shrink:0;"></span>
    <span style="font-size:11px;font-weight:700;color:#111827;">${firstStop.city || ''}${firstStop.state ? ', ' + firstStop.state : ''}</span>
    <span style="flex:1;height:1px;background:#1a1a2e;max-width:60px;"></span>
    <span style="font-size:10px;color:#9ca3af;font-weight:500;">→</span>
    <span style="flex:1;height:1px;background:#1a1a2e;max-width:60px;"></span>
    <span style="width:8px;height:8px;background:#111827;border-radius:50%;display:inline-block;flex-shrink:0;"></span>
    <span style="font-size:11px;font-weight:700;color:#111827;">${lastStop.city || ''}${lastStop.state ? ', ' + lastStop.state : ''}</span>
    ${firstStop.appointment_date ? `<span style="margin-left:auto;font-size:10px;color:#6b7280;white-space:nowrap;">Pickup: ${firstStop.appointment_date}</span>` : ''}
  </div>` : ''}

  <!-- INFO SECTION -->
  <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #1a1a2e;border-radius:5px;margin-bottom:14px;overflow:hidden;">
    <div style="padding:10px 14px;border-right:1px solid #1a1a2e;">
      <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:8px;">Load Information</div>
      <div style="display:grid;grid-template-columns:80px 1fr;row-gap:4px;font-size:10px;">
        <span style="color:#9ca3af;">Customer</span><span style="color:#111827;font-weight:600;">${load.customer_name || '—'}</span>
        <span style="color:#9ca3af;">Load #</span><span style="color:#111827;font-weight:600;">${load.external_load_number || load.internal_load_number || '—'}</span>
        ${load.trip_number || tripNum ? `<span style="color:#9ca3af;">Trip #</span><span style="color:#111827;font-weight:600;">${load.trip_number || tripNum}</span>` : ''}
        ${load.customer_reference_number ? `<span style="color:#9ca3af;">Ref #</span><span style="color:#111827;font-weight:600;">${load.customer_reference_number}</span>` : ''}
      </div>
    </div>
    <div style="padding:10px 14px;">
      <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:8px;">Assignment</div>
      <div style="display:grid;grid-template-columns:70px 1fr;row-gap:4px;font-size:10px;">
        <span style="color:#9ca3af;">Driver</span><span style="color:#111827;font-weight:600;">${load.driver_1_name || '—'}</span>
        <span style="color:#9ca3af;">Truck #</span><span style="color:#111827;font-weight:600;">${truckNum || '—'}</span>
        <span style="color:#9ca3af;">Trailer #</span><span style="color:#111827;font-weight:600;">${trailerNum || '—'}</span>
      </div>
    </div>
  </div>

  <!-- STOPS -->
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
    <span style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#111827;white-space:nowrap;">STOPS (${allStops.length})</span>
    <div style="flex:1;height:1px;background:#1a1a2e;"></div>
  </div>
  ${stopRows}

  <!-- CHARGES -->
  <div style="display:flex;align-items:center;gap:10px;margin-top:16px;margin-bottom:10px;">
    <span style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#111827;white-space:nowrap;">CHARGES</span>
    <div style="flex:1;height:1px;background:#1a1a2e;"></div>
  </div>
  <div style="display:flex;justify-content:flex-end;">
    <table style="border-collapse:collapse;width:280px;font-size:10px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:6px 12px;text-align:left;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;border:1px solid #1a1a2e;">Description</th>
          <th style="padding:6px 12px;text-align:right;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;border:1px solid #1a1a2e;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map(li => `<tr><td style="padding:5px 12px;border:1px solid #1a1a2e;color:#374151;">${li.description || '—'}</td><td style="padding:5px 12px;border:1px solid #1a1a2e;text-align:right;color:#111827;font-weight:500;">${fmt(li.amount)}</td></tr>`).join('')}
        <tr style="background:#f9fafb;">
          <td style="padding:6px 12px;border:1px solid #1a1a2e;border-top:1.5px solid #1a1a2e;font-weight:700;color:#111827;">Sub Total</td>
          <td style="padding:6px 12px;border:1px solid #1a1a2e;border-top:1.5px solid #1a1a2e;text-align:right;font-weight:700;color:#111827;">${fmt(subTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- TOTAL DUE -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:14px;border-top:2px solid #0f1117;">
    <span style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">Total Due</span>
    <span style="font-size:26px;font-weight:900;color:#111827;line-height:1;">${fmt(total)}</span>
  </div>

  <!-- FOOTER -->
  <div style="margin-top:20px;padding-top:10px;border-top:1px solid #1a1a2e;background:#f9fafb;margin-left:-48px;margin-right:-48px;margin-bottom:-36px;padding-left:48px;padding-right:48px;padding-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
    <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c0c4cc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></svg>
      <span style="font-size:7.5px;color:#c0c4cc;letter-spacing:0.04em;">Powered by TruckOps</span>
    </div>
    <span style="font-size:9px;color:#9ca3af;">${company.company_name || 'Your Company'}</span>
    <span style="font-size:9px;color:#9ca3af;">Load # L-${load.internal_load_number || '—'}</span>
    <span style="font-size:9px;color:#9ca3af;">Printed ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
  </div>

</div>
</div>

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