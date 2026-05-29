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
        'relative border-b last:border-b-0 p-3 bg-card',
        isEditing ? 'bg-primary/5 cursor-default' : 'cursor-pointer'
      )}
      onClick={() => !bulkEditMode && onNavigate(load.id)}
    >
      {/* Header Row: Load # (left) + Status (right) */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected.has(load.id)}
            onCheckedChange={(checked) => onToggleSelect(load.id, checked)}
            onClick={e => e.stopPropagation()}
            className="h-4 w-4"
          />
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigate(load.id); }}
            className="font-mono font-semibold text-primary text-sm hover:underline"
          >
            {load.internal_load_number}
          </a>
        </div>
        <StatusBadge status={load.status} />
      </div>

      {/* Customer Name (own line) */}
      <div className="text-sm font-medium mb-1 pl-6">
        {load.customer_name || '—'}
      </div>

      {/* Route (next line) */}
      <div className="text-xs text-muted-foreground mb-3 pl-6">
        {load.pickup_city || load.delivery_city
          ? `${load.pickup_city || ''}${load.pickup_state ? ', ' + load.pickup_state : ''} → ${load.delivery_city || ''}${load.delivery_state ? ', ' + load.delivery_state : ''}`
          : '—'}
      </div>

      {/* Bottom Row: Date (left) + Amount (right) + Actions */}
      <div className="flex items-center justify-between pl-6">
        <div className="text-xs text-muted-foreground">
          {load.pickup_date || '—'}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold">
            {load.invoice_amount ? `$${load.invoice_amount.toLocaleString()}` : '—'}
          </div>
          <div className="flex items-center gap-1">
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
      </div>
    </div>
  );
}