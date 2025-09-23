import Link from "next/link";
import { notFound } from "next/navigation";

import { FileUpload } from "@/components/projects/file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canViewProject, requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

const fileSelector = {
  id: true,
  name: true,
  mime: true,
  size: true,
  version: true,
  createdAt: true,
  createdBy: {
    select: { id: true, name: true },
  },
};

type ProjectFilesPageProps = {
  params: Promise<{ projectId: string }>;
};

const ASSIGN_TASKS = "ASSIGN_TASKS";
const VIEW_PROJECT = "VIEW_PROJECT";

export default async function ProjectFilesPage({ params }: ProjectFilesPageProps) {
  const { projectId } = await params;
  const session = await requireSession();

  const allowed = await canViewProject(session.user.id, projectId);
  if (!allowed) {
    notFound();
  }

  const files = await prisma.file.findMany({
    where: { projectId },
    select: fileSelector,
    orderBy: { createdAt: "desc" },
  });

  const permissions = session.user.permissions ?? [];
  const canUpload = permissions.includes(ASSIGN_TASKS);
  const canDownload = permissions.includes(VIEW_PROJECT) || canUpload;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Mission Files</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{file.name}</div>
                    <div className="text-xs text-muted-foreground">v{file.version}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{file.mime}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{file.createdBy?.name}</TableCell>
                  <TableCell className="text-right text-sm space-x-3">
                    <Link href={`/editor/projects/${projectId}/files/${file.id}`} className="text-accent hover:text-primary">
                      Open
                    </Link>
                    {canDownload ? (
                      <Link href={`/api/files/${file.id}/download`} className="text-muted-foreground hover:text-primary">
                        Download
                      </Link>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No files uploaded yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Upload Artifact</CardTitle>
        </CardHeader>
        <CardContent>
          {canUpload ? (
            <FileUpload projectId={projectId} />
          ) : (
            <p className="text-sm text-muted-foreground">You do not have upload permissions on this project.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
