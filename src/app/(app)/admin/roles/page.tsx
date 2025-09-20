import { notFound } from "next/navigation";

import { RoleManager } from "@/components/admin/role-manager";
import type { RoleRecord } from "@/components/admin/user-table";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PERMISSION_OPTIONS } from "@/lib/roles";

const MANAGE_USERS = "MANAGE_USERS";

export default async function AdminRolesPage() {
  const session = await auth();
  if (!session?.user || !session.user.permissions.includes(MANAGE_USERS)) {
    notFound();
  }

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: { select: { action: true } },
    },
  });

  const roleRecords: RoleRecord[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description ?? null,
    isSystem: role.isSystem,
    permissions: role.permissions.map((permission) => permission.action),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Catalog"
        description="Control which capabilities are available to each command role."
      />
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleManager roles={roleRecords} defaultPermissions={PERMISSION_OPTIONS} />
        </CardContent>
      </Card>
    </div>
  );
}
