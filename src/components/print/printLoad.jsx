export function printLoad({ company, load, stops, drivers, trucks, trailers }) {
  const fmt = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pickups = stops.filter(s => s.stop_type === 'pickup');
  const deliveries = stops.filter(s => s.stop_type === 'delivery');
  const allStops = [...stops].sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
  const total = (load.freight_rate || 0) + (load.fuel_surcharge || 0) + (load.extra_charges || 0);

  const stopTypeColor = { pickup: '#1a56db', delivery: '#057a55', stop: '#6b7280' };
  const stopTypeBg = { pickup: '#eff6ff', delivery: '#f0fdf4', stop: '#f9fafb' };

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Load ${load.internal_load_number || ''}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:24px 32px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #1a56db}
    .company-info{font-size:10px;line-height:1.7}
    .load-title{text-align:right}
    .load-title h1{font-size:20px;font-weight:bold;color:#1a56db;letter-spacing:1px}
    .load-title p{font-size:11px;color:#555;margin-top:2px}
    .section{margin-bottom:16px}
    .section-title{font-size:9.5px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;color:#1a56db;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #dce7ff}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
    .field{margin-bottom:4px}
    .field label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.05em;display:block}
    .field span{font-size:11px;font-weight:600;color:#111}
    .stop-box{border:1px solid #ddd;border-radius:4px;padding:8px 10px;margin-bottom:8px}
    .stop-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .stop-type-badge{font-size:9px;font-weight:bold;padding:2px 8px;border-radius:3px;text-transform:uppercase}
    .stop-details{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px}
    .financials{border:1px solid #ccc;padding:10px;border-radius:4px}
    .fin-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px;border-bottom:1px solid #f0f0f0}
    .fin-total{display:flex;justify-content:space-between;padding:6px 0 2px;font-size:13px;font-weight:bold;border-top:2px solid #1a56db;margin-top:4px;color:#1a56db}
    .badge{display:inline-block;font-size:9px;padding:2px 6px;border-radius:3px;font-weight:bold;background:#e0edff;color:#1a56db}
    .notes-box{border:1px solid #e5e7eb;background:#fafafa;padding:8px;border-radius:4px;font-size:10.5px;min-height:40px}
    .page-footer{text-align:center;margin-top:28px;font-size:9.5px;color:#999;border-top:1px solid #ddd;padding-top:6px}
    @page{margin:0.5in}
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <strong style="font-size:13px">${company.company_name || ''}</strong><br>
      ${company.address_1 || ''}<br>
      ${company.city || ''}${company.state ? ', ' + company.state : ''} ${company.zip || ''}<br>
      ${company.phone ? 'Phone: ' + company.phone : ''}${company.email ? ' &nbsp;|&nbsp; ' + company.email : ''}
    </div>
    <div class="load-title">
      <h1>LOAD SHEET</h1>
      <p><strong>Load #:</strong> ${load.internal_load_number || ''} &nbsp;&nbsp; <span class="badge">${(load.status || 'DRAFT').toUpperCase()}</span></p>
      ${load.external_load_number ? `<p style="font-size:10px;color:#555">Broker Load #: ${load.external_load_number}</p>` : ''}
    </div>
  </div>

  <div class="grid-2" style="margin-bottom:14px">
    <div class="section">
      <div class="section-title">Load Information</div>
      <div class="grid-3">
        <div class="field"><label>Customer</label><span>${load.customer_name || '—'}</span></div>
        <div class="field"><label>Load Type</label><span>${load.load_type || '—'}</span></div>
        <div class="field"><label>Equipment</label><span>${(load.equipment_type || '—').replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</span></div>
        <div class="field"><label>Commodity</label><span>${load.commodity || '—'}</span></div>
        <div class="field"><label>Weight</label><span>${load.weight ? load.weight.toLocaleString() + ' lbs' : '—'}</span></div>
        <div class="field"><label>Miles</label><span>${load.billable_miles ? load.billable_miles.toLocaleString() : '—'}</span></div>
        ${load.customer_reference_number ? `<div class="field"><label>Cust. Ref #</label><span>${load.customer_reference_number}</span></div>` : ''}
        ${load.bol_number ? `<div class="field"><label>BOL #</label><span>${load.bol_number}</span></div>` : ''}
      </div>
    </div>
    <div class="section">
      <div class="section-title">Assignment</div>
      <div class="grid-2" style="margin-bottom:6px">
        <div class="field"><label>Driver 1</label><span>${load.driver_1_name || '—'}</span></div>
        ${load.driver_2_name ? `<div class="field"><label>Driver 2</label><span>${load.driver_2_name}</span></div>` : ''}
        <div class="field"><label>Truck</label><span>${load.truck_number || '—'}</span></div>
        <div class="field"><label>Trailer</label><span>${load.trailer_number || '—'}</span></div>
      </div>
      <div class="section-title" style="margin-top:8px">Financials</div>
      <div class="financials">
        <div class="fin-row"><span>Freight Rate</span><span>${fmt(load.freight_rate)}</span></div>
        ${load.fuel_surcharge ? `<div class="fin-row"><span>Fuel Surcharge</span><span>${fmt(load.fuel_surcharge)}</span></div>` : ''}
        ${load.extra_charges ? `<div class="fin-row"><span>Extra Charges</span><span>${fmt(load.extra_charges)}</span></div>` : ''}
        <div class="fin-total"><span>Total Invoice</span><span>${fmt(total)}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Stops (${allStops.length})</div>
    ${allStops.map((s, idx) => `
    <div class="stop-box">
      <div class="stop-header">
        <span class="stop-type-badge" style="background:${stopTypeBg[s.stop_type]};color:${stopTypeColor[s.stop_type]}">${s.stop_type || 'stop'}</span>
        <strong style="font-size:12px">${s.company_name || ''}</strong>
        <span style="font-size:10px;color:#666">${s.city || ''}${s.state ? ', ' + s.state : ''} ${s.zip || ''}</span>
      </div>
      <div class="stop-details">
        <div class="field"><label>Date</label><span>${s.appointment_date || '—'}</span></div>
        <div class="field"><label>Time Window</label><span>${s.time_from || ''}${s.time_to ? ' – ' + s.time_to : ''}</span></div>
        <div class="field"><label>Ref / BOL #</label><span>${s.reference_number || s.bol_number || '—'}</span></div>
        <div class="field"><label>Contact</label><span>${s.contact || '—'}</span></div>
        ${s.memo ? `<div class="field" style="grid-column:span 4"><label>Notes</label><span>${s.memo}</span></div>` : ''}
      </div>
    </div>`).join('')}
  </div>

  ${load.notes ? `<div class="section"><div class="section-title">Notes</div><div class="notes-box">${load.notes}</div></div>` : ''}
  ${load.special_instructions ? `<div class="section"><div class="section-title">Special Instructions</div><div class="notes-box">${load.special_instructions}</div></div>` : ''}

  <div class="page-footer">${company.company_name || ''} &nbsp;|&nbsp; Printed ${new Date().toLocaleDateString()} &nbsp;&nbsp;&nbsp;&nbsp; Page 1 Of 1</div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1200');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}