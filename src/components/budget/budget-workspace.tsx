"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Download, Upload, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DoughnutChart } from "@/components/charts/doughnut-chart";

import { BudgetTable } from "./budget-table";
import { BudgetCharts } from "./budget-charts";
import { BudgetToolbar } from "./budget-toolbar";
import { AddLineDialog } from "./add-line-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface BudgetLine {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string | null;
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

interface BudgetWorkspaceProps {
  project: Project;
  canEdit: boolean;
}

export function BudgetWorkspace({ project, canEdit }: BudgetWorkspaceProps) {
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
  const [plannedBudget, setPlannedBudget] = useState<number | null>(null);
  const [plannedInput, setPlannedInput] = useState<string>("");
  const [isSavingPlanned, setIsSavingPlanned] = useState(false);
  const [lastSyncedActual, setLastSyncedActual] = useState<number | null>(null);

  const fetchBudgetData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [budgetResponse, linesResponse] = await Promise.all([
        fetch(`/api/budgets?projectId=${project.id}`),
        fetch(`/api/budgets/lines?projectId=${project.id}&limit=1000`),
      ]);

      if (budgetResponse.ok) {
        const budgetData = await budgetResponse.json();
        setTotals(budgetData.totals);
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
              : ""
          );
        } else {
          setSheet(null);
          setVatInput("");
        }

        if (budgetData.project) {
          const planned = budgetData.project.budgetPlanned ?? null;
          setPlannedBudget(planned);
          setPlannedInput(planned !== null ? String(planned) : "");

          const actual = budgetData.project.budgetActual ?? null;
          setLastSyncedActual(actual);
        } else {
          setPlannedBudget(null);
          setPlannedInput("");
          setLastSyncedActual(null);
        }
      }

      if (linesResponse.ok) {
        const linesData = await linesResponse.json();
        setLines(linesData.lines);
      }
    } catch (error) {
      console.error("Error fetching budget data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  const handleLineAdded = (newLine: BudgetLine) => {
    setLines(prev => [newLine, ...prev]);
    fetchBudgetData(); // Refresh totals
    setShowAddDialog(false);
  };

  const handleLineUpdated = (updatedLine: BudgetLine) => {
    setLines(prev => prev.map(line => line.id === updatedLine.id ? updatedLine : line));
    fetchBudgetData(); // Refresh totals
  };

  const handleLineDeleted = (deletedLineId: string) => {
    setLines(prev => prev.filter(line => line.id !== deletedLineId));
    fetchBudgetData(); // Refresh totals
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
      const response = await fetch(`/api/projects/${project.id}`, {
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
        body: JSON.stringify({ projectId: project.id, vatPercent: parsed }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to update VAT");
      }

      const updated: { id: string; vatDefault: number | null; currency: string } = await response.json();
      setSheet(updated);
      setVatInput(
        typeof updated.vatDefault === "number" && !Number.isNaN(updated.vatDefault) ? String(updated.vatDefault) : ""
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
        const response = await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budgetActual: actual }),
        });

        if (!response.ok) {
          return;
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
  }, [totals.total, project.id, canEdit, sheet, lastSyncedActual]);

  const filteredLines = lines.filter(line => {
    if (filters.category && line.category !== filters.category) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = line.name.toLowerCase().includes(searchLower) ||
                           line.notes?.toLowerCase().includes(searchLower) ||
                           line.supplier?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    if (filters.supplier && !line.supplier?.toLowerCase().includes(filters.supplier.toLowerCase())) {
      return false;
    }
    return true;
  });

  const statusVariants: Record<string, { label: string; variant: "default" | "warning" | "success" | "danger" }> = {
    PLANNING: { label: "Planning", variant: "default" },
    ACTIVE: { label: "Active", variant: "success" },
    ON_HOLD: { label: "On Hold", variant: "warning" },
    COMPLETED: { label: "Completed", variant: "success" },
    CLOSED: { label: "Closed", variant: "default" },
  };

  const status = statusVariants[project.status] ?? statusVariants.PLANNING;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/budget" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Projects
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground">{project.code} - Budget Management</p>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
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
        {/* Main Budget Table */}
        <div className="lg:col-span-9 space-y-6">
          <BudgetToolbar
            canEdit={canEdit}
            projectId={project.id}
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

              <div className="grid w-full gap-3 md:grid-cols-3 text-sm text-muted-foreground">
                <div>
                  <p className="text-xs uppercase tracking-wide">Planned Budget</p>
                  <p className="text-lg font-semibold text-foreground">€{(plannedBudget ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">Actual Spend</p>
                  <p className="text-lg font-semibold text-foreground">€{totals.total.toLocaleString()}</p>
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

        {/* Sidebar with Charts and Totals */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">
                  €{totals.total.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
              </div>

              <div className="space-y-2">
                {Object.entries(totals.totalsByCategory).map(([category, amount]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="capitalize">{category.toLowerCase()}</span>
                    <span className="font-semibold">€{amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Line Items</span>
                  <span className="font-semibold">{totals.linesCount}</span>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
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
                  <Button
                    size="sm"
                    onClick={handleVatSave}
                    disabled={!canEdit || isSavingVat}
                  >
                    {isSavingVat ? "Saving" : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied automatically to every line item in this budget.
                </p>
              </div>

              <div className="pt-4 border-t space-y-2">
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
                <p className="text-xs text-muted-foreground">
                  Used to monitor variance between planned and actual spend.
                </p>
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
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled // TODO: Implement export
              >
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>

              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled // TODO: Implement import
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import from Excel
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Line Dialog */}
      <AddLineDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        projectId={project.id}
        onLineAdded={handleLineAdded}
      />
    </div>
  );
}
