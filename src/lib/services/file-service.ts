import { prisma } from "@/lib/db";

export async function listFilesForProject(projectId: string) {
  return prisma.file.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function createFileRecord(data: {
  projectId: string;
  name: string;
  key: string;
  mime: string;
  size: number;
  createdById: string;
}) {
  return prisma.file.create({
    data: {
      ...data,
      version: 1,
    },
  });
}

export async function deleteFileRecord(fileId: string) {
  return prisma.file.delete({ where: { id: fileId } });
}
