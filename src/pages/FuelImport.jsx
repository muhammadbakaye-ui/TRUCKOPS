import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import DataTable from '../components/shared/DataTable';
import BulkDeleteBar from '../components/shared/BulkDeleteBar';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function FuelImport() {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(() => localStorage.getItem('fuel_selected_batch') || null);
  const [selectedTx, setSelectedTx] = useState(new Set());
  const [selectedBatches, setSelectedBatches] = useState(new Set());
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedBatch) {
      localStorage.setItem('fuel_selected_batch', selectedBatch);
    } else {
      localStorage.removeItem('fuel_selected_batch');
    }
  }, [selectedBatch]);

  const { data: batches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ['fuel-batches'],
    queryFn: () => base44.entities.FuelBatch.list('-created_date', 50),
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['fuel-transactions', selectedBatch],
    queryFn: () => selectedBatch
      ? base44.entities.FuelTransaction.filter({ batch_id: selectedBatch }, '-transaction_date', 500)
      : [],
    enabled: !!selectedBatch,
  });

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setProcessing(true);
    
    const fileArray = Array.from(files);
    let totalImported = 0;
    let totalExceptions = 0;
    
    try {
      for (const file of fileArray) {
        await processFile(file);
      }
      queryClient.invalidateQueries({ queryKey: ['fuel-batches'] });
      toast.success(`Imported ${fileArray.length} file${fileArray.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const processFile = async (file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const batch = await base44.entities.FuelBatch.create({
        file_name: file.name,
        file_url,
        import_date: new Date().toISOString().split('T')[0],
        status: 'processing',
      });
      // Use LLM to extract fuel transaction data
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract all fuel transaction records from this fuel card report.

CRITICAL INSTRUCTIONS FOR DRIVER NAMES:
- Driver names are often split across lines or have weird spacing (e.g., "N-ABDIWE  LI HASSAN" should be "ABDIWELI HASSAN")
- Remove any "N-" prefix before names
- If you see a name split like "ABDIWE" on one line and "LI HASSAN" below it, or "ABDIWE  LI HASSAN" with extra spaces, combine them into the full name removing extra spaces
- Common patterns: "N-ABDIWELI", "ABDIWE LI HASSAN", "N-ISMA EL", "ISMA EL ABDIAZIZ"
- Join split parts and normalize to proper format: "ABDIWELI HASSAN", "ISMAEL ABDIAZIZ", etc.
- Return the full clean name in driver_name_raw

Extract these fields for each transaction:
- card_number: fuel card number
- driver_name_raw: FULL driver name (cleaned and joined if split, no "N-" prefix)
- truck_number_raw: truck/unit number
- location_name: full location name like "LOVES #481 TRAVEL STOP"
- city: city name
- state: state abbreviation
- transaction_date: date in YYYY-MM-DD format
- gallons: number of gallons (from QTY column)
- fuel_amount: use GROSS AMT column if available, otherwise use fuel purchase amount
- transaction_fee: transaction fees if any
- advance_amount: cash advance amount
- advance_fee: advance fees
- misc_amount: misc charges
- invoice_amount: invoice amount
- total_amount: total dollar amount for the transaction
- gross_amount: gross amount if available

Return only the JSON with the transactions array.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  card_number: { type: 'string' },
                  driver_name_raw: { type: 'string' },
                  truck_number_raw: { type: 'string' },
                  location_name: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  transaction_date: { type: 'string' },
                  gallons: { type: 'number' },
                  fuel_amount: { type: 'number' },
                  transaction_fee: { type: 'number' },
                  advance_amount: { type: 'number' },
                  advance_fee: { type: 'number' },
                  misc_amount: { type: 'number' },
                  invoice_amount: { type: 'number' },
                  total_amount: { type: 'number' },
                  gross_amount: { type: 'number' },
                  gross_amt: { type: 'number' },
                }
              }
            }
          }
        }
      });

      const txList = extracted?.transactions || [];
       let successful = 0;
       let exceptions = 0;

       // Fetch drivers and trucks once
       const drivers = await base44.entities.Driver.list();
       const trucks = await base44.entities.Truck.list();

       // Normalize a unit number: lowercase, strip leading zeros and spaces
       const normalizeUnit = (s) => s ? s.toLowerCase().trim().replace(/^0+/, '') : '';

       // Normalize a driver name: remove N- prefix, collapse spaces, lowercase
       const normalizeName = (s) => s ? s.toLowerCase().trim().replace(/^n-/, '').replace(/\s+/g, ' ').trim() : '';

       // Match a driver by name with fuzzy logic
       const matchDriverByName = (rawName) => {
         const raw = normalizeName(rawName);
         if (!raw) return null;
         return drivers.find(d => {
           if (!d.full_name) return false;
           const full = d.full_name.toLowerCase().trim();
           if (full === raw) return true;
           const rawParts = raw.split(' ');
           const fullParts = full.split(' ');
           if (rawParts.length >= 1 && rawParts[0].length >= 4 && rawParts[0] === fullParts[0]) {
             if (rawParts.length === 1) return true;
             if (rawParts.length >= 2 && fullParts.length >= 2) {
               if (fullParts[1].startsWith(rawParts[1]) || rawParts[1].startsWith(fullParts[1])) return true;
             }
           }
           return false;
         }) || null;
       };

       // Match a truck by unit number with normalization
       const matchTruckByNumber = (rawNumber) => {
         if (!rawNumber) return null;
         const norm = normalizeUnit(rawNumber);
         return trucks.find(t => t.unit_number && normalizeUnit(t.unit_number) === norm) || null;
       };

       for (const tx of txList) {
         let matchedTruck = null;
         let matchedDriver = null;

         // Step 1: Try to match truck by number (most reliable)
         matchedTruck = matchTruckByNumber(tx.truck_number_raw);

         // Step 2: Try to match driver by name
         matchedDriver = matchDriverByName(tx.driver_name_raw);

         // Step 3: Cross-fill using the truck↔driver assignment relationship
         if (matchedTruck && !matchedDriver && matchedTruck.assigned_driver_id) {
           matchedDriver = drivers.find(d => d.id === matchedTruck.assigned_driver_id) || null;
         }
         if (matchedDriver && !matchedTruck && matchedDriver.assigned_truck_id) {
           matchedTruck = trucks.find(t => t.id === matchedDriver.assigned_truck_id) || null;
         }

         // Step 4: If still missing one side, try cross-matching the other side's raw value
         if (matchedDriver && !matchedTruck) {
           matchedTruck = matchTruckByNumber(tx.truck_number_raw);
         }
         if (matchedTruck && !matchedDriver) {
           matchedDriver = matchDriverByName(tx.driver_name_raw);
         }

         // Determine status and exception reason
         let importStatus, exceptionReason;
         if (matchedDriver && matchedTruck) {
           importStatus = 'matched';
           exceptionReason = null;
         } else {
           importStatus = 'exception';
           if (!matchedDriver && !matchedTruck) exceptionReason = 'Could not match driver or truck';
           else if (!matchedDriver) exceptionReason = `Truck matched (${matchedTruck.unit_number}) but driver not found`;
           else exceptionReason = `Driver matched (${matchedDriver.full_name}) but truck not found`;
         }

         if (importStatus === 'exception') exceptions++;
         else successful++;

         await base44.entities.FuelTransaction.create({
           ...tx,
           batch_id: batch.id,
           matched_driver_id: matchedDriver?.id || null,
           matched_driver_name: matchedDriver?.full_name || null,
           matched_truck_id: matchedTruck?.id || null,
           matched_truck_number: matchedTruck?.unit_number || null,
           import_status: importStatus,
           exception_reason: exceptionReason,
         });
       }

      await base44.entities.FuelBatch.update(batch.id, {
        status: 'completed',
        total_records: txList.length,
        successful_records: successful,
        exception_records: exceptions,
      });

      // Don't invalidate here, will be done after all files processed
      setSelectedBatch(batch.id);
    } catch (err) {
      throw err;
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleFiles(files);
  };

  const batchColumns = [
    {
      header: (
        <Checkbox
          checked={selectedBatches.size > 0 && selectedBatches.size === batches.length}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedBatches(new Set(batches.map(b => b.id)));
            } else {
              setSelectedBatches(new Set());
            }
          }}
        />
      ),
      render: (r) => (
        <Checkbox
          checked={selectedBatches.has(r.id)}
          onCheckedChange={(checked) => {
            const newSelected = new Set(selectedBatches);
            if (checked) {
              newSelected.add(r.id);
            } else {
              newSelected.delete(r.id);
            }
            setSelectedBatches(newSelected);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
    { header: 'File', render: (r) => <span className="font-medium text-xs">{r.file_name}</span> },
    { header: 'Date', render: (r) => r.import_date ? format(new Date(r.import_date), 'MMM d, yyyy') : '—' },
    { header: 'Total', render: (r) => r.total_records || 0 },
    { header: 'Matched', render: (r) => <span className="text-green-600">{r.successful_records || 0}</span> },
    { header: 'Exceptions', render: (r) => <span className="text-orange-600">{r.exception_records || 0}</span> },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: '',
      render: (r) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Entire Import Batch?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all {r.total_records} transactions from "{r.file_name}". They can be recovered within 30 days.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteBatch(r)}>Delete All</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
    },
  ];

  const handleDelete = async (tx) => {
    try {
      const entityLabel = `${tx.matched_driver_name || tx.driver_name_raw} - ${tx.transaction_date}`;
      await base44.entities.DeletedItem.create({
        entity_type: 'FuelTransaction',
        entity_id: tx.id,
        entity_label: entityLabel,
        deleted_by: 'system',
        deleted_date: new Date().toISOString(),
        original_data: JSON.stringify(tx),
      });
      await base44.entities.FuelTransaction.delete(tx.id);
      queryClient.invalidateQueries({ queryKey: ['fuel-transactions'] });
      toast.success('Fuel transaction deleted');
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const handleDeleteBatch = async (batch) => {
    try {
      const batchTransactions = await base44.entities.FuelTransaction.filter({ batch_id: batch.id });
      
      for (const tx of batchTransactions) {
        const entityLabel = `${tx.matched_driver_name || tx.driver_name_raw} - ${tx.transaction_date}`;
        await base44.entities.DeletedItem.create({
          entity_type: 'FuelTransaction',
          entity_id: tx.id,
          entity_label: entityLabel,
          deleted_by: 'system',
          deleted_date: new Date().toISOString(),
          original_data: JSON.stringify(tx),
        });
        await base44.entities.FuelTransaction.delete(tx.id);
      }

      // Delete the batch itself
      const batchLabel = batch.file_name;
      await base44.entities.DeletedItem.create({
        entity_type: 'FuelBatch',
        entity_id: batch.id,
        entity_label: batchLabel,
        deleted_by: 'system',
        deleted_date: new Date().toISOString(),
        original_data: JSON.stringify(batch),
      });
      await base44.entities.FuelBatch.delete(batch.id);
      
      queryClient.invalidateQueries({ queryKey: ['fuel-batches'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-transactions'] });
      setSelectedBatch(null);
      setSelectedTx(new Set());
      toast.success(`Deleted batch and ${batchTransactions.length} transactions`);
    } catch (err) {
      toast.error('Batch delete failed: ' + err.message);
    }
  };

  const handleRematch = async () => {
    if (!selectedBatch) return;
    setProcessing(true);
    try {
      const drivers = await base44.entities.Driver.list();
      const trucks = await base44.entities.Truck.list();
      const txList = await base44.entities.FuelTransaction.filter({ batch_id: selectedBatch }, '-transaction_date', 500);

      const normalizeUnit = (s) => s ? s.toLowerCase().trim().replace(/^0+/, '') : '';
      const normalizeName = (s) => s ? s.toLowerCase().trim().replace(/^n-/, '').replace(/\s+/g, ' ').trim() : '';

      const matchDriverByName = (rawName) => {
        const raw = normalizeName(rawName);
        if (!raw) return null;
        return drivers.find(d => {
          if (!d.full_name) return false;
          const full = d.full_name.toLowerCase().trim();
          if (full === raw) return true;
          const rawParts = raw.split(' ');
          const fullParts = full.split(' ');
          if (rawParts.length >= 1 && rawParts[0].length >= 4 && rawParts[0] === fullParts[0]) {
            if (rawParts.length === 1) return true;
            if (rawParts.length >= 2 && fullParts.length >= 2) {
              if (fullParts[1].startsWith(rawParts[1]) || rawParts[1].startsWith(fullParts[1])) return true;
            }
          }
          return false;
        }) || null;
      };

      const matchTruckByNumber = (rawNumber) => {
        if (!rawNumber) return null;
        const norm = normalizeUnit(rawNumber);
        return trucks.find(t => t.unit_number && normalizeUnit(t.unit_number) === norm) || null;
      };

      let matched = 0, exceptions = 0;
      for (const tx of txList) {
        let matchedTruck = matchTruckByNumber(tx.truck_number_raw);
        let matchedDriver = matchDriverByName(tx.driver_name_raw);

        if (matchedTruck && !matchedDriver && matchedTruck.assigned_driver_id)
          matchedDriver = drivers.find(d => d.id === matchedTruck.assigned_driver_id) || null;
        if (matchedDriver && !matchedTruck && matchedDriver.assigned_truck_id)
          matchedTruck = trucks.find(t => t.id === matchedDriver.assigned_truck_id) || null;

        let importStatus, exceptionReason;
        if (matchedDriver && matchedTruck) {
          importStatus = 'matched'; exceptionReason = null; matched++;
        } else {
          importStatus = 'exception'; exceptions++;
          if (!matchedDriver && !matchedTruck) exceptionReason = 'Could not match driver or truck';
          else if (!matchedDriver) exceptionReason = `Truck matched (${matchedTruck.unit_number}) but driver not found`;
          else exceptionReason = `Driver matched (${matchedDriver.full_name}) but truck not found`;
        }

        await base44.entities.FuelTransaction.update(tx.id, {
          matched_driver_id: matchedDriver?.id || null,
          matched_driver_name: matchedDriver?.full_name || null,
          matched_truck_id: matchedTruck?.id || null,
          matched_truck_number: matchedTruck?.unit_number || null,
          import_status: importStatus,
          exception_reason: exceptionReason,
        });
      }

      // Update batch counts
      await base44.entities.FuelBatch.update(selectedBatch, {
        successful_records: matched,
        exception_records: exceptions,
      });

      queryClient.invalidateQueries({ queryKey: ['fuel-transactions', selectedBatch] });
      queryClient.invalidateQueries({ queryKey: ['fuel-batches'] });
      toast.success(`Re-matched ${txList.length} transactions: ${matched} matched, ${exceptions} exceptions`);
    } catch (err) {
      toast.error('Re-match failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDeleteTx = async (txList) => {
    try {
      for (const tx of txList) {
        const entityLabel = `${tx.matched_driver_name || tx.driver_name_raw} - ${tx.transaction_date}`;
        await base44.entities.DeletedItem.create({
          entity_type: 'FuelTransaction',
          entity_id: tx.id,
          entity_label: entityLabel,
          deleted_by: 'system',
          deleted_date: new Date().toISOString(),
          original_data: JSON.stringify(tx),
        });
        await base44.entities.FuelTransaction.delete(tx.id);
      }
      queryClient.invalidateQueries({ queryKey: ['fuel-transactions'] });
      setSelectedTx(new Set());
      toast.success(`${txList.length} transaction${txList.length === 1 ? '' : 's'} deleted`);
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const txColumns = [
    {
      header: (
        <Checkbox
          checked={selectedTx.size > 0 && selectedTx.size === transactions.length}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedTx(new Set(transactions.map(t => t.id)));
            } else {
              setSelectedTx(new Set());
            }
          }}
        />
      ),
      render: (r) => (
        <Checkbox
          checked={selectedTx.has(r.id)}
          onCheckedChange={(checked) => {
            const newSelected = new Set(selectedTx);
            if (checked) {
              newSelected.add(r.id);
            } else {
              newSelected.delete(r.id);
            }
            setSelectedTx(newSelected);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
    { header: 'Date', render: (r) => r.transaction_date || '—' },
    { header: 'Location', render: (r) => r.location_name || '—' },
    { header: 'Matched Driver', render: (r) => r.matched_driver_name || <span className="text-muted-foreground">—</span> },
    { header: 'Truck', render: (r) => r.matched_truck_number || r.truck_number_raw || '—' },
    { header: 'City', render: (r) => r.city ? `${r.city}, ${r.state || ''}` : '—' },
    { header: 'Gallons', render: (r) => r.gallons || '—' },
    { header: 'Fuel $', render: (r) => r.fuel_amount ? `$${r.fuel_amount.toFixed(2)}` : '—' },
    { header: 'Total $', render: (r) => r.total_amount ? `$${r.total_amount.toFixed(2)}` : '—' },
    { header: 'Status', render: (r) => <StatusBadge status={r.import_status} /> },
    { 
      header: '', 
      render: (r) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Fuel Transaction?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move the transaction to deleted items. You can recover it within 30 days.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete(r)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Fuel Import" description="Import fuel card transaction files" />

      {/* Upload zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${dragging ? 'border-primary bg-primary/5' : 'border-border'}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !processing && fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          {processing ? (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-medium">Processing file with AI...</p>
              <p className="text-xs text-muted-foreground">Extracting and matching transactions</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm font-medium">Drop fuel card files here or click to browse</p>
              <p className="text-xs text-muted-foreground">Upload multiple files at once — AI will extract all transactions</p>
            </>
          )}
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.csv,.xlsx,.xls" multiple onChange={(e) => handleFiles(e.target.files)} />
        </CardContent>
      </Card>

      {/* Batch history */}
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm">Import History</CardTitle>
          </div>
          <div />
        </CardHeader>
        <CardContent className="p-0">
          {selectedBatches.size > 0 && (
            <div className="p-3 border-b">
              <BulkDeleteBar
                selectedCount={selectedBatches.size}
                allCount={batches.length}
                onSelectAll={() => setSelectedBatches(new Set(batches.map(b => b.id)))}
                onClearSelection={() => setSelectedBatches(new Set())}
                onConfirmDelete={() => {
                  const batchesToDelete = batches.filter(b => selectedBatches.has(b.id));
                  Promise.all(batchesToDelete.map(b => handleDeleteBatch(b))).then(() => {
                    setSelectedBatches(new Set());
                  });
                }}
                isDeleting={false}
                isAllSelected={selectedBatches.size === batches.length}
              />
            </div>
          )}
          <DataTable columns={batchColumns} data={batches} isLoading={batchesLoading} onRowClick={(r) => setSelectedBatch(r.id)} emptyMessage="No imports yet" />
        </CardContent>
      </Card>



      {/* Transaction detail */}
      {selectedBatch && (
        <Card>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Transactions — {batches.find(b => b.id === selectedBatch)?.file_name}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedBatch(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
           {selectedTx.size > 0 && (
             <div className="p-3 border-b">
               <BulkDeleteBar
                 selectedCount={selectedTx.size}
                 allCount={transactions.length}
                 onSelectAll={() => setSelectedTx(new Set(transactions.map(t => t.id)))}
                 onClearSelection={() => setSelectedTx(new Set())}
                 onConfirmDelete={() => {
                   const txToDelete = transactions.filter(t => selectedTx.has(t.id));
                   handleBulkDeleteTx(txToDelete);
                 }}
                 isDeleting={false}
                 isAllSelected={selectedTx.size === transactions.length}
               />
             </div>
           )}
           <DataTable columns={txColumns} data={transactions} isLoading={txLoading} emptyMessage="No transactions in this batch" />
          </CardContent>
        </Card>
      )}


    </div>
  );
}