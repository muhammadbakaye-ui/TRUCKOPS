import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FolderOpen, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '../components/shared/PageHeader';

export default function AdminDriverDocuments() {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['all-driver-docs'],
    queryFn: () => base44.entities.DriverDocument.list('-created_date', 1000),
  });

  // Group by driver_id, keeping newest docs first (already sorted by API)
  const grouped = docs.reduce((acc, doc) => {
    const key = doc.driver_id || 'unknown';
    if (!acc[key]) acc[key] = { driver_name: doc.driver_name || 'Unknown Driver', docs: [] };
    acc[key].docs.push(doc);
    return acc;
  }, {});

  // Sort groups by most recent upload
  const driverGroups = Object.values(grouped).sort((a, b) => {
    const aLatest = a.docs[0]?.created_date || '';
    const bLatest = b.docs[0]?.created_date || '';
    return bLatest.localeCompare(aLatest);
  });

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Driver Documents"
        description={`${docs.length} document${docs.length !== 1 ? 's' : ''} from ${driverGroups.length} driver${driverGroups.length !== 1 ? 's' : ''}`}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : driverGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No driver documents uploaded yet.</p>
            <p className="text-xs mt-1">Documents uploaded by drivers will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        driverGroups.map(({ driver_name, docs: driverDocs }) => (
          <Card key={driver_name}>
            <CardHeader className="py-3.5 px-5 border-b flex-row items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">{driver_name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {driverDocs.length} document{driverDocs.length !== 1 ? 's' : ''} · Last upload: {
                    driverDocs[0]?.created_date
                      ? format(new Date(driverDocs[0].created_date), 'MMM d, yyyy')
                      : '—'
                  }
                </p>
              </div>
            </CardHeader>
            <CardContent className="px-5 pt-3 pb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[11px] text-muted-foreground uppercase tracking-wide">
                    <th className="text-left pb-2 font-semibold w-44">Date Sent</th>
                    <th className="text-left pb-2 font-semibold w-44">Type</th>
                    <th className="text-left pb-2 font-semibold">File Name</th>
                    <th className="text-right pb-2 font-semibold w-28">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {driverDocs.map((doc) => (
                    <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 text-xs text-muted-foreground">
                        {doc.created_date
                          ? format(new Date(doc.created_date), 'MMM d, yyyy · h:mm a')
                          : '—'}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={doc.document_type === 'bol'
                            ? 'text-blue-600 border-blue-200 bg-blue-50'
                            : 'text-purple-600 border-purple-200 bg-purple-50'}
                        >
                          {doc.document_type === 'bol' ? 'BOL' : 'Rate Confirmation'}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs font-medium">{doc.file_name}</td>
                      <td className="py-3 text-right">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
                            <Download className="w-3 h-3" /> Download
                          </Button>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}