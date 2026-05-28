import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Edit2, ChevronDown, X, DollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { chunkAsync } from '../../utils/chunkAsync';
import { toast } from 'sonner';

export default function BulkEditBar({ selectedIds, onClearSelection, onDeleted, onEdited, drivers = [], trucks = [] }) {
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [amountValue, setAmountValue] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  const count = selectedIds.length;

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowEditMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDelete = async () => {
    if (!confirm(`Delete ${count} load${count > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setLoading(true);
    await chunkAsync(selectedIds, id => base44.entities.Load.delete(id));
    toast.success(`${count} load${count > 1 ? 's' : ''} deleted`);
    onDeleted();
    setLoading(false);
  };

  const handleApplyAmount = async () => {
    const val = parseFloat(amountValue);
    if (isNaN(val)) return toast.error('Enter a valid amount');
    setLoading(true);
    await chunkAsync(selectedIds, id => base44.entities.Load.update(id, { invoice_amount: val }));
    toast.success(`Updated amount on ${count} load${count > 1 ? 's' : ''}`);
    onEdited();
    setEditMode(null);
    setAmountValue('');
    setLoading(false);
  };

  const handleApplyDriverTruck = async () => {
    if (!selectedDriverId && !selectedTruckId) return toast.error('Select a driver or truck');
    setLoading(true);
    const updates = {};
    if (selectedDriverId) {
      const driver = drivers.find(d => d.id === selectedDriverId);
      updates.driver_1_id = selectedDriverId;
      updates.driver_1_name = driver?.full_name || '';
    }
    if (selectedTruckId) {
      const truck = trucks.find(t => t.id === selectedTruckId);
      updates.truck_id = selectedTruckId;
      updates.truck_number = truck?.unit_number || '';
    }
    await chunkAsync(selectedIds, id => base44.entities.Load.update(id, updates));
    toast.success(`Updated ${count} load${count > 1 ? 's' : ''}`);
    onEdited();
    setEditMode(null);
    setSelectedDriverId('');
    setSelectedTruckId('');
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {editMode === 'amount' && (
        <div className="bg-card border border-border rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <Input
            type="number"
            placeholder="Invoice Amount"
            value={amountValue}
            onChange={e => setAmountValue(e.target.value)}
            className="w-36 h-8"
          />
          <Button size="sm" onClick={handleApplyAmount} disabled={loading}>Apply</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditMode(null)}>Cancel</Button>
        </div>
      )}
      {editMode === 'driver_truck' && (
        <div className="bg-card border border-border rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <Users className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedDriverId}
            onChange={e => setSelectedDriverId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— Driver —</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
          <select
            value={selectedTruckId}
            onChange={e => setSelectedTruckId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— Truck —</option>
            {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
          </select>
          <Button size="sm" onClick={handleApplyDriverTruck} disabled={loading}>Apply</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditMode(null)}>Cancel</Button>
        </div>
      )}

      <div className="bg-card border border-border rounded-full shadow-2xl px-4 py-2 flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">{count} selected</span>
        <div className="w-px h-5 bg-border" />

        <div className="relative" ref={menuRef}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEditMenu(v => !v)}
            className="gap-1"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
            <ChevronDown className="w-3 h-3" />
          </Button>
          {showEditMenu && (
            <div className="absolute bottom-full mb-2 left-0 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[160px]">
              <button
                onClick={() => { setEditMode('amount'); setShowEditMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
              >
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                Amount $
              </button>
              <button
                onClick={() => { setEditMode('driver_truck'); setShowEditMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
              >
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                Driver / Truck
              </button>
            </div>
          )}
        </div>

        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading} className="gap-1">
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>

        <button onClick={onClearSelection} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}