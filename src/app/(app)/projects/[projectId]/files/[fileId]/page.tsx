import { notFound } from "next/navigation";

import { OnlyOfficeViewer } from "@/components/projects/onlyoffice-viewer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildOnlyOfficeConfig } from "@/lib/onlyoffice";
import { getR2SignedUrl } from "@/lib/r2";
import { Role } from "@prisma/client";

type FileEditorPageProps = {
  params: Promise<{ projectId: string; fileId: string }>;
};

export default async function FileEditorPage({ params }: FileEditorPageProps) {
  const { projectId, fileId } = await params;
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: {
      project: {
        select: {
          id: true,
          tasks: { select: { assigneeId: true } },
        },
      },
    },
  });

  if (!file || file.projectId !== projectId) {
    notFound();
  }

  if (
    session.user.role === Role.MEMBER &&
    file.createdById !== session.user.id &&
    !file.project.tasks.some((task) => task.assigneeId === session.user.id)
  ) {
    notFound();
  }

  const fileUrl = await getR2SignedUrl(file.key, 600);
  const { baseUrl, config, token } = buildOnlyOfficeConfig({
    fileKey: file.id,
    fileUrl,
    fileName: file.name,
    user: {
      id: session.user.id,
      name: session.user.name ?? session.user.email ?? "User",
    },
    permissions: { edit: session.user.role !== Role.MEMBER },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-panel-gradient p-6">
        <h2 className="font-display text-xl font-semibold text-foreground">{file.name}</h2>
        <p className="text-sm text-muted-foreground">Interactive document session via OnlyOffice.</p>
      </div>
      <OnlyOfficeViewer baseUrl={baseUrl} config={config} token={token} />
    </div>
  );
}
