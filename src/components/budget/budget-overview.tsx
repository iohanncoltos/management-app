"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calculator, ExternalLink, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface ProjectSummary {
  id: string;
  name: string;
  code: string;
  status: string;
  budgetPlanned: number | null;
  budgetActual: number | null;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  description: string | null;
  planned: number | null;
  actual: number | null;
  owner: { id: string; name: string | null; email: string } | null;
  project: { id: string; name: string; code: string; status: string } | null;
}

interface BudgetOverviewProps {
  projects: ProjectSummary[];
  workspaces: WorkspaceSummary[];
  canCreateWorkspace: boolean;
  currentUserId: string;
}

const statusVariants: Record<string, { label: string; variant: "default" | "warning" | "success" | "danger" }> = {
  PLANNING: { label: "Planning", variant: "default" },
  ACTIVE: { label: "Active", variant: "success" },
  ON_HOLD: { label: "On Hold", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  CLOSED: { label: "Closed", variant: "default" },
};

export function BudgetOverview({ projects, workspaces, canCreateWorkspace, currentUserId }: BudgetOverviewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(projects.length > 0 ? "projects" : "custom");
  const [workspaceList, setWorkspaceList] = useState(workspaces);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreateWorkspace = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/budgets/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? "Unable to create workspace");
        }

        const workspace: WorkspaceSummary = await response.json();
        setWorkspaceList((prev) => [workspace, ...prev]);
        toast.success("Workspace created", { description: "Redirecting to budget editor" });
        setDialogOpen(false);
        setName("");
        setDescription("");
        router.push(`/budget/workspaces/${workspace.id}`);
      } catch (error) {
        console.error("Failed to create workspace", error);
        toast.error(error instanceof Error ? error.message : "Unable to create workspace");
      }
    });
  };

  const myWorkspaces = useMemo(
    () => workspaceList.filter((workspace) => workspace.owner?.id === currentUserId),
    [workspaceList, currentUserId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Management"
        description="Switch between project budgets and custom workspaces to plan, track, and reconcile spending."
        actions={
          canCreateWorkspace ? (
            <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Workspace
            </Button>
          ) : null
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start gap-2 overflow-x-auto">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Project Budgets
            <Badge variant="outline" className="ml-1">{projects.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Custom Workspaces
            <Badge variant="outline" className="ml-1">{workspaceList.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calculator className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No Projects Available</h3>
                <p className="mb-4 text-muted-foreground">You need access to projects to manage their budgets.</p>
                <Button asChild>
                  <Link href="/projects">View Projects</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => {
                const status = statusVariants[project.status] ?? statusVariants.PLANNING;
                const planned = project.budgetPlanned ?? 0;
                const actual = project.budgetActual ?? 0;
                const variance = planned > 0 ? ((actual - planned) / planned) * 100 : 0;

                return (
                  <Card key={project.id} className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <CardTitle className="truncate text-lg">{project.name}</CardTitle>
                          <p className="font-mono text-sm text-muted-foreground">{project.code}</p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Planned Budget</span>
                          <span className="font-semibold">€{planned.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Current Spend</span>
                          <span className="font-semibold">€{actual.toLocaleString()}</span>
                        </div>
                        {planned > 0 ? (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Variance</span>
                            <span
                              className={`font-semibold ${
                                variance > 10 ? "text-destructive" : variance > 0 ? "text-warning" : "text-chart-teal"
                              }`}
                            >
                              {variance > 0 ? "+" : ""}
                              {variance.toFixed(1)}%
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <Button asChild className="w-full">
                        <Link href={`/budget/${project.id}`} className="inline-flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          Manage Budget
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          {workspaceList.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No Custom Workspaces</h3>
                <p className="text-muted-foreground">
                  Create dedicated budget workbooks for initiatives that are not tied to a single project.
                </p>
                {canCreateWorkspace ? (
                  <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workspace
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workspaceList.map((workspace) => {
                const planned = workspace.planned ?? 0;
                const actual = workspace.actual ?? 0;
                const variance = planned > 0 ? ((actual - planned) / planned) * 100 : 0;
                const isMine = workspace.owner?.id === currentUserId;

                return (
                  <Card key={workspace.id} className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <CardTitle className="truncate text-lg">{workspace.name}</CardTitle>
                          {workspace.project ? (
                            <p className="text-sm text-muted-foreground">
                              Linked Project: <span className="font-medium">{workspace.project.code}</span>
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Standalone workspace</p>
                          )}
                        </div>
                        {isMine ? <Badge variant="outline">Mine</Badge> : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {workspace.description ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{workspace.description}</p>
                      ) : null}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Planned</span>
                          <span className="font-semibold">€{planned.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Actual</span>
                          <span className="font-semibold">€{actual.toLocaleString()}</span>
                        </div>
                        {planned > 0 ? (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Variance</span>
                            <span
                              className={`font-semibold ${
                                variance > 10 ? "text-destructive" : variance > 0 ? "text-warning" : "text-chart-teal"
                              }`}
                            >
                              {variance > 0 ? "+" : ""}
                              {variance.toFixed(1)}%
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <Button asChild className="w-full">
                        <Link href={`/budget/workspaces/${workspace.id}`} className="inline-flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Open Workspace
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {myWorkspaces.length > 0 ? (
            <div className="rounded-2xl border border-border/60 bg-secondary/50 p-4 text-sm text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">Your Workspaces</p>
              <p>
                {myWorkspaces.length} workspace{myWorkspaces.length === 1 ? "" : "s"} owned by you. Use them to plan lab
                equipment, operational spend, or any ad-hoc initiative.
              </p>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Budget Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g., Lab Fit-Out" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional context for this workspace"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={isPending}>
              {isPending ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
