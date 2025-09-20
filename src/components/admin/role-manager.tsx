"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Lock, PenLine, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { RoleRecord } from "./user-table";

type RoleManagerProps = {
  roles: RoleRecord[];
  defaultPermissions: { value: string; label: string }[];
};

type DialogMode = "create" | "edit";

type FormState = {
  id: string | null;
  name: string;
  description: string;
  permissions: string[];
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  description: "",
  permissions: [],
};

export function RoleManager({ roles: initialRoles, defaultPermissions }: RoleManagerProps) {
  const [roles, setRoles] = useState(initialRoles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [customPermission, setCustomPermission] = useState("");
  const [isPending, startTransition] = useTransition();

  const permissionOptions = useMemo(() => {
    const map = new Map<string, string>();
    defaultPermissions.forEach((permission) => {
      map.set(permission.value, permission.label);
    });
    roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        if (!map.has(permission)) {
          map.set(permission, permission.replace(/_/g, " "));
        }
      });
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [defaultPermissions, roles]);

  const openCreateDialog = () => {
    setDialogMode("create");
    setFormState(EMPTY_FORM);
    setCustomPermission("");
    setDialogOpen(true);
  };

  const openEditDialog = (role: RoleRecord) => {
    setDialogMode("edit");
    setFormState({
      id: role.id,
      name: role.name,
      description: role.description ?? "",
      permissions: role.permissions,
    });
    setCustomPermission("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setFormState(EMPTY_FORM);
    setCustomPermission("");
  };

  const togglePermission = (permission: string, enabled: boolean) => {
    setFormState((previous) => {
      const next = new Set(previous.permissions);
      if (enabled) {
        next.add(permission);
      } else {
        next.delete(permission);
      }
      return { ...previous, permissions: Array.from(next) };
    });
  };

  const normalizePermission = (permission: string) =>
    permission
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/gi, "")
      .toUpperCase();

  const addCustomPermission = () => {
    const normalized = normalizePermission(customPermission);
    if (!normalized) {
      return;
    }
    togglePermission(normalized, true);
    setCustomPermission("");
  };

  const handleSubmit = () => {
    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim() || null,
      permissions: formState.permissions,
    };

    if (!payload.name) {
      toast.error("Role name is required");
      return;
    }

    startTransition(async () => {
      try {
        if (dialogMode === "create") {
          const response = await fetch("/api/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message ?? "Unable to create role");
          }

          const created = await response.json();
          const normalized: RoleRecord = {
            id: created.id,
            name: created.name,
            description: created.description ?? null,
            isSystem: created.isSystem,
            permissions: created.permissions.map((permission: { action: string }) => permission.action),
          };
          setRoles((previous) => [...previous, normalized]);
          toast.success("Role created");
        } else {
          if (!formState.id) return;
          const response = await fetch(`/api/roles/${formState.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message ?? "Unable to update role");
          }

          const updated = await response.json();
          const normalized: RoleRecord = {
            id: updated.id,
            name: updated.name,
            description: updated.description ?? null,
            isSystem: updated.isSystem,
            permissions: updated.permissions.map((permission: { action: string }) => permission.action),
          };
          setRoles((previous) => previous.map((role) => (role.id === normalized.id ? normalized : role)));
          toast.success("Role updated");
        }
        closeDialog();
      } catch (error) {
        toast.error("Save failed", {
          description: error instanceof Error ? error.message : "Try again shortly.",
        });
      }
    });
  };

  const deleteRole = (roleId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/roles/${roleId}`, { method: "DELETE" });
        if (!response.ok && response.status !== 204) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message ?? "Unable to delete role");
        }

        setRoles((previous) => previous.filter((role) => role.id !== roleId));
        toast.success("Role removed");
      } catch (error) {
        toast.error("Delete failed", {
          description: error instanceof Error ? error.message : "Try again shortly.",
        });
      }
    });
  };

  const sortedRoles = useMemo(
    () =>
      [...roles].sort((a, b) => {
        if (a.isSystem && !b.isSystem) return -1;
        if (!a.isSystem && b.isSystem) return 1;
        return a.name.localeCompare(b.name);
      }),
    [roles],
  );

  const disableSubmit = isPending || formState.permissions.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage custom command roles and their associated permissions. System roles are read-only.
        </p>
        <Button onClick={openCreateDialog} disabled={isPending}>
          <Plus className="mr-2 h-4 w-4" /> New Role
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRoles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium text-foreground">{role.name}</TableCell>
              <TableCell>
                <Badge variant={role.isSystem ? "default" : "outline"} className="gap-1">
                  {role.isSystem ? (
                    <Lock className="h-3 w-3" />
                  ) : null}
                  {role.isSystem ? "System" : "Custom"}
                </Badge>
              </TableCell>
              <TableCell className="max-w-sm truncate text-sm text-muted-foreground">
                {role.description ?? "�"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((permission) => (
                    <Badge key={permission} variant="outline" className="text-xs">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(role)}
                    disabled={role.isSystem}
                  >
                    <PenLine className="h-4 w-4" />
                    <span className="sr-only">Edit role</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteRole(role.id)}
                    disabled={role.isSystem || isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete role</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={(open) => (!open ? closeDialog() : setDialogOpen(true))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Create Role" : "Edit Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="role-name">Name</Label>
              <Input
                id="role-name"
                value={formState.name}
                onChange={(event) => setFormState((previous) => ({ ...previous, name: event.target.value }))}
                placeholder="e.g. QUALITY_ASSURANCE"
                disabled={dialogMode === "edit" && roles.find((role) => role.id === formState.id)?.isSystem}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                value={formState.description}
                onChange={(event) => setFormState((previous) => ({ ...previous, description: event.target.value }))}
                placeholder="What responsibilities does this role have?"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="rounded-2xl border border-border/60 p-3">
                <div className="grid gap-2">
                  {permissionOptions.map((option) => {
                    const checked = formState.permissions.includes(option.value);
                    return (
                      <label key={option.value} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{option.value}</span>
                          <span className="text-xs text-muted-foreground">{option.label}</span>
                        </div>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => togglePermission(option.value, Boolean(value))}
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    placeholder="Add custom permission"
                    value={customPermission}
                    onChange={(event) => setCustomPermission(event.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={addCustomPermission} disabled={!customPermission.trim()}>
                    Add
                  </Button>
                </div>
                {formState.permissions.length === 0 ? (
                  <p className="mt-2 text-xs text-destructive">Select at least one permission.</p>
                ) : null}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={disableSubmit}>
              {isPending ? "Saving..." : dialogMode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
