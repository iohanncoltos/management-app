import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildOnlyOfficeConfig } from "@/lib/onlyoffice";
import { getR2SignedUrl } from "@/lib/r2";
import { Role } from "@prisma/client";

export async function POST(_request: Request, { params }: { params: { fileId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const file = await prisma.file.findUnique({
    where: { id: params.fileId },
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

  if (
    session.user.role === Role.MEMBER &&
    file.createdById !== session.user.id &&
    !file.project.tasks.some((task) => task.assigneeId === session.user.id)
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const fileUrl = await getR2SignedUrl(file.key, 600);
  const { config, token, baseUrl } = buildOnlyOfficeConfig({
    fileKey: file.id,
    fileUrl,
    fileName: file.name,
    user: {
      id: session.user.id,
      name: session.user.name ?? session.user.email ?? "User",
    },
    permissions: { edit: session.user.role !== Role.MEMBER },
  });

  return NextResponse.json({ baseUrl, config, token });
}
