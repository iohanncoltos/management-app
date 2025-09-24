"use client";

import { useState } from "react";
import { MoreHorizontal, Edit, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditLineDialog } from "./edit-line-dialog";

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

interface BudgetTableProps {
  lines: BudgetLine[];
  isLoading: boolean;
  canEdit: boolean;
  onLineUpdate: (line: BudgetLine) => void;
  onLineDelete: (lineId: string) => void;
}

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    MECHANICAL: "#0ea5e9",
    ELECTRICAL: "#f59e0b",
    SYSTEMS: "#10b981",
    SOFTWARE: "#8b5cf6",
    OTHER: "#6b7280",
  };
  return colors[category] || "#6b7280";
};

export function BudgetTable({ lines, isLoading, canEdit, onLineUpdate, onLineDelete }: BudgetTableProps) {
  const [editingLine, setEditingLine] = useState<BudgetLine | null>(null);
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (lineId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/budgets/lines/${lineId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete line item");
      }

      onLineDelete(lineId);
      toast.success("Line item deleted successfully");
    } catch (error) {
      console.error("Error deleting line item:", error);
      toast.error("Failed to delete line item");
    } finally {
      setIsDeleting(false);
      setDeletingLineId(null);
    }
  };

  const formatCurrency = (amount: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No budget line items yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          {canEdit ? "Add your first line item to get started." : "No line items to display."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-auto max-h-[600px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="min-w-[200px]">Part/Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>VAT %</TableHead>
              <TableHead>Line Total</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Notes</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => {
              const categoryColor = getCategoryColor(line.category);
              const lineTotal = line.quantity * line.unitPrice;
              const vatAmount = line.vatPercent ? lineTotal * (line.vatPercent / 100) : 0;
              const totalWithVat = lineTotal + vatAmount;

              return (
                <TableRow key={line.id} className="group">
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{line.name}</div>
                      {line.link && (
                        <a
                          href={line.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mt-1"
                        >
                          View Link <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{ borderColor: categoryColor, color: categoryColor }}
                      className="text-xs"
                    >
                      {line.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{line.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{line.unit || "—"}</TableCell>
                  <TableCell>{formatCurrency(line.unitPrice, line.currency)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {line.currency}
                    </Badge>
                  </TableCell>
                  <TableCell>{line.vatPercent ? `${line.vatPercent}%` : "—"}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(totalWithVat, line.currency)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{line.supplier || "—"}</TableCell>
                  <TableCell>
                    {line.notes ? (
                      <div className="max-w-[150px] truncate text-sm text-muted-foreground" title={line.notes}>
                        {line.notes}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingLine(line)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Line
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingLineId(line.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Line
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {editingLine && (
        <EditLineDialog
          line={editingLine}
          isOpen={true}
          onClose={() => setEditingLine(null)}
          onLineUpdated={onLineUpdate}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingLineId} onOpenChange={() => setDeletingLineId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this line item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLineId && handleDelete(deletingLineId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}