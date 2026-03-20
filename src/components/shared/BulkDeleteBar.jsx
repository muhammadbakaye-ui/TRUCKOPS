import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Edit2, ChevronDown, X, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Props:
//   selectedCount     - number of selected loads
//   allCount          - total filtered count
//   isAllSelected     - bool
//   onSelectAll       - callback
//   onClearSelection  - callback
//   onConfirmDelete   - callback
//   isDeleting        - bool
//   onBulkEdit        - callback(field) to open inline edit mode
//   bulkEditMode      - string | null: currently active field being edited
export default function BulkDeleteBar({
  selectedCount,
  allCount,
  isAllSelected,
  onSelectAll,
  onClearSelection,
  onConfirmDelete,
  isDeleting,
  onBulkEdit,
  bulkEditMode,
}) {
  const [showEditMenu, setShowEditMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowEditMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap mb-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
      <span className="text-sm font-medium text-foreground">{selectedCount} selected</span>

      {!isAllSelected && (
        <button onClick={onSelectAll} className="text-xs text-primary hover:underline">
          Select all {allCount}
        </button>
      )}

      <div className="flex-1" />

      {/* Edit dropdown */}
      {onBulkEdit && (
        <div className="relative" ref={menuRef}>
          <Button
            size="sm"
            variant={bulkEditMode ? 'default' : 'outline'}
            onClick={() => setShowEditMenu(v => !v)}
            className="gap-1.5 h-7 text-xs"
          >
            <Edit2 className="w-3 h-3" />
            {bulkEditMode ? `Editing: ${bulkEditMode}` : 'Edit Fields'}
            <ChevronDown className="w-3 h-3" />
          </Button>
          {showEditMenu && (
            <div className="absolute top-full mt-1 right-0 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[160px] z-50">
              <button
                onClick={() => { onBulkEdit('amount'); setShowEditMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent"
              >
                💰 Amount $
              </button>
              <button
                onClick={() => { onBulkEdit('driver'); setShowEditMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent"
              >
                🚗 Driver
              </button>
              <button
                onClick={() => { onBulkEdit('truck'); setShowEditMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent"
              >
                🚛 Truck
              </button>
            </div>
          )}
        </div>
      )}

      <Button
        size="sm"
        variant="destructive"
        onClick={onConfirmDelete}
        disabled={isDeleting}
        className="gap-1.5 h-7 text-xs"
      >
        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        Delete
      </Button>

      <button onClick={onClearSelection} className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}