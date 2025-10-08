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

const CREATE_PROJECT = "CREATE_PROJECT";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const permissions = session.user.permissions ?? [];

  const [metrics, performance, breakdown, upcoming] = await Promise.all([
    getDashboardMetrics(session.user.id, permissions),
    getProjectPerformanceSeries(),
    getTaskStatusBreakdown(permissions, session.user.id),
    getUpcomingTasks(permissions, session.user.id),
  ]);

  const canCreateProjects = permissions.includes(CREATE_PROJECT);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Control Overview"
        description="Live operational snapshot across all Intermax initiatives."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button asChild variant="ghost" size="sm" className="w-full sm:w-auto">
              <Link href="/api/dashboard/export?format=csv">Export CSV</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="w-full sm:w-auto">
              <Link href="/api/dashboard/export?format=pdf">Export PDF</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/projects">Project Register</Link>
            </Button>
            {canCreateProjects ? (
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href="/projects/new">New Mission</Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <DashboardClient metrics={metrics} performance={performance} taskBreakdown={breakdown} upcoming={upcoming} />
    </div>
  );
}
