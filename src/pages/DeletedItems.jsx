import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import PageHeader from '../components/shared/PageHeader';
import { toast } from 'sonner';
import { useSession } from '../components/shared/AppSession';

export default function DeletedItems() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { data: deletedItems = [] } = useQuery({
    queryKey: ['deleted-items', session?.tenant_id],
    queryFn: () => session?.tenant_id ? base44.entities.DeletedItem.filter({ tenant_id: session.tenant_id }, '-created_date', 1000) : Promise.resolve([]),
    enabled: !!session?.tenant_id,
  });

  // Filter out items older than 30 days
  const active = deletedItems.filter(item => {
    const deleted = new Date(item.deleted_date || item.created_date);
    return differenceInDays(new Date(), deleted) < 30;
  });

  const filtered = typeFilter === 'all' ? active : active.filter(i => i.entity_type === typeFilter);
  const entityTypes = [...new Set(active.map(i => i.entity_type))];

  const permanentDeleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DeletedItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
      toast.success('Permanently deleted');
    },
  });

  const recoverMutation = useMutation({
    mutationFn: async (item) => {
      const originalData = item.original_data ? JSON.parse(item.original_data) : {};
      const { id, created_date, updated_date, created_by, ...data } = originalData;
      await base44.entities[item.entity_type].create(data);
      await base44.entities.DeletedItem.delete(item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
      toast.success('Item recovered successfully');
    },
    onError: (err) => {
      toast.error('Recovery failed: ' + err.message);
    },
  });

  const bulkRecoverMutation = useMutation({
    mutationFn: async (items) => {
      for (const item of items) {
        const originalData = item.original_data ? JSON.parse(item.original_data) : {};
        const { id, created_date, updated_date, created_by, ...data } = originalData;
        await base44.entities[item.entity_type].create(data);
        await base44.entities.DeletedItem.delete(item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
      setSelectedIds(new Set());
      toast.success('Items recovered successfully');
    },
    onError: (err) => {
      toast.error('Recovery failed: ' + err.message);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (items) => {
      for (const item of items) {
        await base44.entities.DeletedItem.delete(item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
      setSelectedIds(new Set());
      toast.success('Items permanently deleted');
    },
  });

  const daysLeft = (item) => {
    const deleted = new Date(item.deleted_date || item.created_date);
    return 30 - differenceInDays(new Date(), deleted);
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)));
    }
  };

  const selectedItems = filtered.filter(i => selectedIds.has(i.id));

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Deleted Items"
        description={`${active.length} item${active.length !== 1 ? 's' : ''} — kept for 30 days, then auto-removed`}
        actions={
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {entityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {selectedIds.size > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">{selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected</span>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <RotateCcw className="w-3 h-3" /> Recover Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Recover {selectedIds.size} Item{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      These items will be restored to their original entities.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => bulkRecoverMutation.mutate(selectedItems)}
                      disabled={bulkRecoverMutation.isPending}
                    >
                      Recover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="text-xs gap-1.5">
                    <Trash2 className="w-3 h-3" /> Delete Permanently
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Permanently Delete {selectedIds.size} Item{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone. These items will be permanently removed from the archive.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => bulkDeleteMutation.mutate(selectedItems)}
                      disabled={bulkDeleteMutation.isPending}
                    >
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Trash2 className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No deleted items</p>
            <p className="text-xs mt-1">Items you delete will appear here for 30 days.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[11px] text-muted-foreground uppercase tracking-wide">
                  <th className="text-left py-3 px-5 font-semibold w-8">
                    <Checkbox
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left py-3 px-5 font-semibold">Type</th>
                  <th className="text-left py-3 px-5 font-semibold">Label</th>
                  <th className="text-left py-3 px-5 font-semibold">Deleted</th>
                  <th className="text-left py-3 px-5 font-semibold">Expires In</th>
                  <th className="text-right py-3 px-5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const days = daysLeft(item);
                  return (
                    <tr key={item.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}>
                      <td className="py-3 px-5 w-8">
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td className="py-3 px-5">
                        <Badge variant="outline" className="text-xs">{item.entity_type}</Badge>
                      </td>
                      <td className="py-3 px-5 font-medium text-xs">{item.entity_label || item.entity_id}</td>
                      <td className="py-3 px-5 text-xs text-muted-foreground">
                        {item.deleted_date ? format(new Date(item.deleted_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="py-3 px-5">
                        <span className={`text-xs font-medium ${days <= 3 ? 'text-red-600' : days <= 7 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                          {days} day{days !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => recoverMutation.mutate(item)}
                          disabled={recoverMutation.isPending}
                        >
                          <RotateCcw className="w-3 h-3" /> Recover
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-3 h-3" /> Delete Permanently
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove "{item.entity_label}" from the deleted items archive. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => permanentDeleteMutation.mutate(item.id)}
                              >
                                Delete Permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}