import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, X, ChevronDown, ChevronRight, Loader2, Save, Check, Copy, Download } from 'lucide-react';
import SearchInput from '../components/shared/SearchInput';
import { printLoad } from '../components/print/printLoad';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import BulkDeleteBar from '../components/shared/BulkDeleteBar';
import MultiSelectFilter from '../components/shared/MultiSelectFilter';
import { format, parseISO } from 'date-fns';

const INVOICE_STATUS_STYLES = {
  not_invoiced: 'bg-muted text-muted-foreground border-border',
  invoiced: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  priority: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  sent: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  partial: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  paid: 'bg-green-500/10 text-green-600 border-green-500/30',
  overdue: 'bg-red-500/10 text-red-600 border-red-500/30',
  canceled: 'bg-muted text-muted-foreground border-border',
};

const INVOICE_STATUS_LABELS = {
  not_invoiced: 'Not Invoiced',
  invoiced: 'Invoiced',
  priority: 'Priority',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  canceled: 'Canceled',
};

function InvoiceStatusSelect({ load, queryClient }) {
  const [saving, setSaving] = useState(false);
  const current = load.invoice_status || 'not_invoiced';

  const handleChange = async (value) => {
    setSaving(true);
    // Update load invoice_status
    await base44.entities.Load.update(load.id, { invoice_status: value });

    // If switching back to not_invoiced, delete the linked Invoice record
    if (value === 'not_invoiced') {
      const existing = await base44.entities.Invoice.filter({ load_id: load.id }, '-created_date', 5);
      for (const inv of existing) {
        await base44.entities.Invoice.delete(inv.id);
      }
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      setSaving(false);
      toast.success('Invoice status updated');
      return;
    }

    // If moving away from not_invoiced, ensure an Invoice record exists
    if (value !== 'not_invoiced') {
      const existing = await base44.entities.Invoice.filter({ load_id: load.id }, '-created_date', 1);
      if (existing.length === 0) {
        // Generate invoice number
        const allInvoices = await base44.entities.Invoice.list('-created_date', 1);
        const lastNum = allInvoices.length > 0
          ? parseInt(allInvoices[0].invoice_number?.replace(/\D/g, '') || '999')
          : 999;
        const invoiceNumber = `INV-${lastNum + 1}`;
        const today = new Date().toISOString().split('T')[0];
        await base44.entities.Invoice.create({
          invoice_number: invoiceNumber,
          load_id: load.id,
          load_number: load.internal_load_number,
          customer_id: load.customer_id,
          customer_name: load.customer_name,
          invoice_date: today,
          total: load.invoice_amount || 0,
          subtotal: load.invoice_amount || 0,
          status: value === 'paid' ? 'paid' : value === 'sent' ? 'sent' : value === 'priority' ? 'priority' : 'draft',
          line_items: [
            { description: 'Line Haul', quantity: 1, rate: load.freight_rate || 0, amount: load.freight_rate || 0 },
            ...(load.fuel_surcharge ? [{ description: 'Fuel Surcharge', quantity: 1, rate: load.fuel_surcharge, amount: load.fuel_surcharge }] : []),
            ...(load.extra_charges ? [{ description: 'Extra Charges', quantity: 1, rate: load.extra_charges, amount: load.extra_charges }] : []),
          ],
        });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      } else {
        // Update existing invoice status to match
        const invStatus = value === 'paid' ? 'paid' : value === 'sent' ? 'sent' : value === 'priority' ? 'priority' : value === 'partial' ? 'partial' : value === 'overdue' ? 'overdue' : value === 'invoiced' ? 'draft' : 'draft';
        await base44.entities.Invoice.update(existing[0].id, { status: invStatus });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['loads'] });
    setSaving(false);
    toast.success('Invoice status updated');
  };

  return (
    <Select value={current} onValueChange={handleChange} disabled={saving}>
      <SelectTrigger className={`h-6 text-[11px] px-2 border rounded-md font-medium w-32 ${INVOICE_STATUS_STYLES[current] || ''}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(INVOICE_STATUS_LABELS).map(([val, label]) => (
          <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function Loads() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('search') || localStorage.getItem('loads_search') || '';
  });
  const [statusFilter, setStatusFilter] = useState(() => { try { return JSON.parse(localStorage.getItem('loads_status2')) || []; } catch { return []; } });
  const [invoiceFilter, setInvoiceFilter] = useState(() => { try { return JSON.parse(localStorage.getItem('loads_invoice2')) || []; } catch { return []; } });
  const [driverFilter, setDriverFilter] = useState(() => { try { return JSON.parse(localStorage.getItem('loads_driver2')) || []; } catch { return []; } });
  const [truckFilter, setTruckFilter] = useState(() => { try { return JSON.parse(localStorage.getItem('loads_truck2')) || []; } catch { return []; } });
  const [tripFilter, setTripFilter] = useState(() => { try { return JSON.parse(localStorage.getItem('loads_trip2')) || []; } catch { return []; } });
  const [dateFrom, setDateFrom] = useState(() => localStorage.getItem('loads_date_from') || '');
  const [dateTo, setDateTo] = useState(() => localStorage.getItem('loads_date_to') || '');
  const [selected, setSelected] = useState(new Set());
  const [bulkEditMode, setBulkEditMode] = useState(null); // 'amount' | 'driver' | 'truck'
  const [bulkEdits, setBulkEdits] = useState({}); // { [loadId]: { field: value } }
  const [savingBulk, setSavingBulk] = useState(false);
  const [expandedDates, setExpandedDates] = useState(() => {
    const saved = localStorage.getItem('loads_expanded_dates');
    return saved ? new Set(JSON.parse(saved)) : null; // null = all open by default
  });

  const toggleDate = (dateKey) => {
    setExpandedDates(prev => {
      // If null (all open), initialize with all keys except this one (collapsed)
      const allKeys = sortedDateKeys || [];
      const current = prev === null ? new Set(allKeys) : new Set(prev);
      if (current.has(dateKey)) { current.delete(dateKey); } else { current.add(dateKey); }
      localStorage.setItem('loads_expanded_dates', JSON.stringify([...current]));
      return current;
    });
  };

  useEffect(() => {
    localStorage.setItem('loads_search', search);
  }, [search]);

  useEffect(() => { localStorage.setItem('loads_status2', JSON.stringify(statusFilter)); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('loads_invoice2', JSON.stringify(invoiceFilter)); }, [invoiceFilter]);
  useEffect(() => { localStorage.setItem('loads_driver2', JSON.stringify(driverFilter)); }, [driverFilter]);
  useEffect(() => { localStorage.setItem('loads_truck2', JSON.stringify(truckFilter)); }, [truckFilter]);
  useEffect(() => { localStorage.setItem('loads_trip2', JSON.stringify(tripFilter)); }, [tripFilter]);
  useEffect(() => { localStorage.setItem('loads_date_from', dateFrom); }, [dateFrom]);
  useEffect(() => { localStorage.setItem('loads_date_to', dateTo); }, [dateTo]);

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: () => base44.entities.Load.list('-created_date', 1000),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.filter({ status: 'active' }, 'full_name', 200),
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => base44.entities.Truck.filter({ status: 'active' }, 'unit_number', 200),
  });

  const { data: company = {} } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => { const r = await base44.entities.Company.filter({ company_type: 'carrier' }, '-created_date', 1); return r[0] || {}; },
  });

  const handlePrintLoad = async (e, load) => {
    e.stopPropagation();
    const stops = await base44.entities.LoadStop.filter({ load_id: load.id }, 'stop_order', 50);
    printLoad({ company, load, stops, drivers, trucks, trailers: [] });
  };

  const [savingAllDrafts, setSavingAllDrafts] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyLoadNumber = (e, loadNumber) => {
    e.stopPropagation();
    navigator.clipboard.writeText(loadNumber);
    setCopiedId(loadNumber);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const deleteMutation = useMutation({
    mutationFn: async (loads) => {
      const loadsArray = Array.isArray(loads) ? loads : [loads];
      for (const load of loadsArray) {
        await base44.entities.DeletedItem.create({
          entity_type: 'Load',
          entity_id: load.id,
          entity_label: `Load #${load.internal_load_number} — ${load.customer_name || ''}`,
          deleted_date: new Date().toISOString().split('T')[0],
          original_data: JSON.stringify(load),
        });
        await base44.entities.Load.delete(load.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      const count = selected.size;
      toast.success(`${count} load${count === 1 ? '' : 's'} moved to deleted items`);
      setSelected(new Set());
    },
  });

  const handleSaveAllDrafts = async () => {
    const drafts = loads.filter(l => l.status === 'draft');
    if (drafts.length === 0) {
      toast.info('No draft loads to save');
      return;
    }
    setSavingAllDrafts(true);
    try {
      for (const draft of drafts) {
        await base44.entities.Load.update(draft.id, { status: 'saved' });
      }
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast.success(`${drafts.length} draft load${drafts.length === 1 ? '' : 's'} saved`);
    } catch (err) {
      toast.error('Failed to save drafts: ' + err.message);
    } finally {
      setSavingAllDrafts(false);
    }
  };

  const handleOpenBulkEdit = (field) => {
    setBulkEditMode(field);
    // Seed current values for selected loads
    const initial = {};
    loads.filter(l => selected.has(l.id)).forEach(l => {
      if (field === 'amount') initial[l.id] = l.invoice_amount ?? '';
      if (field === 'driver') initial[l.id] = l.driver_1_id || '';
      if (field === 'truck') initial[l.id] = l.truck_id || '';
      if (field === 'trip') initial[l.id] = l.trip_number || '';
    });
    setBulkEdits(initial);
  };

  const handleCancelBulkEdit = () => {
    setBulkEditMode(null);
    setBulkEdits({});
  };

  const handleSaveBulkEdit = async () => {
    setSavingBulk(true);
    const idsToUpdate = [...selected];
    await Promise.all(idsToUpdate.map(id => {
      const val = bulkEdits[id];
      if (bulkEditMode === 'amount') {
        const num = parseFloat(val);
        return isNaN(num) ? null : base44.entities.Load.update(id, { invoice_amount: num });
      }
      if (bulkEditMode === 'driver') {
        const driver = drivers.find(d => d.id === val);
        return base44.entities.Load.update(id, { driver_1_id: val || null, driver_1_name: driver?.full_name || '' });
      }
      if (bulkEditMode === 'truck') {
        const truck = trucks.find(t => t.id === val);
        return base44.entities.Load.update(id, { truck_id: val || null, truck_number: truck?.unit_number || '' });
      }
      if (bulkEditMode === 'trip') {
        return base44.entities.Load.update(id, { trip_number: val || null });
      }
    }).filter(Boolean));
    queryClient.invalidateQueries({ queryKey: ['loads'] });
    toast.success(`Updated ${idsToUpdate.length} load${idsToUpdate.length === 1 ? '' : 's'}`);
    setBulkEditMode(null);
    setBulkEdits({});
    setSelected(new Set());
    setSavingBulk(false);
  };

  const uniqueDrivers = [...new Set(loads
    .filter(l => l.driver_1_name)
    .map(l => l.driver_1_name))].sort();
  const uniqueTrucks = [...new Set(loads
    .filter(l => l.truck_number)
    .map(l => l.truck_number))].sort();
  const uniqueTrips = [...new Set(loads
    .filter(l => l.trip_number)
    .map(l => l.trip_number))].sort();

  const filtered = loads.filter(l => {
    const q = search.toLowerCase();
    const matchesSearch = !search || [
      l.internal_load_number, l.external_load_number, l.customer_name,
      l.driver_1_name, l.truck_number, l.pickup_city, l.delivery_city
    ].some(v => v && v.toLowerCase().includes(q));
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(l.status);
    const matchesInvoice = invoiceFilter.length === 0 || invoiceFilter.includes(l.invoice_status || 'not_invoiced');
    const matchesDriver = driverFilter.length === 0 ||
      (driverFilter.includes('__unselected__') ? (!l.driver_1_name && !l.driver_2_name) : false) ||
      driverFilter.includes(l.driver_1_name) || driverFilter.includes(l.driver_2_name);
    const matchesTruck = truckFilter.length === 0 ||
      (truckFilter.includes('__unselected__') ? !l.truck_number : false) ||
      truckFilter.includes(l.truck_number);
    const matchesTrip = tripFilter.length === 0 ||
      (tripFilter.includes('__unselected__') ? !l.trip_number : false) ||
      tripFilter.includes(l.trip_number);
    const matchesDateFrom = !dateFrom || (l.pickup_date && l.pickup_date >= dateFrom);
    const matchesDateTo = !dateTo || (l.pickup_date && l.pickup_date <= dateTo);
    return matchesSearch && matchesStatus && matchesInvoice && matchesDriver && matchesTruck && matchesTrip && matchesDateFrom && matchesDateTo;
  });

  // Group by pickup_date
  const groupedByDate = filtered.reduce((acc, l) => {
    const key = l.pickup_date || 'No Pickup Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => {
    if (a === 'No Pickup Date') return 1;
    if (b === 'No Pickup Date') return -1;
    return b.localeCompare(a); // most recent first
  });

  return (
    <div className="p-4">
      <PageHeader
        title="Loads"
        description={`${filtered.length} of ${loads.length}${loads.length >= 1000 ? '+' : ''} loads`}
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => navigate(createPageUrl('LoadDetail?new=1'))}>
            <Plus className="w-3.5 h-3.5" /> New Load
          </Button>
        }
      />

      <div className="flex gap-2 mb-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search loads..." className="w-64" />
        <MultiSelectFilter
          label="Status"
          selected={statusFilter}
          onChange={setStatusFilter}
          width="w-32"
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'saved', label: 'Saved' },
            { value: 'completed', label: 'Completed' },
            { value: 'canceled', label: 'Canceled' },
          ]}
        />
        <MultiSelectFilter
         label="Invoice"
         selected={invoiceFilter}
         onChange={setInvoiceFilter}
         width="w-32"
         options={[
           { value: 'not_invoiced', label: 'Not Invoiced' },
           { value: 'invoiced', label: 'Invoiced' },
           { value: 'priority', label: 'Priority' },
           { value: 'sent', label: 'Sent' },
           { value: 'partial', label: 'Partial' },
           { value: 'paid', label: 'Paid' },
           { value: 'overdue', label: 'Overdue' },
         ]}
        />
        <MultiSelectFilter
          label="Driver"
          selected={driverFilter}
          onChange={setDriverFilter}
          width="w-36"
          options={[
            { value: '__unselected__', label: '(Unassigned)' },
            ...uniqueDrivers.map(d => ({ value: d, label: d })),
          ]}
        />
        <MultiSelectFilter
          label="Truck"
          selected={truckFilter}
          onChange={setTruckFilter}
          width="w-32"
          options={[
            { value: '__unselected__', label: '(Unassigned)' },
            ...uniqueTrucks.map(t => ({ value: t, label: t })),
          ]}
        />
        <MultiSelectFilter
          label="Trip #"
          selected={tripFilter}
          onChange={setTripFilter}
          width="w-32"
          options={[
            { value: '__unselected__', label: '(Unassigned)' },
            ...uniqueTrips.map(t => ({ value: t, label: t })),
          ]}
        />
        <div className="flex items-center gap-1 border border-input rounded-md px-2 h-8 bg-background">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Pickup:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-xs bg-transparent outline-none w-28 text-foreground"
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="text-xs bg-transparent outline-none w-28 text-foreground"
            placeholder="To"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-muted-foreground hover:text-foreground ml-1">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {(search || statusFilter.length > 0 || invoiceFilter.length > 0 || driverFilter.length > 0 || truckFilter.length > 0 || tripFilter.length > 0 || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => {
              setSearch('');
              setStatusFilter([]);
              setInvoiceFilter([]);
              setDriverFilter([]);
              setTruckFilter([]);
              setTripFilter([]);
              setDateFrom('');
              setDateTo('');
            }}
          >
            <X className="w-3.5 h-3.5" /> Clear Filters
          </Button>
        )}
        {loads.some(l => l.status === 'draft') && (
          <Button 
            size="sm" 
            className="h-8 text-xs gap-1" 
            onClick={handleSaveAllDrafts} 
            disabled={savingAllDrafts}
          >
            {savingAllDrafts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save All Drafts
          </Button>
        )}
      </div>

      {selected.size > 0 && (
        <>
          <BulkDeleteBar
            selectedCount={selected.size}
            allCount={filtered.length}
            onSelectAll={() => setSelected(new Set(filtered.map(l => l.id)))}
            onClearSelection={() => { setSelected(new Set()); handleCancelBulkEdit(); }}
            onConfirmDelete={() => {
              const loadsToDelete = filtered.filter(l => selected.has(l.id));
              deleteMutation.mutate(loadsToDelete);
            }}
            isDeleting={deleteMutation.isPending}
            isAllSelected={selected.size === filtered.length}
            onBulkEdit={handleOpenBulkEdit}
            bulkEditMode={bulkEditMode}
          />
          {bulkEditMode && (
            <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs dark:bg-yellow-900/20 dark:border-yellow-700">
              <span className="font-medium text-yellow-800 dark:text-yellow-300">
                Editing <strong>{bulkEditMode}</strong> for {selected.size} load{selected.size !== 1 ? 's' : ''} — make your changes below, then save.
              </span>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancelBulkEdit}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveBulkEdit} disabled={savingBulk}>
                {savingBulk ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save {selected.size} Load{selected.size !== 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </>
      )}

      <div className="space-y-3">
        {sortedDateKeys.map(dateKey => {
          const dateLoads = groupedByDate[dateKey];
          const isExpanded = expandedDates === null || expandedDates.has(dateKey);
          const totalAmount = dateLoads.reduce((sum, l) => sum + (l.invoice_amount || 0), 0);
          const label = dateKey === 'No Pickup Date' ? 'No Pickup Date' : format(parseISO(dateKey), 'EEEE, MMM d, yyyy');

          return (
            <Card key={dateKey}>
              <CardHeader
                className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleDate(dateKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                    <span className="text-xs text-muted-foreground">({dateLoads.length} load{dateLoads.length === 1 ? '' : 's'})</span>
                  </div>
                  <div className="text-xs">
                    Total: <span className="font-semibold">${totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-y">
                        <tr>
                          <th className="text-left p-2 font-medium">
                            <Checkbox
                              checked={dateLoads.every(l => selected.has(l.id))}
                              onCheckedChange={(checked) => {
                                const next = new Set(selected);
                                dateLoads.forEach(l => checked ? next.add(l.id) : next.delete(l.id));
                                setSelected(next);
                              }}
                            />
                          </th>
                          <th className="text-left p-2 font-medium">Load #</th>
                          <th className="text-left p-2 font-medium">Customer</th>
                          <th className="text-left p-2 font-medium">Broker Load #</th>
                          <th className="text-left p-2 font-medium">Route</th>
                          <th className="text-left p-2 font-medium">Pickup → Delivery</th>
                          <th className="text-left p-2 font-medium">Driver(s)</th>
                          <th className="text-left p-2 font-medium">Truck</th>
                          <th className="text-left p-2 font-medium">Amount</th>
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Invoice</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dateLoads.map(l => (
                          <tr
                            key={l.id}
                            className={`border-b hover:bg-muted/30 transition-colors ${bulkEditMode && selected.has(l.id) ? 'bg-primary/5 cursor-default' : 'cursor-pointer'}`}
                            onClick={() => !bulkEditMode && navigate(createPageUrl(`LoadDetail?id=${l.id}`))}
                          >
                            <td className="p-2">
                              <Checkbox
                                checked={selected.has(l.id)}
                                onCheckedChange={(checked) => {
                                  const next = new Set(selected);
                                  checked ? next.add(l.id) : next.delete(l.id);
                                  setSelected(next);
                                }}
                                onClick={e => e.stopPropagation()}
                              />
                            </td>
                            <td className="p-2" onClick={e => e.stopPropagation()}>
                              <span className="font-mono font-semibold text-primary">{l.internal_load_number}</span>
                              {bulkEditMode === 'trip' && selected.has(l.id) ? (
                                <input
                                  type="text"
                                  value={bulkEdits[l.id] ?? ''}
                                  onChange={e => setBulkEdits(prev => ({ ...prev, [l.id]: e.target.value }))}
                                  placeholder="Trip #"
                                  className="mt-1 h-7 w-24 rounded border border-primary bg-background px-2 text-xs text-foreground block"
                                />
                              ) : (
                                l.trip_number && <div className="text-muted-foreground">Trip: {l.trip_number}</div>
                              )}
                            </td>
                            <td className="p-2 font-medium">{l.customer_name || '—'}</td>
                            <td className="p-2" onClick={e => e.stopPropagation()}>
                              {l.external_load_number ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-primary">{l.external_load_number}</span>
                                  <button
                                    onClick={(e) => handleCopyLoadNumber(e, l.external_load_number)}
                                    className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    title="Copy broker load #"
                                  >
                                    {copiedId === l.external_load_number
                                      ? <Check className="w-3 h-3 text-green-600" />
                                      : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="p-2">
                              {l.pickup_city || l.delivery_city
                                ? `${l.pickup_city || ''}${l.pickup_state ? ', ' + l.pickup_state : ''} → ${l.delivery_city || ''}${l.delivery_state ? ', ' + l.delivery_state : ''}`
                                : '—'}
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              {l.pickup_date || l.delivery_date
                                ? <>{l.pickup_date || '—'}<span className="text-muted-foreground mx-1">→</span>{l.delivery_date || '—'}</>
                                : '—'}
                            </td>
                            <td className="p-2" onClick={e => e.stopPropagation()}>
                              {bulkEditMode === 'driver' && selected.has(l.id) ? (
                                <select
                                  value={bulkEdits[l.id] ?? ''}
                                  onChange={e => setBulkEdits(prev => ({ ...prev, [l.id]: e.target.value }))}
                                  className="h-7 rounded border border-primary bg-background px-1 text-xs text-foreground w-32"
                                >
                                  <option value="">— Unassigned —</option>
                                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                </select>
                              ) : (
                                <>
                                  {l.driver_1_name || '—'}
                                  {l.driver_2_name && <div>{l.driver_2_name}</div>}
                                </>
                              )}
                            </td>
                            <td className="p-2 font-mono" onClick={e => e.stopPropagation()}>
                              {bulkEditMode === 'truck' && selected.has(l.id) ? (
                                <select
                                  value={bulkEdits[l.id] ?? ''}
                                  onChange={e => setBulkEdits(prev => ({ ...prev, [l.id]: e.target.value }))}
                                  className="h-7 rounded border border-primary bg-background px-1 text-xs text-foreground w-24"
                                >
                                  <option value="">— Unassigned —</option>
                                  {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
                                </select>
                              ) : (
                                l.truck_number || '—'
                              )}
                            </td>
                            <td className="p-2" onClick={e => e.stopPropagation()}>
                              {bulkEditMode === 'amount' && selected.has(l.id) ? (
                                <input
                                  type="number"
                                  value={bulkEdits[l.id] ?? ''}
                                  onChange={e => setBulkEdits(prev => ({ ...prev, [l.id]: e.target.value }))}
                                  className="h-7 w-24 rounded border border-primary bg-background px-2 text-xs text-foreground"
                                />
                              ) : (
                                l.invoice_amount ? `$${l.invoice_amount.toLocaleString()}` : '—'
                              )}
                            </td>
                            <td className="p-2"><StatusBadge status={l.status} /></td>
                            <td className="p-2" onClick={e => e.stopPropagation()}>
                               <InvoiceStatusSelect load={l} queryClient={queryClient} />
                             </td>
                            <td className="p-2" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={(e) => handlePrintLoad(e, l)} title="Download PDF">
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Load?</AlertDialogTitle>
                                    <AlertDialogDescription>Load #{l.internal_load_number} will be moved to Deleted Items.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(l)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                    </AlertDialog>
                                    </div>
                                    </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        {sortedDateKeys.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground text-sm">No loads found.</div>
        )}
      </div>
    </div>
  );
}