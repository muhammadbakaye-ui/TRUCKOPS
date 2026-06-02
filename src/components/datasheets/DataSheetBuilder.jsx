import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Filter, TableProperties } from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

function StepHeader({ num, label, locked }) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 border-b border-border', locked && 'opacity-40')}>
      <div
        className={cn(
          'w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0',
          locked ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
        )}
      >
        {num}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

export default function DataSheetBuilder({ session, ownerCompany, initialValues, onGenerated }) {
  const tenantId = session?.tenant_id;

  const [driverId, setDriverId] = useState(initialValues?.driver_id || '');
  const [truckId, setTruckId] = useState(initialValues?.truck_id || '');
  const [sheetName, setSheetName] = useState(initialValues?.sheet_name || '');
  const [badgeLabel, setBadgeLabel] = useState(initialValues?.badge_label || '');
  const [periodLabel, setPeriodLabel] = useState(initialValues?.period_label || '');
  const [periodFrom, setPeriodFrom] = useState(initialValues?.period_from || '');
  const [periodTo, setPeriodTo] = useState(initialValues?.period_to || '');
  const [filterByPeriod, setFilterByPeriod] = useState(false);
  const [customers, setCustomers] = useState(initialValues?.customers || []);
  const [customerInput, setCustomerInput] = useState('');
  const [manuallyRemoved, setManuallyRemoved] = useState(new Set());
  const [selectedLoadIds, setSelectedLoadIds] = useState(new Set(initialValues?.load_ids || []));
  const [loadSearch, setLoadSearch] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-active', tenantId],
    queryFn: () => base44.entities.Driver.filter({ tenant_id: tenantId, status: 'active' }),
    enabled: !!tenantId,
  });

  const { data: allTrucks = [] } = useQuery({
    queryKey: ['trucks-all', tenantId],
    queryFn: () => base44.entities.Truck.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });

  const { data: driverLoads = [], isLoading: loadsLoading } = useQuery({
    queryKey: ['loads-driver', tenantId, driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const [l1, l2] = await Promise.all([
        base44.entities.Load.filter({ tenant_id: tenantId, driver_1_id: driverId }),
        base44.entities.Load.filter({ tenant_id: tenantId, driver_2_id: driverId }),
      ]);
      const seen = new Set();
      return [...l1, ...l2].filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
    },
    enabled: !!driverId && !!tenantId,
  });

  const driverTrucks = useMemo(
    () => allTrucks.filter((t) => t.assigned_driver_id === driverId),
    [allTrucks, driverId]
  );

  const filteredLoads = useMemo(() => {
    let loads = [...driverLoads];
    if (filterByPeriod && periodFrom && periodTo) {
      loads = loads.filter((l) => {
        if (!l.pickup_date) return false;
        try {
          return isWithinInterval(parseISO(l.pickup_date), {
            start: parseISO(periodFrom),
            end: parseISO(periodTo),
          });
        } catch { return false; }
      });
    }
    if (loadSearch.trim()) {
      const q = loadSearch.toLowerCase();
      loads = loads.filter(
        (l) =>
          (l.internal_load_number || '').toLowerCase().includes(q) ||
          (l.external_load_number || '').toLowerCase().includes(q) ||
          (l.customer_name || '').toLowerCase().includes(q) ||
          (l.trip_number || '').toLowerCase().includes(q)
      );
    }
    return loads;
  }, [driverLoads, filterByPeriod, periodFrom, periodTo, loadSearch]);

  // Auto-extract customers when selection changes
  useEffect(() => {
    const auto = [
      ...new Set(
        driverLoads
          .filter((l) => selectedLoadIds.has(l.id) && l.customer_name)
          .map((l) => l.customer_name)
      ),
    ].filter((c) => !manuallyRemoved.has(c));

    setCustomers((prev) => {
      const manualOnly = prev.filter(
        (c) => !driverLoads.some((l) => l.customer_name === c)
      );
      return [...auto, ...manualOnly.filter((c) => !auto.includes(c))];
    });
  }, [selectedLoadIds, driverLoads]);

  const handleDriverChange = (val) => {
    setDriverId(val);
    setTruckId('');
    setSelectedLoadIds(new Set());
    setCustomers([]);
    setManuallyRemoved(new Set());
  };

  const toggleLoad = (id) => {
    setSelectedLoadIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const removeCustomer = (c) => {
    const isAuto = driverLoads.some((l) => l.customer_name === c);
    if (isAuto) setManuallyRemoved((prev) => new Set([...prev, c]));
    setCustomers((prev) => prev.filter((x) => x !== c));
  };

  const addCustomer = (e) => {
    if (e.key === 'Enter' && customerInput.trim()) {
      const c = customerInput.trim();
      if (!customers.includes(c)) setCustomers((prev) => [...prev, c]);
      setCustomerInput('');
    }
  };

  const handleGenerate = async () => {
    if (!driverId || selectedLoadIds.size === 0) return;
    setGenerating(true);
    try {
      const driver = drivers.find((d) => d.id === driverId);
      const truck = allTrucks.find((t) => t.id === truckId);
      const selectedLoads = driverLoads.filter((l) => selectedLoadIds.has(l.id));

      const addr = ownerCompany
        ? [ownerCompany.address_1, ownerCompany.city, ownerCompany.state, ownerCompany.zip]
            .filter(Boolean)
            .join(', ')
        : '';

      const data = {
        tenant_id: tenantId,
        sheet_name: sheetName || `Sheet ${format(new Date(), 'MMM d, yyyy')}`,
        badge_label: badgeLabel,
        period_label: periodLabel,
        period_from: periodFrom,
        period_to: periodTo,
        driver_id: driverId,
        driver_name: driver?.full_name || '',
        truck_id: truckId,
        truck_number: truck?.unit_number || '',
        customers,
        load_ids: [...selectedLoadIds],
        loads_snapshot: selectedLoads,
        company_name: ownerCompany?.company_name || session?.company_name || '',
        company_address: addr,
        company_phone: ownerCompany?.phone || '',
        generated_at: new Date().toISOString(),
      };

      if (initialValues?.id) {
        await base44.entities.DataSheet.update(initialValues.id, data);
      } else {
        await base44.entities.DataSheet.create(data);
      }
      onGenerated();
    } finally {
      setGenerating(false);
    }
  };

  const locked = !driverId;
  const canGenerate = !!driverId && selectedLoadIds.size > 0;

  return (
    <div className="flex flex-col relative">
      {/* Mini header */}
      <div className="px-3 py-2 border-b border-border bg-sidebar">
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Data Sheets</p>
      </div>

      {/* Step 1 — Driver & Truck */}
      <StepHeader num={1} label="Driver & Truck" />
      <div className="p-3 space-y-2 border-b border-border">
        <Select value={driverId} onValueChange={handleDriverChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select driver..." />
          </SelectTrigger>
          <SelectContent>
            {drivers.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={truckId} onValueChange={setTruckId} disabled={!driverId}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select truck..." />
          </SelectTrigger>
          <SelectContent>
            {driverTrucks.map((t) => (
              <SelectItem key={t.id} value={t.id}>#{t.unit_number}</SelectItem>
            ))}
            {driverTrucks.length === 0 && driverId && (
              <div className="px-3 py-2 text-xs text-muted-foreground">No trucks assigned</div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2 — Sheet Details */}
      <StepHeader num={2} label="Sheet Details" locked={locked} />
      <div className={cn('p-3 space-y-2 border-b border-border', locked && 'opacity-40 pointer-events-none')}>
        <Input
          placeholder="eg. May 2026 Settlement"
          value={sheetName}
          onChange={(e) => setSheetName(e.target.value)}
          className="h-9 text-sm"
        />
        <Input
          placeholder="Badge label (eg. Week 1, Q2)"
          value={badgeLabel}
          onChange={(e) => setBadgeLabel(e.target.value)}
          className="h-9 text-sm"
        />
        <Input
          placeholder="Period label (eg. Pay Period)"
          value={periodLabel}
          onChange={(e) => setPeriodLabel(e.target.value)}
          className="h-9 text-sm"
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
            className="h-9 text-xs flex-1"
          />
          <Input
            type="date"
            value={periodTo}
            onChange={(e) => setPeriodTo(e.target.value)}
            className="h-9 text-xs flex-1"
          />
        </div>
        {periodFrom && periodTo && (
          <Button
            variant={filterByPeriod ? 'default' : 'outline'}
            size="sm"
            className="w-full h-8 text-xs gap-1"
            onClick={() => setFilterByPeriod((f) => !f)}
          >
            <Filter className="w-3 h-3" />
            {filterByPeriod ? 'Showing period loads only' : 'Filter loads by this period'}
          </Button>
        )}
      </div>

      {/* Step 3 — Customers */}
      <StepHeader num={3} label="Customers" locked={locked} />
      <div className={cn('p-3 border-b border-border', locked && 'opacity-40 pointer-events-none')}>
        <div className="flex flex-wrap gap-1 mb-2 min-h-[20px]">
          {customers.map((c) => (
            <Badge key={c} variant="secondary" className="text-[10px] gap-1 pr-1 h-5">
              {c}
              <button onClick={() => removeCustomer(c)} className="ml-0.5 hover:text-destructive flex items-center">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
          <span className="text-primary font-semibold">AUTO</span>
          <span>· from selected loads · press Enter to add</span>
        </div>
        <Input
          placeholder="Add customer..."
          value={customerInput}
          onChange={(e) => setCustomerInput(e.target.value)}
          onKeyDown={addCustomer}
          className="h-8 text-xs"
        />
      </div>

      {/* Step 4 — Select Loads */}
      <StepHeader num={4} label="Select Loads" locked={locked} />
      <div className={cn('p-3', locked && 'opacity-40 pointer-events-none')}>
        <Input
          placeholder="Search by load #, customer, broker..."
          value={loadSearch}
          onChange={(e) => setLoadSearch(e.target.value)}
          className="h-8 text-xs mb-2"
        />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted-foreground">{selectedLoadIds.size} selected</span>
          {filteredLoads.length > 0 && (
            <button
              onClick={() => setSelectedLoadIds(new Set(filteredLoads.map((l) => l.id)))}
              className="text-[10px] text-primary hover:underline"
            >
              Select all
            </button>
          )}
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
          {loadsLoading ? (
            <p className="text-xs text-muted-foreground py-2">Loading loads...</p>
          ) : filteredLoads.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              {driverId ? 'No loads found for this driver' : 'Select a driver first'}
            </p>
          ) : (
            filteredLoads.map((load) => {
              const selected = selectedLoadIds.has(load.id);
              return (
                <label
                  key={load.id}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded cursor-pointer transition-colors',
                    selected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted border border-transparent'
                  )}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleLoad(load.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-mono text-primary font-semibold truncate">
                        {load.internal_load_number}
                      </span>
                      {load.freight_rate != null && (
                        <span className="text-xs font-mono font-bold flex-shrink-0">
                          ${load.freight_rate?.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {load.external_load_number && (
                      <p className="text-[10px] text-muted-foreground font-mono">{load.external_load_number}</p>
                    )}
                    {load.customer_name && (
                      <p className="text-[10px] text-muted-foreground truncate">{load.customer_name}</p>
                    )}
                    {load.pickup_date && (
                      <p className="text-[10px] text-muted-foreground">{load.pickup_date}</p>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Generate button — sticky to bottom */}
      <div className="sticky bottom-0 z-10 p-3 border-t border-border bg-card mt-2">
        <Button
          className="w-full h-10 gap-2"
          disabled={!canGenerate || generating}
          onClick={handleGenerate}
        >
          <TableProperties className="w-4 h-4" />
          {generating
            ? 'Saving...'
            : initialValues
            ? 'Update Spreadsheet'
            : 'Generate Spreadsheet'}
        </Button>
      </div>
    </div>
  );
}