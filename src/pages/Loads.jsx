import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import BulkDeleteBar from '../components/shared/BulkDeleteBar';
import { format, parseISO } from 'date-fns';

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
  const [expandedDates, setExpandedDates] = useState(() => {
    const saved = localStorage.getItem('loads_expanded_dates');
    return saved ? new Set(JSON.parse(saved)) : null; // null = all open by default
  });

  const toggleDate = (dateKey) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) { next.delete(dateKey); } else { next.add(dateKey); }
      localStorage.setItem('loads_expanded_dates', JSON.stringify([...next]));
      return next;
    });
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

      <div className="space-y-3">
        {sortedDateKeys.map(dateKey => {
          const dateLoads = groupedByDate[dateKey];
          const isExpanded = expandedDates.has(dateKey);
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
                          <th className="text-left p-2 font-medium">Route</th>
                          <th className="text-left p-2 font-medium">Delivery</th>
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
                            className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => navigate(createPageUrl(`LoadDetail?id=${l.id}`))}
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
                            <td className="p-2">
                              <span className="font-mono font-semibold text-primary">{l.internal_load_number}</span>
                              {l.trip_number && <div className="text-muted-foreground">Trip: {l.trip_number}</div>}
                            </td>
                            <td className="p-2 font-medium">{l.customer_name || '—'}</td>
                            <td className="p-2">
                              {l.pickup_city || l.delivery_city
                                ? `${l.pickup_city || ''}${l.pickup_state ? ', ' + l.pickup_state : ''} → ${l.delivery_city || ''}${l.delivery_state ? ', ' + l.delivery_state : ''}`
                                : '—'}
                            </td>
                            <td className="p-2">{l.delivery_date || '—'}</td>
                            <td className="p-2">
                              {l.driver_1_name || '—'}
                              {l.driver_2_name && <div>{l.driver_2_name}</div>}
                            </td>
                            <td className="p-2 font-mono">{l.truck_number || '—'}</td>
                            <td className="p-2">{l.invoice_amount ? `$${l.invoice_amount.toLocaleString()}` : '—'}</td>
                            <td className="p-2"><StatusBadge status={l.status} /></td>
                            <td className="p-2"><StatusBadge status={l.invoice_status} /></td>
                            <td className="p-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => e.stopPropagation()}>
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