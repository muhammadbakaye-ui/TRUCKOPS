import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import PageHeader from '../components/shared/PageHeader';
import { toast } from 'sonner';

export default function DeletedItems() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: deletedItems = [], isLoading } = useQuery({
    queryKey: ['deleted-items'],
    queryFn: () => base44.entities.DeletedItem.list('-created_date', 1000),
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

  const daysLeft = (item) => {
    const deleted = new Date(item.deleted_date || item.created_date);
    return 30 - differenceInDays(new Date(), deleted);
  };

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

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
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
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
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
                      <td className="py-3 px-5 text-right">
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