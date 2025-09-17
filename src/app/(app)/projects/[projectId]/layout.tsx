import { notFound } from "next/navigation";

import { Role } from "@prisma/client";

import { ProjectTabs } from "@/components/projects/project-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface ProjectLayoutProps {
  params: { projectId: string };
  children: React.ReactNode;
}

export default async function ProjectLayout({ params, children }: ProjectLayoutProps) {
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      tasks: { select: { id: true, assigneeId: true } },
    },
  });

  if (!project) {
    notFound();
  }

  if (
    session.user.role === Role.MEMBER &&
    !project.tasks.some((task) => task.assigneeId === session.user.id)
  ) {
    notFound();
  }

  const basePath = `/projects/${params.projectId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${project.code} â€” ${project.name}`}
        description={`Mission window ${project.startDate.toLocaleDateString()} to ${
          project.endDate ? project.endDate.toLocaleDateString() : "TBD"
        }`}
        actions={<Badge variant="outline">{project.status}</Badge>}
      />
      <ProjectTabs basePath={basePath} />
      <div>{children}</div>
    </div>
  );
}
