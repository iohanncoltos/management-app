import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { getRecentAuditEvents } from "@/lib/services/audit-service";

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const events = await getRecentAuditEvents(50);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {event.createdAt.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {event.user?.name ?? "System"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {event.entity} — {event.entityId}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {event.data ? JSON.stringify(event.data) : event.type}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
