import { NextResponse } from "next/server";
import { addDays } from "date-fns";

import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { sendProjectMail } from "@/lib/mail";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.server.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const upcoming = await prisma.task.findMany({
    where: {
      progress: { lt: 100 },
      end: {
        lte: addDays(new Date(), 1),
      },
    },
    include: {
      project: { select: { code: true, name: true, id: true } },
      assignee: { select: { email: true, name: true } },
    },
  });

  for (const task of upcoming) {
    if (!task.assignee?.email) continue;

    await sendProjectMail({
      projectCode: task.project.code,
      to: task.assignee.email,
      subject: `Task due: ${task.title}`,
      html: `<p>Mission ${task.project.name} task <strong>${task.title}</strong> is due ${task.end.toDateString()}.</p>`,
      text: `Mission ${task.project.name} task ${task.title} is due ${task.end.toDateString()}.`,
    });
  }

  return NextResponse.json({ processed: upcoming.length });
}
