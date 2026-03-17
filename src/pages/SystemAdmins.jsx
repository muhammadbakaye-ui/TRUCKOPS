import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';

export default function SystemAdmins() {
  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => base44.entities.Admin.list(),
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="System Admins"
        description="View all administrator accounts"
      />

      <div className="px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Administrators</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : admins.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No admins found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          {admin.first_name} {admin.last_name}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{admin.display_email || admin.email}</td>
                         <td className="py-3 px-4 text-muted-foreground text-sm">{admin.phone || '-'}</td>
                         <td className="py-3 px-4">
                           <Badge variant={admin.active ? 'default' : 'secondary'}>
                             {admin.active ? 'Active' : 'Inactive'}
                           </Badge>
                         </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {new Date(admin.created_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}