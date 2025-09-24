"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Download, Upload, BookOpen } from "lucide-react";

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
  const [filters, setFilters] = useState({
    category: null as string | null,
    search: "",
    supplier: "",
  });

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
                onLineUpdate={handleLineUpdated}
                onLineDelete={handleLineDeleted}
              />
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