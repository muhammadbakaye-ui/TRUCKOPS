import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CircleAlert, Loader2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function buildWarnings(trucks, trailers, maintenanceRecords, inspections) {
  const warnings = [];
  const today = new Date();

  // Last service date per vehicle
  const lastServiceMap = {};
  maintenanceRecords.forEach(r => {
    if (!lastServiceMap[r.vehicle_id] || r.date > lastServiceMap[r.vehicle_id]) {
      lastServiceMap[r.vehicle_id] = r.date;
    }
  });

  // Last inspection result per truck
  const lastInspectionMap = {};
  inspections.forEach(i => {
    if (!lastInspectionMap[i.truck_id] || i.date > lastInspectionMap[i.truck_id].date) {
      lastInspectionMap[i.truck_id] = { date: i.date, result: i.result, defects: i.defects_noted, corrected: i.defects_corrected };
    }
  });

  const allVehicles = [
    ...trucks.map(t => ({ id: t.id, number: t.unit_number, type: 'Truck', status: t.status })),
    ...trailers.map(t => ({ id: t.id, number: t.unit_number, type: 'Trailer', status: t.status })),
  ];

  allVehicles.forEach(v => {
    // Maintenance warnings
    const lastService = lastServiceMap[v.id];
    if (!lastService) {
      warnings.push({ vehicle: v, severity: 'high', type: 'No Maintenance Record', action: 'Add a maintenance record for this vehicle.' });
    } else {
      const daysSince = differenceInDays(today, parseISO(lastService));
      if (daysSince > 90) {
        warnings.push({ vehicle: v, severity: 'high', type: 'Overdue Maintenance', action: `Last service was ${daysSince} days ago. Service overdue.` });
      } else if (daysSince > 60) {
        warnings.push({ vehicle: v, severity: 'medium', type: 'Maintenance Due Soon', action: `Last service was ${daysSince} days ago. Service due soon.` });
      }
    }

    // Inspection warnings (trucks only)
    if (v.type === 'Truck') {
      const lastInsp = lastInspectionMap[v.id];
      if (!lastInsp) {
        warnings.push({ vehicle: v, severity: 'medium', type: 'No Inspection Record', action: 'No inspection on file for this truck.' });
      } else if (lastInsp.result === 'fail' && !lastInsp.corrected) {
        warnings.push({ vehicle: v, severity: 'high', type: 'Failed Inspection — Defects Not Corrected', action: `Defects reported: ${lastInsp.defects || 'see inspection log'}. Correct before operating.` });
      }
    }

    // Out of service status
    if (v.status === 'out_of_service') {
      warnings.push({ vehicle: v, severity: 'high', type: 'Out of Service', action: 'Vehicle is marked out of service.' });
    }
  });

  return warnings.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

const SEVERITY_STYLES = {
  high: { badge: 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20', label: 'High' },
  medium: { badge: 'text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20', label: 'Medium' },
  low: { badge: 'text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-900/20', label: 'Low' },
};

function WarningSection({ title, badgeClass, items }) {
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
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((w, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono font-medium">{w.vehicle.number}</td>
                <td className="px-4 py-3 text-muted-foreground">{w.vehicle.type}</td>
                <td className="px-4 py-3 font-medium">{w.type}</td>
                <td className="px-4 py-3 text-muted-foreground">{w.action}</td>
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

  const { data: trucks = [], isLoading: trucksLoading } = useQuery({
    queryKey: ['trucks', tenantId],
    queryFn: () => tenantId ? base44.entities.Truck.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });
  const { data: trailers = [], isLoading: trailersLoading } = useQuery({
    queryKey: ['trailers', tenantId],
    queryFn: () => tenantId ? base44.entities.Trailer.filter({ tenant_id: tenantId }, 'unit_number', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });
  const { data: maintenanceRecords = [], isLoading: maintLoading } = useQuery({
    queryKey: ['maintenance', tenantId],
    queryFn: () => tenantId ? base44.entities.MaintenanceRecord.filter({ tenant_id: tenantId }, '-date', 500) : Promise.resolve([]),
    enabled: !!tenantId,
  });
  const { data: inspections = [], isLoading: inspLoading } = useQuery({
    queryKey: ['inspections', tenantId],
    queryFn: () => tenantId ? base44.entities.TruckInspection.filter({ tenant_id: tenantId }, '-date', 500) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const warnings = useMemo(() => buildWarnings(trucks, trailers, maintenanceRecords, inspections), [trucks, trailers, maintenanceRecords, inspections]);

  const highItems = warnings.filter(w => w.severity === 'high');
  const mediumItems = warnings.filter(w => w.severity === 'medium');

  const isLoading = trucksLoading || trailersLoading || maintLoading || inspLoading;

  return (
    <div className="p-4 space-y-5">
      <PageHeader
        title="Equipment Warnings"
        description={`${warnings.length} warning${warnings.length !== 1 ? 's' : ''} across ${trucks.length + trailers.length} vehicles`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(createPageUrl('VehicleMaintenance'))}>
              View Maintenance
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(createPageUrl('TruckInspections'))}>
              View Inspections
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Scanning fleet...
        </div>
      ) : warnings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <CircleAlert className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium text-green-600">No equipment warnings detected.</p>
          <p className="text-xs mt-1 text-muted-foreground">All vehicles are up to date based on your maintenance and inspection records.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <WarningSection
            title="High Priority"
            badgeClass="text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20"
            items={highItems}
          />
          <WarningSection
            title="Medium Priority"
            badgeClass="text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20"
            items={mediumItems}
          />
        </div>
      )}
    </div>
  );
}