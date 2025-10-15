import { prisma } from "@/lib/db";

const userSelection = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  cvUrl: true,
  cvFileName: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: { select: { action: true } },
    },
  },
} as const;

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: userSelection,
  });
}

export async function listAssignableUsers(currentUserId: string, permissions: string[]) {
  const canAssignAll = permissions.includes("ASSIGN_TASKS");
  if (!canAssignAll) {
    return prisma.user.findMany({
      where: { id: currentUserId },
      select: userSelection,
    });
  }

  return listUsers();
}

export async function updateUserRole(userId: string, roleId: string | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { roleId },
    select: userSelection,
  });
}
