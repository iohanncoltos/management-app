import { AuditEventType, Prisma } from "@prisma/client";
import { prisma } from "./db";

interface AuditParams {
  userId?: string;
  type: AuditEventType;
  entity: string;
  entityId: string;
  data?: Record<string, unknown> | null;
}

export async function recordAuditEvent({
  userId,
  type,
  entity,
  entityId,
  data,
}: AuditParams) {
  try {
    await prisma.auditEvent.create({
      data: {
        userId,
        type,
        entity,
        entityId,
        data: data ?? Prisma.JsonNull,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to create audit event", error);
    }
  }
}
