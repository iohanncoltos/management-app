"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const UNASSIGNED_VALUE = "__none";

export type RoleRecord = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
};

export type UserRecord = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  role: RoleRecord | null;
};

interface UserTableProps {
  users: UserRecord[];
  roles: RoleRecord[];
  currentUserId: string;
}

export function UserTable({ users, roles, currentUserId }: UserTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(users);

  const roleMap = useMemo(() => {
    const map = new Map<string, RoleRecord>();
    roles.forEach((role) => map.set(role.id, role));
    return map;
  }, [roles]);

  const handleRoleChange = (userId: string, nextRoleId: string) => {
    const roleId = nextRoleId === UNASSIGNED_VALUE ? null : nextRoleId;
    startTransition(async () => {
      try {
        const response = await fetch(`/api/users/${userId}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleId }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? "Unable to update role");
        }

        const payload = await response.json();
        const nextRole = payload.role
          ? {
              id: payload.role.id,
              name: payload.role.name,
              description: payload.role.description,
              isSystem: payload.role.isSystem,
              permissions: payload.role.permissions.map((permission: { action: string }) => permission.action),
            }
          : null;

        setRows((previous) =>
          previous.map((user) =>
            user.id === userId
              ? { ...user, role: nextRole }
              : user,
          ),
        );

        toast.success("Role updated");
        router.refresh();
      } catch (error) {
        toast.error("Update failed", {
          description: error instanceof Error ? error.message : "Try again soon.",
        });
      }
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Permissions</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((user) => {
          const assignedRole = user.role ? roleMap.get(user.role.id) ?? user.role : null;
          return (
            <TableRow key={user.id}>
              <TableCell>
                <div className="font-medium text-foreground">{user.name ?? "Unnamed"}</div>
                <div className="text-xs text-muted-foreground">Joined {new Date(user.createdAt).toLocaleDateString()}</div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                {assignedRole ? (
                  <Badge variant={assignedRole.isSystem ? "default" : "outline"}>{assignedRole.name}</Badge>
                ) : (
                  <Badge variant="outline">Unassigned</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(assignedRole?.permissions ?? []).slice(0, 3).map((permission) => (
                    <Badge key={permission} variant="outline" className="text-xs">
                      {permission}
                    </Badge>
                  ))}
                  {(assignedRole?.permissions?.length ?? 0) > 3 ? (
                    <Badge variant="outline" className="text-xs">
                      +{(assignedRole?.permissions?.length ?? 0) - 3}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Select
                    defaultValue={assignedRole?.id ?? UNASSIGNED_VALUE}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                    disabled={isPending || user.id === currentUserId}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Assign role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                          {role.isSystem ? " �" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assignedRole ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{assignedRole.name}</DialogTitle>
                          <DialogDescription>
                            {assignedRole.description ?? "No description provided."}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-foreground">Permissions</p>
                          <div className="flex flex-wrap gap-2">
                            {assignedRole.permissions.length === 0 ? (
                              <span className="text-sm text-muted-foreground">None</span>
                            ) : (
                              assignedRole.permissions.map((permission) => (
                                <Badge key={permission} variant="outline" className="text-xs">
                                  {permission}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
