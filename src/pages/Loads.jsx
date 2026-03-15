import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import BulkDeleteBar from '../components/shared/BulkDeleteBar';

export default function Loads() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('search') || localStorage.getItem('loads_search') || '';
  });
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('loads_status') || 'all');
  const [invoiceFilter, setInvoiceFilter] = useState(() => localStorage.getItem('loads_invoice') || 'all');
  const [driverFilter, setDriverFilter] = useState(() => localStorage.getItem('loads_driver') || 'all');
  const [truckFilter, setTruckFilter] = useState(() => localStorage.getItem('loads_truck') || 'all');
  const [tripFilter, setTripFilter] = useState(() => localStorage.getItem('loads_trip') || 'all');
  const [selected, setSelected] = useState(new Set());
  const [sortField, setSortField] = useState(() => localStorage.getItem('loads_sort_field') || 'delivery_date');
  const [sortDir, setSortDir] = useState(() => localStorage.getItem('loads_sort_dir') || 'desc');

  const handleSort = (field) => {
    if (sortField === field) {
      const newDir = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(newDir);
      localStorage.setItem('loads_sort_dir', newDir);
    } else {
      setSortField(field);
      setSortDir('desc');
      localStorage.setItem('loads_sort_field', field);
      localStorage.setItem('loads_sort_dir', 'desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 text-muted-foreground" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-primary" /> : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  useEffect(() => {
    localStorage.setItem('loads_search', search);
  }, [search]);

  useEffect(() => {
    localStorage.setItem('loads_status', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('loads_invoice', invoiceFilter);
  }, [invoiceFilter]);

  useEffect(() => {
    localStorage.setItem('loads_driver', driverFilter);
  }, [driverFilter]);

  useEffect(() => {
    localStorage.setItem('loads_truck', truckFilter);
  }, [truckFilter]);

  useEffect(() => {
    localStorage.setItem('loads_trip', tripFilter);
  }, [tripFilter]);

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: () => base44.entities.Load.list('-created_date', 1000),
  });

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
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchesInvoice = invoiceFilter === 'all' || l.invoice_status === invoiceFilter;
    const matchesDriver = driverFilter === 'all' || 
      (driverFilter === 'unselected' ? (!l.driver_1_name && !l.driver_2_name) : (l.driver_1_name === driverFilter || l.driver_2_name === driverFilter));
    const matchesTruck = truckFilter === 'all' || 
      (truckFilter === 'unselected' ? !l.truck_number : l.truck_number === truckFilter);
    const matchesTrip = tripFilter === 'all' || 
      (tripFilter === 'unselected' ? !l.trip_number : l.trip_number === tripFilter);
    return matchesSearch && matchesStatus && matchesInvoice && matchesDriver && matchesTruck && matchesTrip;
  });

  const columns = [
    {
      header: (
        <Checkbox
          checked={selected.size > 0 && selected.size === filtered.length}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelected(new Set(filtered.map(l => l.id)));
            } else {
              setSelected(new Set());
            }
          }}
        />
      ),
      render: (r) => (
        <Checkbox
          checked={selected.has(r.id)}
          onCheckedChange={(checked) => {
            const newSelected = new Set(selected);
            if (checked) {
              newSelected.add(r.id);
            } else {
              newSelected.delete(r.id);
            }
            setSelected(newSelected);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
    { header: 'Load #', render: (r) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-mono font-semibold text-primary text-sm">{r.internal_load_number}</span>
        {r.trip_number && <span className="text-xs text-muted-foreground">Trip: {r.trip_number}</span>}
      </div>
    )},
    { header: 'Customer', render: (r) => <span className="font-medium text-sm">{r.customer_name || '—'}</span> },
    { header: 'Route', render: (r) => {
      const pickup = r.pickup_city ? `${r.pickup_city}${r.pickup_state ? ', ' + r.pickup_state : ''}` : null;
      const delivery = r.delivery_city ? `${r.delivery_city}${r.delivery_state ? ', ' + r.delivery_state : ''}` : null;
      if (pickup && delivery) return <span className="text-xs">{pickup} → {delivery}</span>;
      if (pickup) return <span className="text-xs">{pickup}</span>;
      if (delivery) return <span className="text-xs">{delivery}</span>;
      return '—';
    }},
    { header: 'Pickup', render: (r) => r.pickup_date || '—' },
    { header: 'Delivery', render: (r) => r.delivery_date || '—' },
    { header: 'Drivers', render: (r) => (
      <div className="flex flex-col gap-1">
        {r.driver_1_name && <span className="text-sm">{r.driver_1_name}</span>}
        {r.driver_2_name && <span className="text-sm">{r.driver_2_name}</span>}
        {!r.driver_1_name && !r.driver_2_name && <span>—</span>}
      </div>
    )},
    { header: 'Truck', render: (r) => r.truck_number ? <span className="font-mono text-sm">{r.truck_number}</span> : '—' },
    { header: 'Amount', render: (r) => r.invoice_amount ? `$${r.invoice_amount.toLocaleString()}` : '—' },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { header: 'Invoice', render: (r) => <StatusBadge status={r.invoice_status} /> },
    {
      header: '', render: (r) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => e.stopPropagation()}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Load?</AlertDialogTitle>
              <AlertDialogDescription>Load #{r.internal_load_number} will be moved to Deleted Items and kept for 30 days.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(r)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
    },
  ];

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
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search loads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs w-64"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
          <SelectTrigger className="h-8 text-xs w-40">
            <SelectValue placeholder="Invoice Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invoice Statuses</SelectItem>
            <SelectItem value="not_invoiced">Not Invoiced</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={driverFilter} onValueChange={setDriverFilter}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="Driver" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drivers</SelectItem>
            <SelectItem value="unselected">Unselected</SelectItem>
            {uniqueDrivers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={truckFilter} onValueChange={setTruckFilter}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue placeholder="Truck" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trucks</SelectItem>
            <SelectItem value="unselected">Unselected</SelectItem>
            {uniqueTrucks.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tripFilter} onValueChange={setTripFilter}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue placeholder="Trip #" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trips</SelectItem>
            <SelectItem value="unselected">Unselected</SelectItem>
            {uniqueTrips.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || statusFilter !== 'all' || invoiceFilter !== 'all' || driverFilter !== 'all' || truckFilter !== 'all' || tripFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs gap-1" 
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setInvoiceFilter('all');
              setDriverFilter('all');
              setTruckFilter('all');
              setTripFilter('all');
            }}
          >
            <X className="w-3.5 h-3.5" /> Clear Filters
          </Button>
        )}
      </div>

      {selected.size > 0 && (
        <BulkDeleteBar
          selectedCount={selected.size}
          allCount={filtered.length}
          onSelectAll={() => setSelected(new Set(filtered.map(l => l.id)))}
          onClearSelection={() => setSelected(new Set())}
          onConfirmDelete={() => {
            const loadsToDelete = filtered.filter(l => selected.has(l.id));
            deleteMutation.mutate(loadsToDelete);
          }}
          isDeleting={deleteMutation.isPending}
          isAllSelected={selected.size === filtered.length}
        />
      )}

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        onRowClick={(row) => navigate(createPageUrl(`LoadDetail?id=${row.id}`))}
        emptyMessage="No loads found. Upload a rate confirmation or create a new load."
      />
    </div>
  );
}