import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CircleAlert, Loader2, X, History } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const DISMISS_KEY = 'dismissed_equipment_warnings';

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}'); } catch { return {}; }
}
function saveDismissed(obj) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify(obj));
}

function buildWarnings(trucks, trailers, maintenanceRecords, inspections) {
  const warnings = [];
  const today = new Date();
  const lastServiceMap = {};
  maintenanceRecords.forEach(r => {
    if (!lastServiceMap[r.vehicle_id] || r.date > lastServiceMap[r.vehicle_id]) lastServiceMap[r.vehicle_id] = r.date;
  });
  const lastInspectionMap = {};
  inspections.forEach(i => {
    if (!lastInspectionMap[i.truck_id] || i.date > lastInspectionMap[i.truck_id].date)
      lastInspectionMap[i.truck_id] = { date: i.date, result: i.result, defects: i.defects_noted, corrected: i.defects_corrected };
  });

  const allVehicles = [
    ...trucks.map(t => ({ id: t.id, number: t.unit_number, type: 'Truck', status: t.status })),
    ...trailers.map(t => ({ id: t.id, number: t.unit_number, type: 'Trailer', status: t.status })),
  ];

  allVehicles.forEach(v => {
    const lastService = lastServiceMap[v.id];
    if (!lastService) {
      warnings.push({ vehicle: v, severity: 'high', type: 'No Maintenance Record', action: 'Add a maintenance record for this vehicle.', key: `${v.id}-no-maint` });
    } else {
      const daysSince = differenceInDays(today, parseISO(lastService));
      if (daysSince > 90) {
        warnings.push({ vehicle: v, severity: 'high', type: 'Overdue Maintenance', action: `Last service was ${daysSince} days ago. Service overdue.`, key: `${v.id}-overdue-maint` });
      } else if (daysSince > 60) {
        warnings.push({ vehicle: v, severity: 'medium', type: 'Maintenance Due Soon', action: `Last service was ${daysSince} days ago. Service due soon.`, key: `${v.id}-due-soon-maint` });
      }
    }
    if (v.type === 'Truck') {
      const lastInsp = lastInspectionMap[v.id];
      if (!lastInsp) {
        warnings.push({ vehicle: v, severity: 'medium', type: 'No Inspection Record', action: 'No inspection on file for this truck.', key: `${v.id}-no-insp` });
      } else if (lastInsp.result === 'fail' && !lastInsp.corrected) {
        warnings.push({ vehicle: v, severity: 'high', type: 'Failed Inspection — Defects Not Corrected', action: `Defects: ${lastInsp.defects || 'see inspection log'}. Correct before operating.`, key: `${v.id}-failed-insp` });
      }
    }
    if (v.status === 'out_of_service') {
      warnings.push({ vehicle: v, severity: 'high', type: 'Out of Service', action: 'Vehicle is marked out of service.', key: `${v.id}-oos` });
    }
  });

  return warnings.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]));
}

