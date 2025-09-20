import { notFound } from "next/navigation";

import { UserTable, type RoleRecord, type UserRecord } from "@/components/admin/user-table";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listUsers } from "@/lib/services/user-service";

const MANAGE_USERS = "MANAGE_USERS";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || !session.user.permissions.includes(MANAGE_USERS)) {
    notFound();
  }

  const [users, roles] = await Promise.all([
    listUsers(),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        permissions: { select: { action: true } },
      },
    }),
  ]);

  const roleRecords: RoleRecord[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description ?? null,
    isSystem: role.isSystem,
    permissions: role.permissions.map((permission) => permission.action),
  }));

  const userRecords: UserRecord[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : new Date(user.createdAt).toISOString(),
    role: user.role
      ? {
          id: user.role.id,
          name: user.role.name,
          description: user.role.description ?? null,
          isSystem: user.role.isSystem,
          permissions: user.role.permissions.map((permission) => permission.action),
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Access Control"
        description="Assign mission control roles and manage operator permissions."
      />
      <Card>
        <CardHeader>
          <CardTitle>Operators</CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable users={userRecords} roles={roleRecords} currentUserId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
