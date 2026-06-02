import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useHasSubscription } from '../components/shared/SubscriptionGate';
import { usePreviewGate, PreviewFeatureDialog } from '../components/shared/PreviewFeatureGate';
import { useSession } from '../components/shared/AppSession';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, X, ChevronDown, ChevronRight, Loader2, Save, Check, Copy, Download } from 'lucide-react';
import SearchInput from '../components/shared/SearchInput';
import { printLoad } from '../components/print/printLoad';
import UndoToast from '../components/shared/UndoToast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import BulkDeleteBar from '../components/shared/BulkDeleteBar';
import MultiSelectFilter from '../components/shared/MultiSelectFilter';
import { parseISO } from 'date-fns';
import { formatInUserTimezone, getUserTimezone } from '@/utils/formatTimezone';
import { useEntitySubscription } from '../hooks/useEntitySubscription';
import QuickActionSettings from '../components/shared/QuickActionSettings';
import { chunkAsync } from '../utils/chunkAsync';
import MobileLoadCard from '../components/mobile/MobileLoadCard';
import MobileLoadsHeader from '../components/mobile/MobileLoadsHeader';
import MobilePullRefresh from '../components/mobile/MobilePullRefresh';
import { MobileSkeletonList, MobileErrorState } from '../components/mobile/MobileSkeleton';
import MobileSelect from '@/components/ui/MobileSelect';

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
  const [optimisticStatus, setOptimisticStatus] = useState(null);
  const current = optimisticStatus ?? (load.invoice_status || 'not_invoiced');

  const handleChange = async (value) => {
    setOptimisticStatus(value);
    setSaving(true);
    try {
      await base44.entities.Load.update(load.id, { invoice_status: value });

      if (value === 'not_invoiced') {
        const existing = await base44.entities.Invoice.filter({ load_id: load.id }, '-created_date', 5);
        for (const inv of existing) await base44.entities.Invoice.delete(inv.id);
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      } else {
        const existing = await base44.entities.Invoice.filter({ load_id: load.id }, '-created_date', 1);
        if (existing.length === 0) {
          const allInvoices = load.tenant_id
            ? await base44.entities.Invoice.filter({ tenant_id: load.tenant_id }, '-created_date', 1)
            : await base44.entities.Invoice.list('-created_date', 1);
          const lastNum = allInvoices.length > 0
            ? parseInt(allInvoices[0].invoice_number?.replace(/\D/g, '') || '999')
            : 999;
          const today = new Date().toISOString().split('T')[0];
          await base44.entities.Invoice.create({
            tenant_id: load.tenant_id,
            invoice_number: `INV-${lastNum + 1}`,
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
          const invStatus = value === 'paid' ? 'paid' : value === 'sent' ? 'sent' : value === 'priority' ? 'priority' : value === 'partial' ? 'partial' : value === 'overdue' ? 'overdue' : 'draft';
          await base44.entities.Invoice.update(existing[0].id, { status: invStatus });
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['loads'] });
      setOptimisticStatus(null);
      toast.success('Invoice status updated');
    } catch (err) {
      setOptimisticStatus(null);
      toast.error('Failed to update status: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const options = Object.entries(INVOICE_STATUS_LABELS).map(([val, label]) => ({ value: val, label }));

  return (
    <MobileSelect
      value={current}
      onValueChange={handleChange}
      disabled={saving}
      options={options}
      triggerClassName={`h-6 text-[11px] px-2 border rounded-md font-medium w-32 ${INVOICE_STATUS_STYLES[current] || ''}`}
    />
  );
}

export default function Loads() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { showDialog, checkFeatureAccess, handleSubscribe, handleDismiss } = usePreviewGate();
  const isInPreview = session?.subscription_status !== 'active' && session?.subscription_status !== 'trialing';
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
  const [dateFilterType, setDateFilterType] = useState(() => localStorage.getItem('loads_date_filter_type') || 'pickup');
  const [selected, setSelected] = useState(() => {
    try { const s = sessionStorage.getItem('loads_selected'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [bulkEditMode, setBulkEditMode] = useState(null);
  const [bulkEdits, setBulkEdits] = useState({});
  const [savingBulk, setSavingBulk] = useState(false);
  const [expandedDates, setExpandedDates] = useState(() => {
    const saved = localStorage.getItem('loads_expanded_dates');
    return saved ? new Set(JSON.parse(saved)) : null;
  });

  const toggleDate = (dateKey, currentSortedKeys) => {
    setExpandedDates(prev => {
      const allKeys = currentSortedKeys || [];
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
  useEffect(() => { localStorage.setItem('loads_date_filter_type', dateFilterType); }, [dateFilterType]);
  useEffect(() => { sessionStorage.setItem('loads_selected', JSON.stringify([...selected])); }, [selected]);

  const { data: loads = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['loads', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Load.filter({ tenant_id: session.tenant_id }, '-created_date', 1000) : Promise.resolve([]),
    refetchInterval: 60000,
  });

  const showLoading = isLoading && loads.length === 0;

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Driver.filter({ tenant_id: session.tenant_id, status: 'active' }, 'full_name', 200) : Promise.resolve([]),
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.Truck.filter({ tenant_id: session.tenant_id, status: 'active' }, 'unit_number', 200) : Promise.resolve([]),
  });

  const { data: company = {} } = useQuery({
    queryKey: ['company-settings', session?.tenant_id],
    queryFn: async () => { const r = session?.tenant_id ? await base44.entities.Company.filter({ tenant_id: session.tenant_id, company_type: 'carrier' }, '-created_date', 1) : []; return r[0] || {}; },
  });

  useEntitySubscription('Load', ['loads', session?.tenant_id], !!session?.tenant_id);

  const handlePrintLoad = async (e, load) => {
    e.stopPropagation();
    const stops = await base44.entities.LoadStop.filter({ load_id: load.id }, 'stop_order', 50);
    printLoad({ company, load, stops, drivers, trucks, trailers: [] });
  };

  const [savingAllDrafts, setSavingAllDrafts] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [undoToast, setUndoToast] = useState(null);
  const [qaEnabled, setQaEnabled] = useState(() => localStorage.getItem('loads_qa_enabled') === 'true');
  const [qaAction, setQaAction] = useState(() => localStorage.getItem('loads_qa_action') || 'paid');
  const [poppedLoad, setPoppedLoad] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleQaToggle = (v) => { setQaEnabled(v); localStorage.setItem('loads_qa_enabled', v); };
  const handleQaAction = (v) => { setQaAction(v); localStorage.setItem('loads_qa_action', v); };

  const loadsQaOptions = [
    { value: 'not_invoiced', label: 'Not Invoiced' },
    { value: 'invoiced', label: 'Invoiced' },
    { value: 'priority', label: 'Priority' },
    { value: 'sent', label: 'Sent' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'canceled', label: 'Canceled' },
  ];

  const handleQuickAction = async (load) => {
    queryClient.setQueriesData({ queryKey: ['loads'] }, (old) => {
      if (!Array.isArray(old)) return old;
      return old.map(l => l.id === load.id ? { ...l, invoice_status: qaAction } : l);
    });
    try {
      await base44.entities.Load.update(load.id, { invoice_status: qaAction });
      if (qaAction === 'not_invoiced') {
        const existing = await base44.entities.Invoice.filter({ load_id: load.id }, '-created_date', 5);
        for (const inv of existing) await base44.entities.Invoice.delete(inv.id);
      } else {
        const existing = await base44.entities.Invoice.filter({ load_id: load.id }, '-created_date', 1);
        if (existing.length > 0) {
          const invStatus = qaAction === 'paid' ? 'paid' : qaAction === 'sent' ? 'sent' : qaAction === 'priority' ? 'priority' : qaAction === 'partial' ? 'partial' : qaAction === 'overdue' ? 'overdue' : qaAction === 'canceled' ? 'canceled' : 'draft';
          await base44.entities.Invoice.update(existing[0].id, { status: invStatus });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const label = loadsQaOptions.find(o => o.value === qaAction)?.label || qaAction;
      toast.success(`Invoice status set to ${label}`);
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  };

  const showUndoToast = (message, onUndo) => {
    setUndoToast({ message, onUndo });
  };

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
          tenant_id: session?.tenant_id,
          entity_type: 'Load',
          entity_id: load.id,
          entity_label: `Load #${load.internal_load_number} — ${load.customer_name || ''}`,
          deleted_date: new Date().toISOString().split('T')[0],
          original_data: JSON.stringify(load),
        });
        await base44.entities.Load.delete(load.id);
      }
      return loadsArray;
    },
    onSuccess: (loadsArray) => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      const count = loadsArray.length;
      setSelected(new Set());
      showUndoToast(
        `${count} load${count === 1 ? '' : 's'} deleted`,
        async () => {
          for (const load of loadsArray) {
            const { id, created_date, updated_date, ...rest } = load;
            await base44.entities.Load.create(rest);
          }
          queryClient.invalidateQueries({ queryKey: ['loads'] });
        }
      );
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
      showUndoToast(
        `${drafts.length} draft${drafts.length === 1 ? '' : 's'} saved`,
        async () => {
          for (const draft of drafts) {
            await base44.entities.Load.update(draft.id, { status: 'draft' });
          }
          queryClient.invalidateQueries({ queryKey: ['loads'] });
        }
      );
    } finally {
      setSavingAllDrafts(false);
    }
  };

  const handleOpenBulkEdit = (field) => {
    setBulkEditMode(field);
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
    try {
      await chunkAsync(idsToUpdate, (id) => {
        const val = bulkEdits[id];
        if (bulkEditMode === 'amount') {
          const num = parseFloat(val);
          if (isNaN(num) || num < 0) return Promise.resolve();
          return base44.entities.Load.update(id, { invoice_amount: num });
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
      });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      const prevValues = { ...bulkEdits };
      const prevMode = bulkEditMode;
      showUndoToast(
        `Updated ${idsToUpdate.length} load${idsToUpdate.length === 1 ? '' : 's'} (${bulkEditMode})`,
        async () => {
          await chunkAsync(idsToUpdate, (id) => {
            const original = loads.find(l => l.id === id);
            if (!original) return null;
            if (prevMode === 'amount') return base44.entities.Load.update(id, { invoice_amount: original.invoice_amount });
            if (prevMode === 'driver') return base44.entities.Load.update(id, { driver_1_id: original.driver_1_id || null, driver_1_name: original.driver_1_name || '' });
            if (prevMode === 'truck') return base44.entities.Load.update(id, { truck_id: original.truck_id || null, truck_number: original.truck_number || '' });
            if (prevMode === 'trip') return base44.entities.Load.update(id, { trip_number: original.trip_number || null });
          });
          queryClient.invalidateQueries({ queryKey: ['loads'] });
        }
      );
      setBulkEditMode(null);
      setBulkEdits({});
      setSelected(new Set());
    } catch (err) {
      toast.error('Bulk save failed: ' + err.message);
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    } finally {
      setSavingBulk(false);
    }
  };

  const uniqueDrivers = drivers.map(d => d.full_name).sort();
  const uniqueTrucks = trucks.map(t => t.unit_number).sort();
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
    const dateField = dateFilterType === 'delivery' ? l.delivery_date : l.pickup_date;
    const matchesDateFrom = !dateFrom || (dateField && dateField >= dateFrom);
    const matchesDateTo = !dateTo || (dateField && dateField <= dateTo);
    return matchesSearch && matchesStatus && matchesInvoice && matchesDriver && matchesTruck && matchesTrip && matchesDateFrom && matchesDateTo;
  });

  const groupedByDate = filtered.reduce((acc, l) => {
    const dateField = dateFilterType === 'delivery' ? l.delivery_date : l.pickup_date;
    const key = dateField || `No ${dateFilterType === 'delivery' ? 'Delivery' : 'Pickup'} Date`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => {
    if (a === 'No Pickup Date') return 1;
    if (b === 'No Pickup Date') return -1;
    return b.localeCompare(a);
  });

  const hasActiveFilters = search || statusFilter.length > 0 || invoiceFilter.length > 0 || driverFilter.length > 0 || truckFilter.length > 0 || tripFilter.length > 0 || dateFrom || dateTo || dateFilterType !== 'pickup';

  useEffect(() => {
    if (expandedDates === null || sortedDateKeys.length === 0) return;
    const missing = sortedDateKeys.filter(k => !expandedDates.has(k));
    if (missing.length === 0) return;
    setExpandedDates(prev => {
      if (prev === null) return prev;
      const next = new Set(prev);
      missing.forEach(k => next.add(k));
      localStorage.setItem('loads_expanded_dates', JSON.stringify([...next]));
      return next;
    });
  }, [sortedDateKeys.join(',')]);

  return (
    <MobilePullRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['loads'] })}>
    <div className="p-4" style={{ overflowX: 'hidden', boxSizing: 'border-box', width: '100%' }}>
      <PreviewFeatureDialog open={showDialog} onSubscribe={handleSubscribe} onDismiss={handleDismiss} />
      
      {/* Mobile Header */}
      <div className="md:hidden">
        <MobileLoadsHeader
          filteredCount={filtered.length}
          totalCount={loads.length}
          onNewLoad={() => navigate(createPageUrl('LoadDetail?new=1'))}
          search={search}
          onSearchChange={setSearch}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setSearch('');
            setStatusFilter([]);
            setInvoiceFilter([]);
            setDriverFilter([]);
            setTruckFilter([]);
            setTripFilter([]);
            setDateFrom('');
            setDateTo('');
            setDateFilterType('pickup');
          }}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />
        
        {showFilters && (
          <div className="mobile-filters-expanded space-y-2 mt-3">
            <div className="pickup-date-row flex items-center gap-2">
              <Select value={dateFilterType || 'pickup'} onValueChange={setDateFilterType}>
                <SelectTrigger className="h-10 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup Date</SelectItem>
                  <SelectItem value="delivery">Delivery Date</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 border border-input rounded-md px-3 h-10 flex-1 bg-background">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="text-xs bg-transparent outline-none w-24 text-foreground"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="text-xs bg-transparent outline-none w-24 text-foreground"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <MultiSelectFilter
                label="Status"
                selected={statusFilter}
                onChange={setStatusFilter}
                width="w-28 flex-shrink-0"
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
                width="w-28 flex-shrink-0"
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
            </div>
            
            <div className="quick-actions-row flex-wrap gap-2">
              <QuickActionSettings
                enabled={qaEnabled}
                onToggle={handleQaToggle}
                action={qaAction}
                onActionChange={handleQaAction}
                options={loadsQaOptions}
              />
              {loads.some(l => l.status === 'draft') && (
                <Button
                  size="sm"
                  className="flex-1 min-w-[140px] h-9 text-xs gap-1"
                  onClick={handleSaveAllDrafts}
                  disabled={savingAllDrafts}
                >
                  {savingAllDrafts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save All Drafts
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Header - Single compact toolbar row */}
      <div className="hidden md:block mb-3">
        <div className="flex items-center gap-2 h-9">
          <div className="flex items-center gap-2 min-w-fit">
            <h1 className="text-sm font-semibold">Loads</h1>
            <span className="text-xs text-muted-foreground">({filtered.length} of {loads.length}{loads.length >= 1000 ? '+' : ''})</span>
          </div>
          
          <SearchInput value={search} onChange={setSearch} placeholder="Search..." className="w-40 h-8" />
          
          <MultiSelectFilter
            label="Status"
            selected={statusFilter}
            onChange={setStatusFilter}
            width="w-28"
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
            width="w-28"
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
            width="w-28"
            options={[
              { value: '__unselected__', label: '(Unassigned)' },
              ...uniqueDrivers.map(d => ({ value: d, label: d })),
            ]}
          />
          <MultiSelectFilter
            label="Truck"
            selected={truckFilter}
            onChange={setTruckFilter}
            width="w-24"
            options={[
              { value: '__unselected__', label: '(Unassigned)' },
              ...uniqueTrucks.map(t => ({ value: t, label: t })),
            ]}
          />
          <MultiSelectFilter
            label="Trip #"
            selected={tripFilter}
            onChange={setTripFilter}
            width="w-24"
            options={[
              { value: '__unselected__', label: '(Unassigned)' },
              ...uniqueTrips.map(t => ({ value: t, label: t })),
            ]}
          />
          
          <div className="flex items-center gap-2 border border-input rounded-md px-3 h-8">
            <Select value={dateFilterType || 'pickup'} onValueChange={setDateFilterType}>
              <SelectTrigger className="h-full text-xs border-none bg-transparent w-20 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-xs bg-transparent outline-none w-24 text-foreground"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="text-xs bg-transparent outline-none w-24 text-foreground"
            />
          </div>
          
          <QuickActionSettings
            enabled={qaEnabled}
            onToggle={handleQaToggle}
            action={qaAction}
            onActionChange={handleQaAction}
            options={loadsQaOptions}
          />
          
          <div className="flex-1" />
          
          {loads.some(l => l.status === 'draft') && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1 px-3"
              onClick={handleSaveAllDrafts}
              disabled={savingAllDrafts}
              variant="outline"
            >
              {savingAllDrafts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Drafts
            </Button>
          )}
          <Button size="sm" className="h-8 text-xs gap-1 px-3" onClick={() => navigate(createPageUrl('LoadDetail?new=1'))}>
            <Plus className="w-3.5 h-3.5" /> New Load
          </Button>
        </div>
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

      {/* ── MOBILE ONLY ── */}
      <div className="md:hidden space-y-3">
        {showLoading && <MobileSkeletonList count={6} />}
        {isError && !showLoading && (
          <MobileErrorState onRetry={refetch} message="Failed to load loads. Tap to retry." />
        )}
        {!showLoading && !isError && sortedDateKeys.map(dateKey => {
          const dateLoads = groupedByDate[dateKey];
          const isExpanded = expandedDates === null || expandedDates.has(dateKey);
          const totalAmount = dateLoads.reduce((sum, l) => sum + (l.invoice_amount || 0), 0);
          const noDateLabel = dateFilterType === 'delivery' ? 'No Delivery Date' : 'No Pickup Date';
          const label = dateKey === noDateLabel ? noDateLabel : formatInUserTimezone(dateKey, 'date', getUserTimezone());
          return (
            <div key={dateKey}>
              <div
                className="flex items-center justify-between"
                style={{ borderLeft: '3px solid hsl(var(--primary))', background: 'hsl(var(--secondary))', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer', marginBottom: '4px' }}
                onClick={() => toggleDate(dateKey, sortedDateKeys)}
              >
                <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {label}&nbsp;&nbsp;{dateLoads.length} load{dateLoads.length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: '11px', color: 'hsl(var(--primary))', fontWeight: 500 }}>
                  Total: ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {isExpanded && (
                <div className="space-y-2" style={{ marginBottom: '8px' }}>
                  {dateLoads.map(l => (
                    <MobileLoadCard
                      key={l.id}
                      load={l}
                      copiedId={copiedId}
                      onCopy={handleCopyLoadNumber}
                      onNavigate={() => navigate(createPageUrl(`LoadDetail?id=${l.id}`))}
                      onDelete={(e) => { e.stopPropagation(); deleteMutation.mutate(l); }}
                      onPrint={(e) => handlePrintLoad(e, l)}
                      qaEnabled={qaEnabled}
                      qaAction={qaAction}
                      onQuickAction={handleQuickAction}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!showLoading && !isError && sortedDateKeys.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No loads found.</div>
        )}
      </div>

      {/* ── DESKTOP ONLY — per-group tables ── */}
      <div className="hidden md:block">
        {sortedDateKeys.length === 0 && !isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No loads found.</div>
        ) : (
          <div className="space-y-3">
            {sortedDateKeys.map((dateKey, dateIndex) => {
              const dateLoads = groupedByDate[dateKey];
              const isExpanded = expandedDates === null || expandedDates.has(dateKey);
              const totalAmount = dateLoads.reduce((sum, l) => sum + (l.invoice_amount || 0), 0);
              const noDateLabel = dateFilterType === 'delivery' ? 'No Delivery Date' : 'No Pickup Date';
              const label = dateKey === noDateLabel ? noDateLabel : formatInUserTimezone(dateKey, 'date', getUserTimezone());
              return (
                <div key={dateKey} className="overflow-x-auto rounded-lg border border-border">
                  <table style={{ tableLayout: 'fixed', minWidth: '1160px', width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <colgroup>
                      <col style={{ width: '36px' }} />
                      <col style={{ width: '88px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '108px' }} />
                      <col style={{ width: '170px' }} />
                      <col style={{ width: '128px' }} />
                      <col style={{ width: '108px' }} />
                      <col style={{ width: '62px' }} />
                      <col style={{ width: '82px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '140px' }} />
                      <col style={{ width: '68px' }} />
                    </colgroup>
                    <thead>
                      {/* Date group header */}
                      <tr
                        className="bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleDate(dateKey, sortedDateKeys)}
                      >
                        <td colSpan={12} style={{ padding: '10px 12px' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                              <span className="text-xs font-semibold">{label}</span>
                              <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full text-xs text-muted-foreground border border-border/30">
                                {dateLoads.length} load{dateLoads.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total: <span className="font-semibold text-foreground">${totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {/* Column headers */}
                      {isExpanded && (
                        <tr className="bg-muted/50 border-b border-border text-xs">
                          <th className="text-left px-2 py-1.5 font-medium">
                            <Checkbox
                              checked={dateLoads.length > 0 && dateLoads.every(l => selected.has(l.id))}
                              onCheckedChange={(checked) => {
                                const next = new Set(selected);
                                dateLoads.forEach(l => checked ? next.add(l.id) : next.delete(l.id));
                                setSelected(next);
                              }}
                            />
                          </th>
                          <th className="text-left px-2 py-1.5 font-medium">Load #</th>
                          <th className="text-left px-2 py-1.5 font-medium">Customer</th>
                          <th className="text-left px-2 py-1.5 font-medium">Broker Load #</th>
                          <th className="text-left px-2 py-1.5 font-medium">Route</th>
                          <th className="text-left px-2 py-1.5 font-medium">Pickup → Delivery</th>
                          <th className="text-left px-2 py-1.5 font-medium">Driver(s)</th>
                          <th className="text-left px-2 py-1.5 font-medium">Truck</th>
                          <th className="text-left px-2 py-1.5 font-medium">Amount</th>
                          <th className="text-left px-2 py-1.5 font-medium">Status</th>
                          <th className="text-left px-2 py-1.5 font-medium">Invoice</th>
                          <th className="px-2 py-1.5"></th>
                        </tr>
                      )}
                    </thead>
                    {isExpanded && (
                      <tbody>
                        {dateLoads.map(l => (
                          <tr
                            key={l.id}
                            className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${
                              bulkEditMode && selected.has(l.id) ? 'bg-primary/5 cursor-default' : 'cursor-pointer'
                            } h-8`}
                            onClick={() => !bulkEditMode && navigate(createPageUrl(`LoadDetail?id=${l.id}`))}
                          >
                            <td className="px-2 py-1" style={{ overflow: 'hidden' }}>
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
                            <td className="px-2 py-1" style={{ overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                              <span className="font-mono font-semibold text-primary" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.internal_load_number}</span>
                              {bulkEditMode === 'trip' && selected.has(l.id) ? (
                                <input
                                  type="text"
                                  value={bulkEdits[l.id] ?? ''}
                                  onChange={e => setBulkEdits(prev => ({ ...prev, [l.id]: e.target.value }))}
                                  placeholder="Trip #"
                                  className="mt-1 h-6 w-full rounded border border-primary bg-background px-1.5 text-xs text-foreground block"
                                />
                              ) : (
                                l.trip_number && <div className="text-muted-foreground text-[11px]" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Trip: {l.trip_number}</div>
                              )}
                            </td>
                            <td className="px-2 py-1 font-medium" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.customer_name || '—'}</td>
                            <td className="px-2 py-1" style={{ overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1" style={{ overflow: 'hidden' }}>
                                {l.external_load_number ? (
                                  <>
                                    <span className="font-mono text-primary text-xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{l.external_load_number}</span>
                                    <button
                                      onClick={(e) => handleCopyLoadNumber(e, l.external_load_number)}
                                      className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                                      title="Copy broker load #"
                                    >
                                      {copiedId === l.external_load_number
                                        ? <Check className="w-2.5 h-2.5 text-green-600" />
                                        : <Copy className="w-2.5 h-2.5" />}
                                    </button>
                                    {qaEnabled && (
                                      <button
                                        onClick={() => handleQuickAction(l)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors whitespace-nowrap flex-shrink-0 ${INVOICE_STATUS_STYLES[qaAction] || 'bg-primary/10 text-primary border-primary/20'}`}
                                      >
                                        {loadsQaOptions.find(o => o.value === qaAction)?.label || qaAction}
                                      </button>
                                    )}
                                  </>
                                ) : <span className="text-muted-foreground">—</span>}
                              </div>
                            </td>
                            <td className="px-2 py-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {l.pickup_city || l.delivery_city
                                ? `${l.pickup_city || ''}${l.pickup_state ? ', ' + l.pickup_state : ''} → ${l.delivery_city || ''}${l.delivery_state ? ', ' + l.delivery_state : ''}`
                                : '—'}
                            </td>
                            <td className="px-2 py-1" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {l.pickup_date || l.delivery_date
                                ? <>{l.pickup_date || '—'}<span className="text-muted-foreground mx-0.5 text-[11px]">→</span>{l.delivery_date || '—'}</>
                                : '—'}
                            </td>
                            <td className="px-2 py-1" style={{ overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                              {bulkEditMode === 'driver' && selected.has(l.id) ? (
                                <select
                                  value={bulkEdits[l.id] ?? ''}
                                  onChange={e => setBulkEdits(prev => ({ ...prev, [l.id]: e.target.value }))}
                                  className="h-6 rounded border border-primary bg-background px-1 text-xs text-foreground w-full"
                                >
                                  <option value="">— Unassigned —</option>
                                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                </select>
                              ) : (
                                <>
                                  <div className="text-xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.driver_1_name || '—'}</div>
                                  {l.driver_2_name && <div className="text-muted-foreground text-[11px]" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.driver_2_name}</div>}
                                </>
                              )}
                            </td>
                            <td className="px-2 py-1 font-mono" style={{ overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                              {bulkEditMode === 'truck' && selected.has(l.id) ? (
                                <select
                                  value={bulkEdits[l.id] ?? ''}
                                  onChange={e => setBulkEdits(prev => ({ ...prev, [l.id]: e.target.value }))}
                                  className="h-6 rounded border border-primary bg-background px-1 text-xs text-foreground w-full"
                                >
                                  <option value="">— Unassigned —</option>
                                  {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
                                </select>
                              ) : (
                                <span className="text-xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{l.truck_number || '—'}</span>
                              )}
                            </td>
                            <td className="px-2 py-1" style={{ overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                              {bulkEditMode === 'amount' && selected.has(l.id) ? (
                                <input
                                  type="number"
                                  value={bulkEdits[l.id] ?? ''}
                                  onChange={e => setBulkEdits(prev => ({ ...prev, [l.id]: e.target.value }))}
                                  className="h-6 w-full rounded border border-primary bg-background px-1.5 text-xs text-foreground"
                                />
                              ) : (
                                <span className="text-xs">{l.invoice_amount ? `$${l.invoice_amount.toLocaleString()}` : '—'}</span>
                              )}
                            </td>
                            <td className="px-2 py-1" style={{ overflow: 'hidden' }}><StatusBadge status={l.status} /></td>
                            <td className="px-2 py-1" style={{ overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                              <InvoiceStatusSelect load={l} queryClient={queryClient} />
                            </td>
                            <td className="px-2 py-1" style={{ overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-0.5">
                                <button
                                  onClick={(e) => handlePrintLoad(e, l)}
                                  className="p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors"
                                  title="Download invoice"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      onClick={e => e.stopPropagation()}
                                      className="p-1 rounded text-muted-foreground/40 hover:text-red-500 transition-colors"
                                      title="Delete load"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Load?</AlertDialogTitle>
                                      <AlertDialogDescription>This will delete Load #{l.internal_load_number}. This can be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteMutation.mutate(l)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    )}
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {undoToast && (
        <UndoToast
          message={undoToast.message}
          onUndo={undoToast.onUndo}
          onClose={() => setUndoToast(null)}
        />
      )}
    </div>
    </MobilePullRefresh>
  );
}