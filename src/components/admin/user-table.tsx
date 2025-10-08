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
    <div className="space-y-4">
      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            No operators found.
          </div>
        ) : (
          rows.map((user) => {
            const assignedRole = user.role ? roleMap.get(user.role.id) ?? user.role : null;
            return (
              <div key={user.id} className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                <div className="flex flex-col gap-1">
                  <p className="text-base font-semibold text-foreground">{user.name ?? "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="mt-2 break-all text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground/80">Role</span>
                  {assignedRole ? (
                    <Badge variant={assignedRole.isSystem ? "default" : "outline"}>{assignedRole.name}</Badge>
                  ) : (
                    <Badge variant="outline">Unassigned</Badge>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Permissions</p>
                  <div className="flex flex-wrap gap-2">
                    {(assignedRole?.permissions ?? []).length === 0 ? (
                      <span className="text-xs text-muted-foreground">None assigned</span>
                    ) : (
                      assignedRole?.permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Select
                    defaultValue={assignedRole?.id ?? UNASSIGNED_VALUE}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                    disabled={isPending || user.id === currentUserId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Assign role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assignedRole ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-center text-xs">
                          Role Details
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
              </div>
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Name</TableHead>
              <TableHead className="min-w-[180px]">Email</TableHead>
              <TableHead className="min-w-[120px]">Role</TableHead>
              <TableHead className="hidden min-w-[200px] lg:table-cell">Permissions</TableHead>
              <TableHead className="min-w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((user) => {
              const assignedRole = user.role ? roleMap.get(user.role.id) ?? user.role : null;
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{user.name ?? "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    {assignedRole ? (
                      <Badge variant={assignedRole.isSystem ? "default" : "outline"}>{assignedRole.name}</Badge>
                    ) : (
                      <Badge variant="outline">Unassigned</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
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
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <Select
                        defaultValue={assignedRole?.id ?? UNASSIGNED_VALUE}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                        disabled={isPending || user.id === currentUserId}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="Assign role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
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
      </div>
    </div>
  );
}
