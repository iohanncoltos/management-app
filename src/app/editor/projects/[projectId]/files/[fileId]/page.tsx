import { notFound } from "next/navigation";
import Link from "next/link";
import { X, User } from "lucide-react";

import { OnlyOfficeViewer } from "@/components/projects/onlyoffice-viewer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { canViewProject, requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { buildOnlyOfficeConfig } from "@/lib/onlyoffice";
import { getR2SignedUrl } from "@/lib/r2";

type FileEditorPageProps = {
  params: Promise<{ projectId: string; fileId: string }>;
};

const ASSIGN_TASKS = "ASSIGN_TASKS";
const VIEW_PROJECT = "VIEW_PROJECT";

export default async function FileEditorPage({ params }: FileEditorPageProps) {
  const { projectId, fileId } = await params;
  const session = await requireSession();

  const allowed = await canViewProject(session.user.id, projectId);
  if (!allowed) {
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

  const canEdit = session.user.permissions.includes(ASSIGN_TASKS);
  const canAccess =
    canEdit ||
    session.user.permissions.includes(VIEW_PROJECT) ||
    file.createdById === session.user.id ||
    file.project.tasks.some((task) => task.assigneeId === session.user.id);

  if (!canAccess) {
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
    permissions: { edit: canEdit },
  });

  return (
    <div className="fixed inset-0 bg-background">
      {/* Minimal Top Bar with User Info */}
      <div className="absolute top-0 right-0 z-50 p-4 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur rounded-full px-3 py-2 border border-border/50 shadow-sm">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {session.user.name?.split(' ').map(n => n[0]).join('') ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground">
            {session.user.name ?? 'User'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="bg-background/90 hover:bg-background backdrop-blur rounded-full h-9 w-9 p-0 border border-border/50 shadow-sm"
          asChild
        >
          <Link href={`/projects/${projectId}/files`}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close editor</span>
          </Link>
        </Button>
      </div>

      {/* OnlyOffice Editor - Full screen */}
      <div className="h-full">
        <OnlyOfficeViewer baseUrl={baseUrl} config={config} token={token} />
      </div>
    </div>
  );
}
