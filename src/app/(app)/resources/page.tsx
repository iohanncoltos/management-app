import { ResourceGrid } from "@/components/resources/resource-grid";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth";
import { getResourceAllocations } from "@/lib/services/resource-service";

export default async function ResourcesPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const allocations = await getResourceAllocations();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Allocation"
        description="Monitor operator workloads and identify overcommits across missions."
      />
      <ResourceGrid allocations={allocations} />
    </div>
  );
}
