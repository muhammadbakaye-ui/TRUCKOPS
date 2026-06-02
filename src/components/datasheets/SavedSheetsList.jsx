import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Download, Trash2, TableProperties } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

// ─── Excel Export ────────────────────────────────────────────────────────────

function getRoute(load) {
  const parts = [];
  if (load.pickup_city) parts.push(`${load.pickup_city}${load.pickup_state ? ', ' + load.pickup_state : ''}`);
  if (load.delivery_city) parts.push(`${load.delivery_city}${load.delivery_state ? ', ' + load.delivery_state : ''}`);
  return parts.join(' → ');
}

const COL_DEFS = [
  { key: 'internal_load_number', label: 'LOAD #' },
  { key: 'external_load_number', label: 'BROKER LOAD #' },
  { key: 'trip_number', label: 'TRIP #' },
  { key: 'customer_reference_number', label: 'REFERENCE #' },
  { key: 'customer_name', label: 'CUSTOMER' },
  { key: '__route', label: 'ROUTE' },
  { key: 'pickup_date', label: 'PICKUP DATE' },
  { key: 'delivery_date', label: 'DELIVERY DATE' },
  { key: 'freight_rate', label: 'AMOUNT' },
];

function hasVal(load, key) {
  if (key === '__route') return !!(load.pickup_city || load.delivery_city);
  return load[key] != null && load[key] !== '';
}

function getCellVal(load, key) {
  if (key === '__route') return getRoute(load) || null;
  if (key === 'freight_rate') return load.freight_rate ?? null;
  return load[key] || null;
}

function exportToExcel(sheet) {
  const {
    loads_snapshot = [],
    driver_name = '',
    truck_number = '',
    sheet_name = '',
    period_from = '',
    period_to = '',
    period_label = 'Period',
    company_name = '',
    company_address = '',
    company_phone = '',
    customers = [],
    badge_label = '',
  } = sheet;

  const visibleCols = COL_DEFS.filter((col) =>
    loads_snapshot.some((l) => hasVal(l, col.key))
  );

  const wb = XLSX.utils.book_new();
  const rows = [];

  // Header info
  rows.push([company_name]);
  if (company_address) rows.push([company_address]);
  if (company_phone) rows.push([company_phone]);
  rows.push(['']);
  rows.push([
    `DRIVER: ${driver_name}`,
    `TRUCK: #${truck_number}`,
    `${period_label || 'PERIOD'}: ${period_from}${period_to ? ' — ' + period_to : ''}`,
    `CUSTOMERS: ${customers.join(', ')}`,
    badge_label ? `LABEL: ${badge_label}` : '',
  ]);
  rows.push(['']);

  // Column headers
  rows.push(['#', ...visibleCols.map((c) => c.label)]);

  // Data rows
  let totalAmount = 0;
  loads_snapshot.forEach((load, idx) => {
    const row = [idx + 1];
    visibleCols.forEach((col) => {
      const val = getCellVal(load, col.key);
      if (col.key === 'freight_rate' && val != null) totalAmount += Number(val);
      row.push(val ?? '—');
    });
    rows.push(row);
  });

  // Total row
  const totalRow = [`Total — ${loads_snapshot.length} loads`];
  visibleCols.forEach((col) => {
    if (col.key === 'freight_rate') totalRow.push(totalAmount);
    else totalRow.push('');
  });
  rows.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Driver Loads');

  const date = new Date().toISOString().split('T')[0];
  const fname = `${driver_name.replace(/\s+/g, '_')}_${sheet_name.replace(/\s+/g, '_')}_${date}.xlsx`;
  XLSX.writeFile(wb, fname);
}

// ─── Group sheets by month ────────────────────────────────────────────────────

function groupByMonth(sheets) {
  const groups = {};
  sheets.forEach((s) => {
    const raw = s.generated_at || s.created_date;
    const key = raw
      ? (() => { try { return format(parseISO(raw), 'MMMM yyyy'); } catch { return 'Unknown'; } })()
      : 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });
  return groups;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SavedSheetsList({ sheets, editingSheetId, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!sheets.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-10" style={{ minHeight: 320 }}>
        <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-4">
          <TableProperties className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">No sheets generated yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Select a driver, configure details, pick loads, and generate.
        </p>
      </div>
    );
  }

  const grouped = groupByMonth(sheets);

  return (
    <div className="p-4 max-w-3xl">
      <h2 className="text-sm font-bold mb-1">Saved Sheets</h2>
      <p className="text-xs text-muted-foreground mb-4">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''} total</p>

      {Object.entries(grouped).map(([month, monthSheets]) => (
        <div key={month} className="mb-6">
          {/* Month header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
              {month}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-2">
            {monthSheets.map((sheet) => {
              const isEditing = sheet.id === editingSheetId;
              const totalAmount = (sheet.loads_snapshot || []).reduce(
                (sum, l) => sum + (l.freight_rate || 0),
                0
              );
              const loadCount = sheet.load_ids?.length || 0;

              return (
                <div
                  key={sheet.id}
                  className={cn(
                    'border rounded-lg p-3 bg-card transition-colors',
                    isEditing ? 'border-primary/60 bg-primary/5' : 'border-border'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold">{sheet.sheet_name}</span>
                        {isEditing && (
                          <Badge variant="outline" className="text-[10px] border-primary text-primary">
                            Editing sheet...
                          </Badge>
                        )}
                        {sheet.badge_label && (
                          <Badge className="text-[10px] bg-primary text-primary-foreground px-2">
                            {sheet.badge_label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{sheet.driver_name}</p>
                      {sheet.truck_number && (
                        <p className="text-xs text-muted-foreground">Truck #{sheet.truck_number}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        <span className="text-muted-foreground">{loadCount} load{loadCount !== 1 ? 's' : ''}</span>
                        <span className="font-semibold text-green-500">
                          ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {(sheet.period_from || sheet.period_to) && (
                          <span className="text-muted-foreground">
                            {sheet.period_from}
                            {sheet.period_to ? ` — ${sheet.period_to}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => onEdit(sheet)}
                      >
                        <Edit2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                        onClick={() => exportToExcel(sheet)}
                      >
                        <Download className="w-3 h-3" />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                      {confirmDelete === sheet.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={() => { onDelete(sheet.id); setConfirmDelete(null); }}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setConfirmDelete(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDelete(sheet.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}