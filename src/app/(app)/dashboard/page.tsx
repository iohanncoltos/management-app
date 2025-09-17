import Link from "next/link";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import {
  getDashboardMetrics,
  getProjectPerformanceSeries,
  getTaskStatusBreakdown,
  getUpcomingTasks,
} from "@/lib/services/dashboard-service";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const [metrics, performance, breakdown, upcoming] = await Promise.all([
    getDashboardMetrics(session.user.id, session.user.role),
    getProjectPerformanceSeries(),
    getTaskStatusBreakdown(session.user.role, session.user.id),
    getUpcomingTasks(session.user.role, session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Control Overview"
        description="Live operational snapshot across all Intermax initiatives."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/api/dashboard/export?format=csv">Export CSV</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/api/dashboard/export?format=pdf">Export PDF</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/projects">Project Register</Link>
            </Button>
            <Button asChild>
              <Link href="/projects/new">New Mission</Link>
            </Button>
          </div>
        }
      />
      <DashboardClient metrics={metrics} performance={performance} taskBreakdown={breakdown} upcoming={upcoming} />
    </div>
  );
}
