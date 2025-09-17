import Link from "next/link";
import { notFound } from "next/navigation";

import { FileUpload } from "@/components/projects/file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { listFilesForProject } from "@/lib/services/file-service";

type ProjectFilesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectFilesPage({ params }: ProjectFilesPageProps) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const files = await listFilesForProject(projectId);

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
                    <Link href={`/projects/${projectId}/files/${file.id}`} className="text-accent hover:text-primary">
                      Open
                    </Link>
                    <Link href={`/api/files/${file.id}/download`} className="text-muted-foreground hover:text-primary">
                      Download
                    </Link>
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
          <FileUpload projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  );
}
