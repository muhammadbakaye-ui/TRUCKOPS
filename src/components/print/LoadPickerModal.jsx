import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Truck } from 'lucide-react';
import { format, parse } from 'date-fns';

function buildTripLine(l, driver, idx) {
  const extractTripNum = (desc) => { if (!desc) return null; const m = desc.match(/_(\d{3})_/); return m ? m[1] : null; };
  const tripNum = l.trip_number || extractTripNum(l.external_load_number) || extractTripNum(l.customer_reference_number) || extractTripNum(l.internal_load_number);
  const loadRevenue = l.driver_rate || l.invoice_amount || l.freight_rate || 0;
  let driverPay = loadRevenue;
  if (driver?.pay_type && driver?.pay_rate) {
    if (driver.pay_type === 'percentage') driverPay = loadRevenue * (driver.pay_rate / 100);
    else if (driver.pay_type === 'per_mile' && l.billable_miles) driverPay = l.billable_miles * driver.pay_rate;
    else if (driver.pay_type === 'flat_rate') driverPay = driver.pay_rate;
  }
  const externalNum = l.external_load_number || '';
  const loadRef = tripNum ? `${tripNum} / ${externalNum || l.internal_load_number}` : (externalNum || l.internal_load_number || '');
  return {
    _key: `trip_${l.id || Date.now()}_${idx}`,
    line_type: 'trip', source_id: l.id, source_type: 'load',
    date: l.pickup_date || '',
    description: l.customer_name ? `${loadRef} — ${l.customer_name}` : loadRef,
    route: `${l.pickup_city || ''}${l.pickup_state ? `, ${l.pickup_state}` : ''} → ${l.delivery_city || ''}${l.delivery_state ? `, ${l.delivery_state}` : ''}`,
    amount: driverPay,
    internal_load_number: l.internal_load_number || '',
  };
}

export default function LoadPickerModal({ open, onClose, driver, periodStart, periodEnd, existingSourceIds, onAdd }) {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (!open || !driver) return;
    setSelected(new Set());
    setShowAll(false);
    setLoading(true);
    base44.entities.Load.filter({ driver_1_id: driver.id }, 'pickup_date', 500)
      .then(data => setLoads(data.filter(l => !l.canceled && l.status !== 'canceled').sort((a, b) => (a.pickup_date || '').localeCompare(b.pickup_date || ''))))
      .finally(() => setLoading(false));
  }, [open, driver]);

  const weekLoads = loads.filter(l => l.pickup_date && periodStart && periodEnd && l.pickup_date >= periodStart && l.pickup_date <= periodEnd);
  const displayedLoads = showAll ? loads : weekLoads;

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleAdd = () => {
    const toAdd = displayedLoads
      .filter(l => selected.has(l.id) && !existingSourceIds.has(l.id))
      .map((l, i) => buildTripLine(l, driver, i));
    onAdd(toAdd);
    onClose();
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try { return format(parse(d, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy'); } catch { return d; }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Pick Loads — {driver?.full_name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {showAll ? `All loads (${loads.length})` : `This week's loads (${weekLoads.length})`}
              </span>
              {!showAll && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAll(true)}>
                  Show all loads
                </Button>
              )}
              {showAll && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAll(false)}>
                  Show this week only
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto border rounded-md divide-y">
              {displayedLoads.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  {showAll ? 'No loads found for this driver.' : 'No loads this week. Click "Show all loads" to see all.'}
                </p>
              )}
              {displayedLoads.map(l => {
                const alreadyAdded = existingSourceIds.has(l.id);
                const isSelected = selected.has(l.id);
                return (
                  <div
                    key={l.id}
                    onClick={() => !alreadyAdded && toggle(l.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-xs transition-colors
                      ${alreadyAdded ? 'opacity-40 cursor-not-allowed bg-muted/30' : 'cursor-pointer hover:bg-accent'}
                      ${isSelected ? 'bg-primary/10' : ''}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      disabled={alreadyAdded}
                      className="w-3.5 h-3.5 accent-primary"
                    />
                    <span className="w-24 shrink-0 text-muted-foreground font-mono">{formatDate(l.pickup_date)}</span>
                    <span className="w-20 shrink-0 font-mono font-semibold">{l.internal_load_number}</span>
                    <span className="flex-1 truncate text-muted-foreground">{l.customer_name || '—'}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {l.pickup_city}{l.pickup_state ? `, ${l.pickup_state}` : ''} → {l.delivery_city}{l.delivery_state ? `, ${l.delivery_state}` : ''}
                    </span>
                    {alreadyAdded && <span className="text-[10px] text-muted-foreground italic ml-1">added</span>}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-3">
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
                <Button size="sm" className="h-8 text-xs gap-1" onClick={handleAdd} disabled={selected.size === 0}>
                  <Truck className="w-3 h-3" /> Add {selected.size > 0 ? selected.size : ''} Load{selected.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}