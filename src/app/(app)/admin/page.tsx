import { notFound } from "next/navigation";

import { UserTable } from "@/components/admin/user-table";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { listUsers } from "@/lib/services/user-service";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const users = await listUsers();

  const normalized = users.map((user) => ({
    ...user,
    createdAt: new Date(user.createdAt ?? new Date()).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Control"
        description="Manage operator clearance levels across Intermax missions."
      />
      <Card>
        <CardHeader>
          <CardTitle>Operators</CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable users={normalized} currentUserId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