function HistoryDialog({ open, onClose, vehicle, maintenanceRecords, inspections }) {
  if (!vehicle) return null;
  const maint = maintenanceRecords.filter(r => r.vehicle_id === vehicle.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  const insp = inspections.filter(i => i.truck_id === vehicle.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">History — {vehicle.type} #{vehicle.number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Maintenance ({maint.length} records)</h4>
            {maint.length === 0 ? <p className="text-xs text-muted-foreground">No maintenance records.</p> : (
              <div className="space-y-1">
                {maint.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                    <span className="text-muted-foreground w-24 flex-shrink-0">{r.date}</span>
                    <span className="flex-1 capitalize">{r.maintenance_type?.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground">{r.vendor || ''}</span>
                    <span className="font-medium ml-4">{r.cost ? `$${r.cost.toLocaleString()}` : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {vehicle.type === 'Truck' && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Inspections ({insp.length} records)</h4>
              {insp.length === 0 ? <p className="text-xs text-muted-foreground">No inspection records.</p> : (
                <div className="space-y-1">
                  {insp.map(i => (
                    <div key={i.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                      <span className="text-muted-foreground w-24 flex-shrink-0">{i.date}</span>
                      <span className="flex-1 capitalize">{i.inspection_type?.replace(/_/g, ' ')}</span>
                      <Badge variant="outline" className={i.result === 'fail' ? 'text-red-600 border-red-300 bg-red-50 text-[10px]' : 'text-green-600 border-green-300 bg-green-50 text-[10px]'}>{i.result}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WarningSection({ title, badgeClass, items, onDismiss, onViewHistory }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>{items.length}</Badge>
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vehicle</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Warning</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Recommended Action</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((w, i) => (
              <tr key={`${w.key}-${i}`} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono font-medium">#{w.vehicle.number}</td>
                <td className="px-4 py-3 text-muted-foreground">{w.vehicle.type}</td>
                <td className="px-4 py-3 font-medium">{w.type}</td>
                <td className="px-4 py-3 text-muted-foreground">{w.action}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onViewHistory(w.vehicle)}>
                      <History className="w-3 h-3" /> History
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => onDismiss(w)}>
                      <X className="w-3 h-3" /> Dismiss
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EquipmentWarnings() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(getDismissed);
  const [historyVehicle, setHistoryVehicle] = useState(null);

  const { data: trucks = [], isLoading: trucksLoading } = useQuery({ queryKey: ['trucks', tenantId], queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]), enabled: !!tenantId });
  const { data: trailers = [], isLoading: trailersLoading } = useQuery({ queryKey: ['trailers', tenantId], queryFn: () => tenantId ? base44.entities.Trailer.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]), enabled: !!tenantId });
  const { data: maintenanceRecords = [], isLoading: maintLoading } = useQuery({ queryKey: ['maintenance', tenantId], queryFn: () => tenantId ? base44.entities.MaintenanceRecord.filter({ tenant_id: tenantId }, '-date', 500) : Promise.resolve([]), enabled: !!tenantId });
  const { data: inspections = [], isLoading: inspLoading } = useQuery({ queryKey: ['inspections', tenantId], queryFn: () => tenantId ? base44.entities.TruckInspection.filter({ tenant_id: tenantId }, '-date', 500) : Promise.resolve([]), enabled: !!tenantId });

  const allWarnings = useMemo(() => buildWarnings(trucks, trailers, maintenanceRecords, inspections), [trucks, trailers, maintenanceRecords, inspections]);
  const warnings = allWarnings.filter(w => !dismissed[w.key]);

  const highItems = warnings.filter(w => w.severity === 'high');
  const mediumItems = warnings.filter(w => w.severity === 'medium');
  const isLoading = trucksLoading || trailersLoading || maintLoading || inspLoading;

  const handleDismiss = (w) => {
    const next = { ...dismissed, [w.key]: Date.now() };
    setDismissed(next);
    saveDismissed(next);
    toast.success('Warning dismissed');
  };

  return (
    <div className="p-4 space-y-5">
      <PageHeader
        title="Equipment Warnings"
        description={`${warnings.length} warning${warnings.length !== 1 ? 's' : ''} across ${trucks.length + trailers.length} vehicles`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(createPageUrl('VehicleMaintenance'))}>View Maintenance</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(createPageUrl('TruckInspections'))}>View Inspections</Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Scanning fleet…</div>
      ) : warnings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <CircleAlert className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium text-green-600">No equipment warnings detected.</p>
          <p className="text-xs mt-1 text-muted-foreground">All vehicles are up to date based on your maintenance and inspection records.</p>
          {Object.keys(dismissed).length > 0 && (
            <Button variant="ghost" size="sm" className="mt-3 text-xs text-muted-foreground" onClick={() => { setDismissed({}); saveDismissed({}); }}>
              Clear {Object.keys(dismissed).length} dismissed warning{Object.keys(dismissed).length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <WarningSection title="High Priority" badgeClass="text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20" items={highItems} onDismiss={handleDismiss} onViewHistory={setHistoryVehicle} />
          <WarningSection title="Medium Priority" badgeClass="text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20" items={mediumItems} onDismiss={handleDismiss} onViewHistory={setHistoryVehicle} />
          {Object.keys(dismissed).length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => { setDismissed({}); saveDismissed({}); }}>
              Restore {Object.keys(dismissed).length} dismissed warning{Object.keys(dismissed).length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      )}

      <HistoryDialog open={!!historyVehicle} onClose={() => setHistoryVehicle(null)} vehicle={historyVehicle} maintenanceRecords={maintenanceRecords} inspections={inspections} />
    </div>
  );
}