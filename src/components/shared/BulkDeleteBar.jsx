import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function BulkDeleteBar({ selectedCount, onSelectAll, onClearSelection, onConfirmDelete, isDeleting, allCount, isAllSelected }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-md border border-border">
      <div className="flex-1">
        <p className="text-sm font-medium">
          {selectedCount} selected {selectedCount === allCount && allCount > 0 ? '(all)' : ''}
        </p>
      </div>
      <div className="flex gap-2">
        {selectedCount < allCount && (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onSelectAll}>
            Select All
          </Button>
        )}
        {selectedCount > 0 && !isAllSelected && (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onSelectAll}>
            Select All {allCount}
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="h-8 text-xs gap-1">
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedCount})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedCount} items?</AlertDialogTitle>
              <AlertDialogDescription>
                These items will be moved to Deleted Items and kept for 30 days.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={onConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearSelection}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}