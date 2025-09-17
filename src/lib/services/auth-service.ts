import { Role } from "@prisma/client";
import { randomBytes } from "crypto";
import { addMinutes } from "date-fns";

import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mail";
import { recordAuditEvent } from "@/lib/audit";
import { AuditEventType } from "@prisma/client";

const RESET_EXPIRY_MINUTES = 30;

export async function registerUser({
  name,
  email,
  password,
  role,
  createdById,
}: {
  name: string;
  email: string;
  password: string;
  role?: Role;
  createdById?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already in use");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role ?? Role.MEMBER,
    },
  });

  await recordAuditEvent({
    type: AuditEventType.USER,
    entity: "user",
    entityId: user.id,
    userId: createdById ?? user.id,
    data: { action: "register", role: user.role },
  });

  return user;
}

export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("User not found");
  }

  const token = randomBytes(32).toString("hex");
  const expires = addMinutes(new Date(), RESET_EXPIRY_MINUTES);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expires,
    },
  });

  await sendPasswordResetEmail({ to: email, token });

  await recordAuditEvent({
    type: AuditEventType.AUTH,
    entity: "user",
    entityId: user.id,
    userId: user.id,
    data: { action: "reset-request" },
  });
}

export async function resetPasswordWithToken(token: string, password: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) {
    throw new Error("Reset token invalid or expired");
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  await recordAuditEvent({
    type: AuditEventType.AUTH,
    entity: "user",
    entityId: record.userId,
    userId: record.userId,
    data: { action: "reset-confirm" },
  });
}
