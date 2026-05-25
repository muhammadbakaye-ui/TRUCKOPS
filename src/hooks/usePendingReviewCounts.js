import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';

export function usePendingReviewCounts() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;

  const { data: counts } = useQuery({
    queryKey: ['pending-review-counts', tenantId],
    queryFn: async () => {
      if (!tenantId) return { qualifications: 0, drugTests: 0, inspections: 0 };
      
      const [qualifications, drugTests, inspections] = await Promise.all([
        base44.entities.DriverQualification.filter({ tenant_id: tenantId, pending_review: true }, null, 100),
        base44.entities.DrugAlcoholTest.filter({ tenant_id: tenantId, pending_review: true }, null, 100),
        base44.entities.TruckInspection.filter({ tenant_id: tenantId, pending_review: true }, null, 100),
      ]);

      return {
        qualifications: qualifications.length,
        drugTests: drugTests.length,
        inspections: inspections.length,
        total: qualifications.length + drugTests.length + inspections.length,
      };
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return counts || { qualifications: 0, drugTests: 0, inspections: 0, total: 0 };
}