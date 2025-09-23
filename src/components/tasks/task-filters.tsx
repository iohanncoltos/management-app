"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TaskFilters as TaskFiltersType,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_CATEGORY_OPTIONS,
} from "@/lib/types/tasks";

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  users?: Array<{ id: string; name: string; email: string; role?: string | null }>;
  projects?: Array<{ id: string; name: string; code: string }>;
  hideUserFilter?: boolean;
}

export function TaskFilters({
  filters,
  onFiltersChange,
  users = [],
  projects = [],
  hideUserFilter = false,
}: TaskFiltersProps) {
  const [search, setSearch] = useState(filters.search || "");

  const updateFilters = (newFilters: Partial<TaskFiltersType>) => {
    onFiltersChange({ ...filters, ...newFilters });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: search.trim() || undefined });
  };

  const clearFilters = () => {
    setSearch("");
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== "";
  });


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          <div className="space-y-2">
            <Label>Status</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {filters.status?.length ? (
                    <Badge variant="default" className="mr-2">
                      {filters.status.length}
                    </Badge>
                  ) : null}
                  Status
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="start">
                <div className="space-y-2">
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={filters.status?.includes(option.value) || false}
                        onCheckedChange={(checked) => {
                          const currentStatus = filters.status || [];
                          const newStatus = checked
                            ? [...currentStatus, option.value]
                            : currentStatus.filter(s => s !== option.value);
                          updateFilters({ status: newStatus.length > 0 ? newStatus : undefined });
                        }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {filters.priority?.length ? (
                    <Badge variant="default" className="mr-2">
                      {filters.priority.length}
                    </Badge>
                  ) : null}
                  Priority
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="start">
                <div className="space-y-2">
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={filters.priority?.includes(option.value) || false}
                        onCheckedChange={(checked) => {
                          const currentPriority = filters.priority || [];
                          const newPriority = checked
                            ? [...currentPriority, option.value]
                            : currentPriority.filter(p => p !== option.value);
                          updateFilters({ priority: newPriority.length > 0 ? newPriority : undefined });
                        }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {filters.category?.length ? (
                    <Badge variant="default" className="mr-2">
                      {filters.category.length}
                    </Badge>
                  ) : null}
                  Category
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="start">
                <div className="space-y-2">
                  {TASK_CATEGORY_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={filters.category?.includes(option.value) || false}
                        onCheckedChange={(checked) => {
                          const currentCategory = filters.category || [];
                          const newCategory = checked
                            ? [...currentCategory, option.value]
                            : currentCategory.filter(c => c !== option.value);
                          updateFilters({ category: newCategory.length > 0 ? newCategory : undefined });
                        }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {!hideUserFilter && users.length > 0 && (
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={filters.assigneeId || ""}
                onValueChange={(value) => updateFilters({ assigneeId: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role || "No Role"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {projects.length > 0 && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={filters.projectId || ""}
                onValueChange={(value) => updateFilters({ projectId: value === "none" ? "none" : value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quick Filters</Label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={filters.dueSoon || false}
                  onCheckedChange={(checked) => updateFilters({ dueSoon: checked === true ? true : undefined })}
                />
                <span className="text-sm">Due Soon (7 days)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={filters.overdue || false}
                  onCheckedChange={(checked) => updateFilters({ overdue: checked === true ? true : undefined })}
                />
                <span className="text-sm">Overdue</span>
              </label>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {filters.search && (
              <Badge variant="default">
                Search: {filters.search}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0"
                  onClick={() => {
                    setSearch("");
                    updateFilters({ search: undefined });
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.status?.length && (
              <Badge variant="default">
                Status: {filters.status.length}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0"
                  onClick={() => updateFilters({ status: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.priority?.length && (
              <Badge variant="default">
                Priority: {filters.priority.length}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0"
                  onClick={() => updateFilters({ priority: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.category?.length && (
              <Badge variant="default">
                Category: {filters.category.length}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0"
                  onClick={() => updateFilters({ category: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.dueSoon && (
              <Badge variant="default">
                Due Soon
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0"
                  onClick={() => updateFilters({ dueSoon: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.overdue && (
              <Badge variant="default">
                Overdue
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0"
                  onClick={() => updateFilters({ overdue: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}