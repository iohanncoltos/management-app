import { notFound } from "next/navigation";

import { ProjectTabs } from "@/components/projects/project-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { canViewProject, requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

interface ProjectLayoutProps {
  params: Promise<{ projectId: string }>;
  children: React.ReactNode;
}

export default async function ProjectLayout({ params, children }: ProjectLayoutProps) {
  const { projectId } = await params;
  const session = await requireSession();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: { select: { id: true, assigneeId: true } },
    },
  });

  if (!project) {
    notFound();
  }

  const allowed = await canViewProject(session.user.id, projectId);
  if (!allowed) {
    notFound();
  }


  const basePath = `/projects/${projectId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${project.code} - ${project.name}`}
        description={`Mission window ${project.startDate?.toLocaleDateString() ?? "TBD"} to ${
          project.endDate ? project.endDate.toLocaleDateString() : "TBD"
        }`}
        actions={<Badge variant="outline">{project.status}</Badge>}
      />
      <ProjectTabs basePath={basePath} />
      <div>{children}</div>
    </div>
  );
}
