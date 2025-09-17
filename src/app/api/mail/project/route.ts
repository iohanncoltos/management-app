import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { sendProjectMail } from "@/lib/mail";
import { listProjectSummaries } from "@/lib/services/project-service";
import { rateLimit } from "@/lib/redis";
import { AuditEventType } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().cuid(),
  recipients: z.array(z.string().email()).min(1),
  subject: z.string().min(3),
  message: z.string().min(5),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const rate = await rateLimit({ key: `mail:${session.user.id}`, window: 60_000, limit: 5 });
  if (!rate.success) {
    return NextResponse.json({ message: "Rate limit exceeded" }, { status: 429 });
  }

  const project = (await listProjectSummaries()).find((item) => item.id === parsed.data.projectId);
  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  await sendProjectMail({
    projectCode: project.code,
    to: parsed.data.recipients,
    subject: parsed.data.subject,
    html: `<p>${parsed.data.message.replace(/\n/g, '<br />')}</p>`,
    text: parsed.data.message,
  });

  await recordAuditEvent({
    type: AuditEventType.PROJECT,
    entity: "project",
    entityId: project.id,
    userId: session.user.id,
    data: {
      action: "project-mail",
      recipients: parsed.data.recipients,
      subject: parsed.data.subject,
    },
  });

  return NextResponse.json({ ok: true });
}
