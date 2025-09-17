"use client";

import { useRouter } from "next/navigation";

import { Role } from "@prisma/client";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

interface UserTableProps {
  users: AdminUser[];
  currentUserId: string;
}

export function UserTable({ users, currentUserId }: UserTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const updateRole = (userId: string, role: Role) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "Unable to update role");
        }

        toast.success("Role updated");
        router.refresh();
      } catch (error) {
        toast.error("Update failed", {
          description: error instanceof Error ? error.message : "Try again soon.",
        });
      }
    });
  };

  const roleOptions: Role[] = [Role.ADMIN, Role.PM, Role.MEMBER];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium text-foreground">{user.name}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === Role.ADMIN ? "danger" : user.role === Role.PM ? "warning" : "default"}>
                {user.role}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(user.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <Select
                defaultValue={user.role}
                onValueChange={(value) => updateRole(user.id, value as Role)}
                disabled={user.id === currentUserId || isPending}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
