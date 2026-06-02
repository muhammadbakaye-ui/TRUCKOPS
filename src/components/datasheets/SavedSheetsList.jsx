import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Download, Trash2, TableProperties } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildDataSheetHtml, printDataSheet } from '../print/printDataSheet';
import MobilePDFViewer from '../print/MobilePDFViewer';

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
  const [viewerSheet, setViewerSheet] = useState(null);

  const handleExport = (sheet) => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setViewerSheet(sheet);
    } else {
      printDataSheet(sheet);
    }
  };

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
    <>
    {viewerSheet && (
      <MobilePDFViewer
        htmlContent={buildDataSheetHtml(viewerSheet)}
        title={viewerSheet.sheet_name || 'Driver Loads'}
        onClose={() => setViewerSheet(null)}
      />
    )}
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
                        onClick={() => handleExport(sheet)}
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
    </>
  );
}