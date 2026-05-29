import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import StatusBadge from '../shared/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export default function MobileLoadCard({ load, selected, onToggleSelect, onNavigate, onPrint, onDelete, bulkEditMode, onBulkEditChange }) {
  const isEditing = bulkEditMode && selected.has(load.id);

  return (
    <div
      className={cn(
        'border rounded-lg p-3 bg-card mb-2',
        isEditing ? 'bg-primary/5 cursor-default' : 'cursor-pointer'
      )}
      onClick={() => !bulkEditMode && onNavigate(load.id)}
    >
      {/* Header: Load # + Status */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected.has(load.id)}
            onCheckedChange={(checked) => onToggleSelect(load.id, checked)}
            onClick={e => e.stopPropagation()}
            className="h-4 w-4"
          />
          <span className="font-mono font-semibold text-primary text-sm">
            {load.internal_load_number}
          </span>
        </div>
        <StatusBadge status={load.status} />
      </div>

      {/* Customer */}
      <div className="text-sm font-medium mb-1">
        {load.customer_name || '—'}
      </div>

      {/* Route */}
      <div className="text-xs text-muted-foreground mb-1">
        {load.pickup_city || load.delivery_city
          ? `${load.pickup_city || ''}${load.pickup_state ? ', ' + load.pickup_state : ''} → ${load.delivery_city || ''}${load.delivery_state ? ', ' + load.delivery_state : ''}`
          : '—'}
      </div>

      {/* Pickup Date */}
      <div className="text-xs text-muted-foreground mb-2">
        Pickup: {load.pickup_date || '—'}
      </div>

      {/* Amount */}
      <div className="text-sm font-semibold mb-2">
        {load.invoice_amount ? `$${load.invoice_amount.toLocaleString()}` : '—'}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onPrint(load); }}
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={e => e.stopPropagation()}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Load?</AlertDialogTitle>
              <AlertDialogDescription>Load #{load.internal_load_number} will be moved to Deleted Items.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onDelete(load)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}