import { prisma } from "@/lib/db";

export async function getRecentAuditEvents(limit = 20) {
  return prisma.auditEvent.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}
