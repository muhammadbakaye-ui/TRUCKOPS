import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '../components/shared/AppSession';
import DataSheetBuilder from '../components/datasheets/DataSheetBuilder';
import SavedSheetsList from '../components/datasheets/SavedSheetsList';

export default function DataSheets() {
  const { session } = useSession();
  const [editingSheet, setEditingSheet] = useState(null);
  const [builderKey, setBuilderKey] = useState(0);

  const { data: savedSheets = [], refetch } = useQuery({
    queryKey: ['datasheets', session?.tenant_id],
    queryFn: () =>
      session?.tenant_id
        ? base44.entities.DataSheet.filter({ tenant_id: session.tenant_id }, '-created_date')
        : [],
    enabled: !!session?.tenant_id,
  });

  const { data: ownerCompany } = useQuery({
    queryKey: ['owner-company', session?.tenant_id],
    queryFn: async () => {
      const companies = await base44.entities.Company.filter({
        tenant_id: session.tenant_id,
        is_owner_profile: true,
      });
      return companies[0] || null;
    },
    enabled: !!session?.tenant_id,
  });

  const handleEdit = (sheet) => {
    setEditingSheet(sheet);
    setBuilderKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerated = () => {
    setEditingSheet(null);
    setBuilderKey((k) => k + 1);
    refetch();
  };

  const handleDelete = async (sheetId) => {
    await base44.entities.DataSheet.delete(sheetId);
    if (editingSheet?.id === sheetId) {
      setEditingSheet(null);
      setBuilderKey((k) => k + 1);
    }
    refetch();
  };

  return (
    <div className="flex flex-col md:flex-row -mx-2 lg:-mx-4" style={{ minHeight: '100%' }}>
      {/* Left builder */}
      <div className="md:w-64 md:flex-shrink-0 border-b md:border-b-0 md:border-r border-border">
        <DataSheetBuilder
          key={builderKey}
          session={session}
          ownerCompany={ownerCompany}
          initialValues={editingSheet}
          onGenerated={handleGenerated}
        />
      </div>

      {/* Right saved sheets */}
      <div className="flex-1 min-h-[300px]">
        <SavedSheetsList
          sheets={savedSheets}
          editingSheetId={editingSheet?.id}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}