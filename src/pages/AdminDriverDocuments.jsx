import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, FolderOpen, Loader2, User, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '../components/shared/PageHeader';

export default function AdminDriverDocuments() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [truckFilter, setTruckFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['all-driver-docs'],
    queryFn: () => base44.entities.DriverDocument.list('-created_date', 1000),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: () => base44.entities.Driver.list('full_name', 500),
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks-list'],
    queryFn: () => base44.entities.Truck.list('unit_number', 500),
  });

  // Build driver -> truck map
  const driverTruckMap = drivers.reduce((acc, d) => {
    if (d.assigned_truck_id) {
      const truck = trucks.find(t => t.id === d.assigned_truck_id);
      if (truck) acc[d.id] = truck.unit_number;
    }
    return acc;
  }, {});

  // Unique driver names and upload dates for filter options
  const uniqueDriverNames = [...new Set(docs.map(d => d.driver_name).filter(Boolean))].sort();
  const uniqueDates = [...new Set(docs.map(d => d.created_date ? format(new Date(d.created_date), 'yyyy-MM-dd') : null).filter(Boolean))].sort().reverse();
  const uniqueTrucks = [...new Set(trucks.map(t => t.unit_number).filter(Boolean))].sort();

  const deleteMutation = useMutation({
    mutationFn: async (doc) => {
      await base44.entities.DeletedItem.create({
        entity_type: 'DriverDocument',
        entity_id: doc.id,
        entity_label: `${doc.driver_name || 'Unknown'} — ${doc.file_name}`,
        deleted_date: new Date().toISOString().split('T')[0],
        original_data: JSON.stringify(doc),
      });
      await base44.entities.DriverDocument.delete(doc.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-driver-docs'] });
      toast.success('Document moved to deleted items');
    },
  });

  // Apply filters
  const filtered = docs.filter(doc => {
    const matchesSearch = !search || doc.driver_name?.toLowerCase().includes(search.toLowerCase()) || doc.file_name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group by driver, then by date within each driver
  const grouped = filtered.reduce((acc, doc) => {
    const key = doc.driver_id || 'unknown';
    if (!acc[key]) acc[key] = { driver_name: doc.driver_name || 'Unknown Driver', byDate: {} };
    const dateKey = doc.created_date
      ? format(new Date(doc.created_date), 'yyyy-MM-dd')
      : 'unknown';
    if (!acc[key].byDate[dateKey]) acc[key].byDate[dateKey] = [];
    acc[key].byDate[dateKey].push(doc);
    return acc;
  }, {});

  const driverGroups = Object.values(grouped).sort((a, b) => {
    const aLatest = Object.keys(a.byDate).sort().reverse()[0] || '';
    const bLatest = Object.keys(b.byDate).sort().reverse()[0] || '';
    return bLatest.localeCompare(aLatest);
  });

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Driver Documents"
        description={`${filtered.length} document${filtered.length !== 1 ? 's' : ''} from ${driverGroups.length} driver${driverGroups.length !== 1 ? 's' : ''}`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-9 w-56 text-sm"
            placeholder="Search driver or file..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="bol">BOL</SelectItem>
            <SelectItem value="rate_confirmation">Rate Confirmation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : driverGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderOpen className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No documents found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {driverGroups.map(({ driver_name, byDate }) => {
            const sortedDates = Object.keys(byDate).sort().reverse();
            const totalDocs = sortedDates.reduce((sum, d) => sum + byDate[d].length, 0);
            return (
              <div key={driver_name} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Driver header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{driver_name}</p>
                    <p className="text-[11px] text-muted-foreground">{totalDocs} doc{totalDocs !== 1 ? 's' : ''} · {sortedDates.length} day{sortedDates.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Date groups */}
                <div className="divide-y divide-border">
                  {sortedDates.map(dateKey => {
                    const dateDocs = byDate[dateKey];
                    const dateLabel = dateKey !== 'unknown'
                      ? format(new Date(dateKey), 'MMM d, yyyy')
                      : 'Unknown Date';
                    return (
                      <div key={dateKey} className="px-4 py-3">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{dateLabel}</p>
                        <div className="space-y-2">
                          {dateDocs.map(doc => (
                            <div key={doc.id} className="flex items-start justify-between gap-2 group">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 ${doc.document_type === 'bol'
                                      ? 'text-blue-600 border-blue-200 bg-blue-50'
                                      : 'text-purple-600 border-purple-200 bg-purple-50'}`}
                                  >
                                    {doc.document_type === 'bol' ? 'BOL' : 'RC'}
                                  </Badge>
                                  <span className="text-xs text-foreground truncate max-w-[160px]">{doc.file_name}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {doc.created_date ? format(new Date(doc.created_date), 'h:mm a') : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </a>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                                      <AlertDialogDescription>"{doc.file_name}" will be moved to Deleted Items.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(doc)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}