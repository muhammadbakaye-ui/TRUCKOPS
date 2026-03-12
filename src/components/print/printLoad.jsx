export function printLoad({ company, load, stops }) {
  const fmt = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const allStops = [...stops].sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
  const total = (load.freight_rate || 0) + (load.fuel_surcharge || 0) + (load.extra_charges || 0);
  const stopTypeLabel = { pickup: 'PickUp', delivery: 'Delivery', stop: 'Stop' };
  const pickups = allStops.filter(s => s.stop_type === 'pickup');
  const deliveries = allStops.filter(s => s.stop_type === 'delivery');
  const routeSummary = pickups.length && deliveries.length
    ? `${pickups[0].city || ''}, ${pickups[0].state || ''} - ${deliveries[deliveries.length - 1].city || ''}, ${deliveries[deliveries.length - 1].state || ''}`
    : (load.route_summary || '');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Load ${load.internal_load_number || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
    .page {
      border: 1.5px dashed #aaa;
      margin: 18px;
      padding: 28px 36px 20px 36px;
      min-height: 96vh;
      display: flex;
      flex-direction: column;
    }
    .top-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 34px; }
    .company-block { font-size: 10.5px; line-height: 1.75; }
    .company-block .co-name { font-weight: bold; font-size: 11px; color: #1a3a6b; }
    .company-block .co-detail { color: #cc3300; }
    .load-heading { text-align: right; padding-right: 10px; padding-top: 4px; }
    .load-heading h1 { font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #000; }
    .load-heading .sub { font-size: 11px; color: #333; margin-top: 4px; }
    .badge { display: inline-block; font-size: 9px; padding: 1px 6px; border: 1px solid #555; font-weight: bold; }

    .info-meta-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; gap: 24px; }
    .load-info-box { border: 1px solid #000; padding: 8px 12px 12px; width: 52%; font-size: 11px; line-height: 1.9; }
    .load-info-box .box-label { font-weight: bold; margin-bottom: 6px; display: block; }
    .meta-table { border-collapse: collapse; font-size: 11px; width: 44%; }
    .meta-table td { padding: 4px 10px; border: 1px solid #ccc; }
    .meta-table td.lbl { font-weight: bold; background: #f5f5f5; text-align: right; width: 48%; border-right: 2px solid #bbb; }

    table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    table.data-table th { background: #1a3a6b; color: #fff; padding: 5px 8px; font-size: 10.5px; border: 1px solid #122a55; text-align: left; }
    table.data-table td { border: 1px solid #ccc; padding: 5px 8px; font-size: 11px; }

    .stops-section { margin-bottom: 22px; }
    .stops-header { display: grid; grid-template-columns: 90px 190px 170px 1fr; font-size: 11px; font-weight: bold; text-decoration: underline; color: #1a56db; margin-bottom: 4px; padding-left: 2px; }
    .stop-row { display: grid; grid-template-columns: 90px 190px 170px 1fr; font-size: 11px; color: #1a56db; padding: 2px 2px; line-height: 1.65; }

    .bottom-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px; gap: 20px; }
    .notes-col { flex: 1; font-size: 11px; }
    .notes-col strong { display: block; margin-bottom: 4px; }
    .fin-col { width: 44%; }
    table.fin-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    table.fin-table th { border: 1px solid #bbb; padding: 5px 10px; background: #ececec; font-weight: bold; }
    table.fin-table td { border: 1px solid #ccc; padding: 5px 10px; }
    table.fin-table .fin-blue { color: #1a56db; }
    table.fin-table .total-row td { font-weight: bold; border-top: 2px solid #aaa; }

    .total-due-block { display: flex; justify-content: flex-end; margin-top: 18px; }
    table.total-table { border-collapse: collapse; font-size: 11px; }
    table.total-table td { border: 1px solid #000; padding: 5px 14px; }
    table.total-table td.lbl { font-weight: bold; border-right: 1px solid #ccc; background: #f5f5f5; }
    table.total-table td.val { font-weight: bold; }

    .page-footer { margin-top: auto; padding-top: 18px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 10px; color: #1a56db; }
    @page { margin: 0.3in; }
  </style>
</head>
<body>
<div class="page">

  <!-- TOP HEADER -->
  <div class="top-header">
    <div class="company-block">
      <span class="co-name">${company.company_name || ''}</span><br>
      ${company.address_1 ? `<span class="co-detail">${company.address_1}</span><br>` : ''}
      ${company.address_2 ? `<span class="co-detail">${company.address_2}</span><br>` : ''}
      <span class="co-detail">${company.city || ''}${company.state ? ', ' + company.state : ''} ${company.zip || ''}</span><br>
      ${company.phone ? `<span class="co-detail">Phone #: ${company.phone}</span>` : ''}
    </div>
    <div class="load-heading">
      <h1>LOAD SHEET</h1>
      <div class="sub">Load #: ${load.internal_load_number || ''} &nbsp; <span class="badge">${(load.status || 'DRAFT').toUpperCase()}</span></div>
      ${load.external_load_number ? `<div class="sub">Broker Load #: ${load.external_load_number}</div>` : ''}
    </div>
  </div>

  <!-- INFO + META -->
  <div class="info-meta-row">
    <div class="load-info-box">
      <span class="box-label">Load Information</span>
      <b>Customer:</b> ${load.customer_name || '—'}<br>
      <b>Load Type:</b> ${load.load_type || '—'} &nbsp;&nbsp; <b>Equipment:</b> ${(load.equipment_type || '—').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}<br>
      ${load.commodity ? `<b>Commodity:</b> ${load.commodity}<br>` : ''}
      ${load.weight ? `<b>Weight:</b> ${load.weight.toLocaleString()} lbs<br>` : ''}
      ${load.billable_miles ? `<b>Miles:</b> ${load.billable_miles.toLocaleString()}<br>` : ''}
      ${load.bol_number ? `<b>BOL #:</b> ${load.bol_number}<br>` : ''}
    </div>
    <table class="meta-table">
      <tr><td class="lbl">Driver</td><td>${load.driver_1_name || '—'}</td></tr>
      <tr><td class="lbl">Truck #</td><td>${load.truck_number || '—'}</td></tr>
      <tr><td class="lbl">Trailer #</td><td>${load.trailer_number || '—'}</td></tr>
      ${load.driver_2_name ? `<tr><td class="lbl">Driver 2</td><td>${load.driver_2_name}</td></tr>` : ''}
    </table>
  </div>

  <!-- LOAD ROUTE TABLE -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:95px">Date</th>
        <th>Customer Load #</th>
        <th style="width:110px">Trailer #</th>
        <th>Route</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${pickups[0]?.appointment_date || ''}</td>
        <td>${load.external_load_number || load.customer_load_number || '—'}</td>
        <td>${load.trailer_number || '—'}</td>
        <td>${routeSummary}</td>
      </tr>
    </tbody>
  </table>

  <!-- STOPS -->
  ${allStops.length > 0 ? `
  <div class="stops-section">
    <div class="stops-header">
      <span>Stop Type</span>
      <span>Address</span>
      <span>Ref #</span>
      <span>Date / Time</span>
    </div>
    ${allStops.map(s => `
    <div class="stop-row">
      <span>${stopTypeLabel[s.stop_type] || s.stop_type || ''}</span>
      <span>${s.city || ''}${s.state ? ', ' + s.state : ''} ${s.zip || ''}</span>
      <span>${s.reference_number || s.bol_number || ''}</span>
      <span>${s.appointment_date || ''}${s.time_from ? ' ' + s.time_from : ''}${s.time_to ? ' – ' + s.time_to : ''}</span>
    </div>`).join('')}
  </div>` : '<div style="margin-bottom:22px"></div>'}

  <!-- BOTTOM: NOTES + FINANCIALS -->
  <div class="bottom-section">
    <div class="notes-col">
      <strong>Notes :</strong>
      ${load.notes || ''}
      ${load.special_instructions ? `<br><br><strong>Special Instructions :</strong><br><span style="font-size:10.5px">${load.special_instructions}</span>` : ''}
    </div>
    <div class="fin-col">
      <table class="fin-table">
        <thead>
          <tr>
            <th style="text-align:left">Description</th>
            <th style="text-align:right;width:110px">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="fin-blue">Freight Income</td><td style="text-align:right">${fmt(load.freight_rate)}</td></tr>
          ${load.fuel_surcharge ? `<tr><td class="fin-blue">Fuel Surcharge</td><td style="text-align:right">${fmt(load.fuel_surcharge)}</td></tr>` : ''}
          ${load.extra_charges ? `<tr><td class="fin-blue">Extra Charges</td><td style="text-align:right">${fmt(load.extra_charges)}</td></tr>` : ''}
          <tr class="total-row"><td style="text-align:right">Sub Total :</td><td style="text-align:right">${fmt(total)}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- TOTAL DUE -->
  <div class="total-due-block">
    <table class="total-table">
      <tr>
        <td class="lbl">Total Due:</td>
        <td class="val">${fmt(total)}</td>
      </tr>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="page-footer">
    <span>${company.company_name || ''}</span>
    <span>Printed ${new Date().toLocaleDateString()}</span>
    <span>Page 1 Of 1</span>
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