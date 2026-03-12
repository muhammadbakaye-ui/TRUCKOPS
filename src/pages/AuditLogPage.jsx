import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import DataTable from '../components/shared/DataTable';
import PageHeader from '../components/shared/PageHeader';
import StatusBadge from '../components/shared/StatusBadge';
import { format } from 'date-fns';

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 500),
  });

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchesSearch = !search || [l.entity_type, l.entity_label, l.user_name, l.details]
      .some(v => v && v.toLowerCase().includes(q));
    const matchesType = typeFilter === 'all' || l.action_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const columns = [
    { header: 'Date', render: (r) => r.created_date ? format(new Date(r.created_date), 'MMM d, yyyy h:mm a') : '—' },
    { header: 'Action', render: (r) => <StatusBadge status={r.action_type} /> },
    { header: 'Entity Type', accessor: 'entity_type' },
    { header: 'Record', accessor: 'entity_label' },
    { header: 'User', accessor: 'user_name' },
    { header: 'Details', render: (r) => <span className="text-muted-foreground text-[11px]">{r.details || '—'}</span> },
  ];

  return (
    <div className="p-4">
      <PageHeader title="Audit Log" description={`${logs.length} total entries`} />
      <div className="flex gap-2 mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search log..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs w-64" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="import">Import</SelectItem>
            <SelectItem value="generate">Generate</SelectItem>
            <SelectItem value="finalize">Finalize</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No audit log entries yet" />
    </div>
  );
}