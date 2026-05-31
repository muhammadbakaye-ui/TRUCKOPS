import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import StatusBadge from '../shared/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export default function MobileInvoiceCard({ invoice, selected, onToggleSelect, onNavigate, onDelete }) {
  return (
    <div
      className={cn(
        'border rounded-lg p-3 bg-card mb-2 cursor-pointer'
      )}
      onClick={() => onNavigate(invoice.id)}
    >
      {/* Header: Invoice # + Status */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected.has(invoice.id)}
            onCheckedChange={(checked) => onToggleSelect(invoice.id, checked)}
            onClick={e => e.stopPropagation()}
            className="h-4 w-4"
          />
          <span className="font-mono font-semibold text-primary text-sm">
            {invoice.invoice_number}
          </span>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      {/* Customer */}
      <div className="text-sm font-medium mb-1">
        {invoice.customer_name || '—'}
      </div>

      {/* Load # */}
      {invoice.load_number && (
        <div className="text-xs text-muted-foreground mb-1">
          Load: <span className="font-mono">{invoice.load_number}</span>
        </div>
      )}

      {/* Due Date */}
      <div className="text-xs text-muted-foreground mb-2">
        Due: {invoice.due_date || '—'}
      </div>

      {/* Amount */}
      <div className="text-sm font-semibold mb-2">
        {invoice.total ? `$${invoice.total.toLocaleString()}` : '—'}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t">
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
              <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
              <AlertDialogDescription>Invoice #{invoice.invoice_number} will be moved to Deleted Items.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onDelete(invoice)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}