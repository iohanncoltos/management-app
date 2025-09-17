import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });
}

export async function listAssignableUsers(currentUserId: string, role: Role) {
  if (role === Role.MEMBER) {
    return prisma.user.findMany({
      where: { id: currentUserId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  }
  return listUsers();
}

export async function updateUserRole(userId: string, role: Role) {
  return prisma.user.update({ where: { id: userId }, data: { role } });
}
