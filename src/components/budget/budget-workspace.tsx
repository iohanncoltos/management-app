"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Download, Upload, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { BudgetTable } from "./budget-table";
import { BudgetCharts } from "./budget-charts";
import { BudgetToolbar } from "./budget-toolbar";
import { AddLineDialog } from "./add-line-dialog";
import { DoughnutChart } from "@/components/charts/doughnut-chart";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ProjectSummary {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  description: string | null;
  planned: number | null;
  actual: number | null;
  owner: { id: string; name: string | null; email: string } | null;
  project: ProjectSummary | null;
}

interface BudgetLine {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  currency: string;
  vatPercent: number | null;
  supplier: string | null;
  link: string | null;
  notes: string | null;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface BudgetSheetSummary {
  id: string;
  vatDefault: number | null;
  currency: string;
}

interface BudgetTotals {
  total: number;
  totalsByCategory: Record<string, number>;
  linesCount: number;
}

interface BudgetApiResponse {
  sheet: {
    id: string;
    projectId: string | null;
    workspaceId: string | null;
    currency: string;
    vatDefault: number | null;
  } | null;
  project: {
    id?: string;
    code?: string;
    name?: string;
    status?: string;
    budgetPlanned?: number | null;
    budgetActual?: number | null;
  } | null;
  workspace: {
    id: string;
    name: string;
    description: string | null;
    planned: number | null;
    actual: number | null;
    owner?: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    project?: ProjectSummary | null;
  } | null;
  totals: BudgetTotals;
}

type BudgetWorkspaceProps = {
  context:
    | { type: "project"; project: ProjectSummary }
    | { type: "workspace"; workspace: WorkspaceSummary };
  canEdit: boolean;
};

const statusVariants: Record<string, { label: string; variant: "default" | "warning" | "success" | "danger" }> = {
  PLANNING: { label: "Planning", variant: "default" },
  ACTIVE: { label: "Active", variant: "success" },
  ON_HOLD: { label: "On Hold", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  CLOSED: { label: "Closed", variant: "default" },
};

export function BudgetWorkspace({ context, canEdit }: BudgetWorkspaceProps) {
  const router = useRouter();
  const contextKey = context.type === "project" ? "projectId" : "workspaceId";
  const targetId = context.type === "project" ? context.project.id : context.workspace.id;

  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [totals, setTotals] = useState<BudgetTotals>({
    total: 0,
    totalsByCategory: {},
    linesCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filters, setFilters] = useState<{ category: string | null; search: string; supplier: string }>({
    category: null,
    search: "",
    supplier: "",
  });
  const [sheet, setSheet] = useState<BudgetSheetSummary | null>(null);
  const [vatInput, setVatInput] = useState<string>("");
  const [isSavingVat, setIsSavingVat] = useState(false);
  const [plannedBudget, setPlannedBudget] = useState<number | null>(
    context.type === "workspace" ? context.workspace.planned ?? null : null,
  );
  const [plannedInput, setPlannedInput] = useState<string>(
    context.type === "workspace" && context.workspace.planned !== null
      ? String(context.workspace.planned)
      : "",
  );
  const [isSavingPlanned, setIsSavingPlanned] = useState(false);
  const [lastSyncedActual, setLastSyncedActual] = useState<number | null>(
    context.type === "workspace" ? context.workspace.actual ?? null : null,
  );

  const queryString = useMemo(() => `${contextKey}=${targetId}`, [contextKey, targetId]);

  const fetchBudgetData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [budgetResponse, linesResponse] = await Promise.all([
        fetch(`/api/budgets?${queryString}`),
        fetch(`/api/budgets/lines?${queryString}&limit=1000`),
      ]);

      if (budgetResponse.ok) {
        const budgetData: BudgetApiResponse = await budgetResponse.json();
        setTotals(budgetData.totals ?? { total: 0, totalsByCategory: {}, linesCount: 0 });

        if (budgetData.sheet) {
          const nextSheet: BudgetSheetSummary = {
            id: budgetData.sheet.id,
            vatDefault: budgetData.sheet.vatDefault,
            currency: budgetData.sheet.currency,
          };
          setSheet(nextSheet);
          setVatInput(
            typeof budgetData.sheet.vatDefault === "number" && !Number.isNaN(budgetData.sheet.vatDefault)
              ? String(budgetData.sheet.vatDefault)
              : "",
          );
        } else {
          setSheet(null);
          setVatInput("");
        }

        if (context.type === "project") {
          const planned = budgetData.project?.budgetPlanned ?? null;
          setPlannedBudget(planned);
          setPlannedInput(planned !== null ? String(planned) : "");
          const actual = budgetData.project?.budgetActual ?? null;
          setLastSyncedActual(actual);
        } else {
          const workspace = budgetData.workspace ?? null;
          const planned = workspace?.planned ?? null;
          setPlannedBudget(planned);
          setPlannedInput(planned !== null ? String(planned) : "");
          const actual = workspace?.actual ?? null;
          setLastSyncedActual(actual);
        }
      }

      if (linesResponse.ok) {
        const linesData = await linesResponse.json();
        setLines(linesData.lines ?? []);
      }
    } catch (error) {
      console.error("Error fetching budget data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [context.type, queryString]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  const handleLineAdded = (newLine: BudgetLine) => {
    setLines((prev) => [newLine, ...prev]);
    fetchBudgetData();
    setShowAddDialog(false);
  };

  const handleLineUpdated = (updatedLine: BudgetLine) => {
    setLines((prev) => prev.map((line) => (line.id === updatedLine.id ? updatedLine : line)));
    fetchBudgetData();
  };

  const handleLineDeleted = (deletedLineId: string) => {
    setLines((prev) => prev.filter((line) => line.id !== deletedLineId));
    fetchBudgetData();
  };

  const handlePlannedSave = async () => {
    if (!canEdit || isSavingPlanned) {
      return;
    }

    const trimmed = plannedInput.trim();
    let parsed: number | null = null;
    if (trimmed !== "") {
      const numeric = Number(trimmed);
      if (Number.isNaN(numeric) || numeric < 0) {
        toast.error("Enter a valid planned budget amount");
        return;
      }
      parsed = numeric;
    }

    setIsSavingPlanned(true);
    try {
      if (context.type === "project") {
        const response = await fetch(`/api/projects/${context.project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budgetPlanned: parsed ?? 0 }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? "Unable to update planned budget");
        }

        const updated = await response.json();
        const nextPlanned = typeof updated.budgetPlanned === "number" ? updated.budgetPlanned : null;
        setPlannedBudget(nextPlanned);
        setPlannedInput(nextPlanned !== null ? String(nextPlanned) : "");
      } else {
        const response = await fetch(`/api/budgets/workspaces/${context.workspace.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planned: parsed }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? "Unable to update planned budget");
        }

        const updated = await response.json();
        const nextPlanned = typeof updated.planned === "number" ? updated.planned : null;
        setPlannedBudget(nextPlanned);
        setPlannedInput(nextPlanned !== null ? String(nextPlanned) : "");
      }

      toast.success("Planned budget updated");
      fetchBudgetData();
    } catch (error) {
      console.error("Error updating planned budget:", error);
      toast.error(error instanceof Error ? error.message : "Unable to update planned budget");
    } finally {
      setIsSavingPlanned(false);
    }
  };

  const handleVatSave = async () => {
    if (!canEdit || isSavingVat) return;

    const trimmed = vatInput.trim();
    let parsed: number | null = null;
    if (trimmed !== "") {
      const numeric = Number(trimmed);
      if (Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
        toast.error("Enter a VAT percentage between 0 and 100.");
        return;
      }
      parsed = numeric;
    }

    setIsSavingVat(true);
    try {
      const response = await fetch("/api/budgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [contextKey]: targetId, vatPercent: parsed }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to update VAT");
      }

      const updated: { id: string; vatDefault: number | null; currency: string } = await response.json();
      setSheet(updated);
      setVatInput(
        typeof updated.vatDefault === "number" && !Number.isNaN(updated.vatDefault)
          ? String(updated.vatDefault)
          : "",
      );
      toast.success("Default VAT updated");
      await fetchBudgetData();
    } catch (error) {
      console.error("Error updating VAT:", error);
      toast.error(error instanceof Error ? error.message : "Unable to update VAT");
    } finally {
      setIsSavingVat(false);
    }
  };

  useEffect(() => {
    if (!canEdit || !sheet) {
      return;
    }

    const actual = Number.isFinite(totals.total) ? Number(totals.total) : 0;
    if (lastSyncedActual !== null && Math.abs(actual - lastSyncedActual) < 0.01) {
      return;
    }

    let cancelled = false;

    const syncActual = async () => {
      try {
        if (context.type === "project") {
          const response = await fetch(`/api/projects/${context.project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ budgetActual: actual }),
          });

          if (!response.ok) {
            return;
          }
        } else {
          const response = await fetch(`/api/budgets/workspaces/${context.workspace.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actual }),
          });

          if (!response.ok) {
            return;
          }
        }

        if (!cancelled) {
          setLastSyncedActual(actual);
        }
      } catch (error) {
        console.error("Failed to sync actual spend", error);
      }
    };

    syncActual();

    return () => {
      cancelled = true;
    };
  }, [totals.total, context, canEdit, sheet, lastSyncedActual]);

  const filteredLines = lines.filter((line) => {
    if (filters.category && line.category !== filters.category) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        line.name.toLowerCase().includes(searchLower) ||
        line.notes?.toLowerCase().includes(searchLower) ||
        line.supplier?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    if (filters.supplier && !line.supplier?.toLowerCase().includes(filters.supplier.toLowerCase())) {
      return false;
    }
    return true;
  });

  const headerTitle = context.type === "project" ? context.project.name : context.workspace.name;
  const headerSubtitle = context.type === "project"
    ? `${context.project.code} - Budget Management`
    : context.workspace.description ?? "Custom budget workspace";

  const status = context.type === "project"
    ? statusVariants[context.project.status] ?? statusVariants.PLANNING
    : null;

  const workspaceOwnerLabel =
    context.type === "workspace"
      ? context.workspace.owner?.name ?? context.workspace.owner?.email ?? null
      : null;

  const handleNavigateToProject = () => {
    if (context.type === "workspace" && context.workspace.project) {
      router.push(`/budget/${context.workspace.project.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/budget" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Budgets
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-2xl font-bold">{headerTitle}</h1>
              <p className="text-muted-foreground">{headerSubtitle}</p>
            </div>
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {context.type === "project" && status ? <Badge variant={status.variant}>{status.label}</Badge> : null}
            {context.type === "workspace" ? <Badge variant="outline">Custom Workspace</Badge> : null}
            {context.type === "workspace" && context.workspace.project ? (
              <Button variant="outline" size="sm" onClick={handleNavigateToProject}>
                View Project Budget
              </Button>
            ) : null}
            {context.type === "workspace" && workspaceOwnerLabel ? (
              <Badge variant="outline">Owner: {workspaceOwnerLabel}</Badge>
            ) : null}
            {canEdit && (
              <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Line Item
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-9">
          <BudgetToolbar
            canEdit={canEdit}
            context={{ queryKey: contextKey, targetId }}
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={fetchBudgetData}
          />

          <Card>
            <CardHeader>
              <CardTitle>Budget Line Items ({filteredLines.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <BudgetTable
                lines={filteredLines}
                isLoading={isLoading}
                canEdit={canEdit}
                defaultVat={sheet?.vatDefault ?? null}
                onLineUpdate={handleLineUpdated}
                onLineDelete={handleLineDeleted}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget Health</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <DoughnutChart
                data={{
                  labels: ["Planned", "Actual"],
                  datasets: [
                    {
                      data: [plannedBudget ?? 0, totals.total],
                      backgroundColor: ["#3a7bd5", "#b03636"],
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: { position: "top" },
                  },
                }}
                size={160}
              />

              <div className="grid w-full gap-3 text-sm text-muted-foreground md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide">Planned Budget</p>
                  <p className="text-lg font-semibold text-foreground">
                    €{(plannedBudget ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">Actual Spend</p>
                  <p className="text-lg font-semibold text-foreground">
                    €{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">Variance</p>
                  <p
                    className={`text-lg font-semibold ${
                      plannedBudget !== null && plannedBudget > 0 && totals.total > plannedBudget
                        ? "text-destructive"
                        : "text-chart-teal"
                    }`}
                  >
                    {plannedBudget !== null && plannedBudget > 0
                      ? `${(((totals.total - plannedBudget) / plannedBudget) * 100).toFixed(1)}%`
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Budget Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">
                  €{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
              </div>

              <div className="space-y-2">
                {Object.entries(totals.totalsByCategory).map(([category, amount]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="capitalize">{category.toLowerCase()}</span>
                    <span className="font-semibold">€{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Line Items</span>
                  <span className="font-semibold">{totals.linesCount}</span>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Default VAT (%)</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={vatInput}
                    onChange={(event) => setVatInput(event.target.value)}
                    className="w-24"
                    disabled={!canEdit || isSavingVat}
                  />
                  <Button size="sm" onClick={handleVatSave} disabled={!canEdit || isSavingVat}>
                    {isSavingVat ? "Saving" : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Applied automatically to every line item in this budget.</p>
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Planned Budget (€)</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={plannedInput}
                    onChange={(event) => setPlannedInput(event.target.value)}
                    className="w-28"
                    disabled={!canEdit || isSavingPlanned}
                  />
                  <Button size="sm" onClick={handlePlannedSave} disabled={!canEdit || isSavingPlanned}>
                    {isSavingPlanned ? "Saving" : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Used to monitor variance between planned and actual spend.</p>
              </div>
            </CardContent>
          </Card>

          <BudgetCharts totals={totals} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line Item
                </Button>
              )}

              <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>

              {canEdit && (
                <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                  <Upload className="mr-2 h-4 w-4" />
                  Import from Excel
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddLineDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        context={{ queryKey: contextKey, targetId }}
        onLineAdded={handleLineAdded}
      />
    </div>
  );
}
