import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { canViewProject } from "@/lib/authz";
import { getR2SignedUrl } from "@/lib/r2";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { fileId } = await context.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

  if (!file) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const canDownload =
    session.user.permissions.includes("VIEW_PROJECT") ||
    file.createdById === session.user.id ||
    file.project.tasks.some((task) => task.assigneeId === session.user.id) ||
    (await canViewProject(session.user.id, file.project.id));

  if (!canDownload) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const url = await getR2SignedUrl(file.key);
  return NextResponse.redirect(url);
}
