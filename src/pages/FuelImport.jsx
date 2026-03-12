import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Loader2, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function FuelImport() {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

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

  const handleFile = async (file) => {
    if (!file) return;
    setProcessing(true);
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
        prompt: `Extract all fuel transaction records from this file. The file is a fuel card transaction report.
Return a JSON array of transaction objects with these fields:
card_number, driver_name_raw, truck_number_raw, location_name (full location name like "LOVES #481 TRAVEL STOP"), city, state, transaction_date (YYYY-MM-DD), gallons (number), fuel_amount (number), transaction_fee (number), advance_amount (number), advance_fee (number), misc_amount (number), invoice_amount (number), total_amount (number).
If a field is missing, use null. Return only the JSON array.`,
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
                }
              }
            }
          }
        }
      });

      const txList = extracted?.transactions || [];
      let successful = 0;
      let exceptions = 0;

      for (const tx of txList) {
        // Try to match driver and truck
        const drivers = await base44.entities.Driver.list();
        const trucks = await base44.entities.Truck.list();

        const matchedDriver = drivers.find(d =>
          tx.driver_name_raw && d.full_name.toLowerCase().includes(tx.driver_name_raw.toLowerCase().split(' ')[0])
        );
        const matchedTruck = trucks.find(t =>
          tx.truck_number_raw && t.unit_number.toLowerCase().includes(tx.truck_number_raw.toLowerCase())
        );

        const importStatus = matchedDriver && matchedTruck ? 'matched' : 'exception';
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
          exception_reason: importStatus === 'exception' ? 'Could not match driver or truck' : null,
        });
      }

      await base44.entities.FuelBatch.update(batch.id, {
        status: 'completed',
        total_records: txList.length,
        successful_records: successful,
        exception_records: exceptions,
      });

      queryClient.invalidateQueries({ queryKey: ['fuel-batches'] });
      setSelectedBatch(batch.id);
      toast.success(`Imported ${txList.length} transactions (${exceptions} exceptions)`);
    } catch (err) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const batchColumns = [
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
      
      queryClient.invalidateQueries({ queryKey: ['fuel-batches'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-transactions'] });
      setSelectedBatch(null);
      toast.success(`Deleted ${batchTransactions.length} transactions from batch`);
    } catch (err) {
      toast.error('Batch delete failed: ' + err.message);
    }
  };

  const txColumns = [
    { header: 'Date', render: (r) => r.transaction_date || '—' },
    { header: 'Location', render: (r) => r.location_name || '—' },
    { header: 'Driver (Raw)', accessor: 'driver_name_raw' },
    { header: 'Matched Driver', render: (r) => r.matched_driver_name || <span className="text-muted-foreground">—</span> },
    { header: 'Truck', render: (r) => r.matched_truck_number || r.truck_number_raw || '—' },
    { header: 'City', render: (r) => r.city ? `${r.city}, ${r.state || ''}` : '—' },
    { header: 'Gallons', accessor: 'gallons' },
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
              <p className="text-sm font-medium">Drop fuel card file here or click to browse</p>
              <p className="text-xs text-muted-foreground">Supports PDF, CSV, Excel — AI will extract all transactions</p>
            </>
          )}
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.csv,.xlsx,.xls" onChange={(e) => handleFile(e.target.files[0])} />
        </CardContent>
      </Card>

      {/* Batch history */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Import History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={batchColumns} data={batches} isLoading={batchesLoading} onRowClick={(r) => setSelectedBatch(r.id)} emptyMessage="No imports yet" />
        </CardContent>
      </Card>

      {/* Transaction detail */}
      {selectedBatch && (
        <Card>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Transactions — {batches.find(b => b.id === selectedBatch)?.file_name}</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedBatch(null)}>Close</Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={txColumns} data={transactions} isLoading={txLoading} emptyMessage="No transactions in this batch" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}