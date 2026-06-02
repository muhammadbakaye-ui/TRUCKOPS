import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const COL_DEFS = [
  { key: 'external_load_number',      label: 'Broker Load' },
  { key: 'trip_number',               label: 'Trip' },
  { key: 'customer_reference_number', label: 'Reference' },
  { key: 'customer_name',             label: 'Customer' },
  { key: '__route',                   label: 'Route' },
  { key: 'pickup_date',               label: 'Pickup Date' },
  { key: 'delivery_date',             label: 'Delivery Date' },
  { key: 'freight_rate',              label: 'Amount' },
];

function getRoute(load) {
  const from = [load.pickup_city, load.pickup_state].filter(Boolean).join(', ');
  const to   = [load.delivery_city, load.delivery_state].filter(Boolean).join(', ');
  if (from && to) return `${from} → ${to}`;
  return from || to || '';
}

function hasVal(load, key) {
  if (key === '__route') return !!(load.pickup_city || load.delivery_city);
  return load[key] != null && load[key] !== '';
}

export function exportDataSheetXlsx(loads, driverName, sheetName) {
  if (!loads || loads.length === 0) return;

  const visibleCols = COL_DEFS.filter(col => loads.some(l => hasVal(l, col.key)));

  const rows = loads.map(load => {
    const row = {};
    visibleCols.forEach(col => {
      if (col.key === '__route') {
        row[col.label] = getRoute(load) || '';
      } else if (col.key === 'freight_rate') {
        row[col.label] = load.freight_rate != null ? Number(load.freight_rate) : '';
      } else {
        row[col.label] = load[col.key] != null ? load[col.key] : '';
      }
    });
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Loads');

  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const safeName = (s) => (s || '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  const fileName = `${safeName(driverName)}_${safeName(sheetName)}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}