import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { createFileRecord } from "@/lib/services/file-service";
import { uploadToR2 } from "@/lib/r2";
import { AuditEventType } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const projectId = formData.get("projectId");

  if (!(file instanceof File) || typeof projectId !== "string") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const key = `projects/${projectId}/${Date.now()}-${file.name}`;

  await uploadToR2({
    key,
    contentType: file.type || "application/octet-stream",
    body: buffer,
  });

  const record = await createFileRecord({
    projectId,
    name: file.name,
    key,
    mime: file.type || "application/octet-stream",
    size: file.size,
    createdById: session.user.id,
  });

  await recordAuditEvent({
    type: AuditEventType.FILE,
    entity: "file",
    entityId: record.id,
    userId: session.user.id,
    data: { action: "upload", projectId },
  });

  return NextResponse.json(record, { status: 201 });
}
