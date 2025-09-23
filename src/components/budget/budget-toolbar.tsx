"use client";

import { Search, Filter, RefreshCw, Download, Upload, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { BUDGET_CATEGORY_OPTIONS } from "@/lib/budgetCategorizer";
import { BudgetCategory } from "@prisma/client";

interface BudgetFilters {
  category: BudgetCategory | null;
  search: string;
  supplier: string;
}

interface BudgetToolbarProps {
  canEdit: boolean;
  projectId: string;
  filters: BudgetFilters;
  onFiltersChange: (filters: BudgetFilters) => void;
  onRefresh: () => void;
}

export function BudgetToolbar({
  canEdit,
  projectId,
  filters,
  onFiltersChange,
  onRefresh,
}: BudgetToolbarProps) {
  const updateFilter = (key: keyof BudgetFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      category: null,
      search: "",
      supplier: "",
    });
  };

  const hasActiveFilters = filters.category || filters.search || filters.supplier;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Top Row - Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>

              {canEdit && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled // TODO: Implement import
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Import Excel
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                disabled // TODO: Implement export
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled // TODO: Implement PDF export
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export PDF
              </Button>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>

          {/* Bottom Row - Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters:
            </div>

            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items, notes, suppliers..."
                  value={filters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={filters.category || "ALL"}
              onValueChange={(value) => updateFilter("category", value === "ALL" ? null : value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {BUDGET_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by supplier..."
              value={filters.supplier}
              onChange={(e) => updateFilter("supplier", e.target.value)}
              className="w-[200px]"
            />
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Active filters:</span>
              {filters.category && (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                  Category: {BUDGET_CATEGORY_OPTIONS.find(opt => opt.value === filters.category)?.label}
                </span>
              )}
              {filters.search && (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                  Search: "{filters.search}"
                </span>
              )}
              {filters.supplier && (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                  Supplier: "{filters.supplier}"
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}