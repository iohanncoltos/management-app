"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { BUDGET_CATEGORY_OPTIONS } from "@/lib/budgetCategorizer";
import { BudgetCategory } from "@prisma/client";

const addLineSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().max(50).optional(),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  currency: z.string().length(3).optional(),
  vatPercent: z.number().min(0).max(100).optional(),
  supplier: z.string().max(100).optional(),
  link: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
  category: z.nativeEnum(BudgetCategory).optional(),
});

type AddLineFormData = z.infer<typeof addLineSchema>;

interface BudgetLine {
  id: string;
  name: string;
  category: BudgetCategory;
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

interface AddLineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onLineAdded: (line: BudgetLine) => void;
}

export function AddLineDialog({ isOpen, onClose, projectId, onLineAdded }: AddLineDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useAutoCategory, setUseAutoCategory] = useState(true);

  const form = useForm<AddLineFormData>({
    resolver: zodResolver(addLineSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      unit: "",
      unitPrice: 0,
      currency: "EUR",
      vatPercent: 0,
      supplier: "",
      link: "",
      notes: "",
    },
  });

  const onSubmit = async (data: AddLineFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        projectId,
        // Don't send category if auto-categorization is enabled
        category: useAutoCategory ? undefined : data.category,
        // Clean up empty strings
        unit: data.unit || undefined,
        supplier: data.supplier || undefined,
        link: data.link || undefined,
        notes: data.notes || undefined,
        currency: data.currency || "EUR",
      };

      const response = await fetch("/api/budgets/lines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add line item");
      }

      const newLine: BudgetLine = await response.json();
      onLineAdded(newLine);
      toast.success("Line item added successfully");
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error adding line item:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add line item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setUseAutoCategory(true);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Budget Line Item</DialogTitle>
          <DialogDescription>
            Add a new line item to your project budget. Categories will be automatically assigned based on the item name and details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part/Item Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Steel bearing, PCB connector..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="pcs, kg, m, AWG..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="JPY">JPY (¥)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="20"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="Company name..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <Label>Category</Label>
                  <Button
                    type="button"
                    variant={useAutoCategory ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseAutoCategory(!useAutoCategory)}
                    className="text-xs h-6"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Auto-categorize
                  </Button>
                </div>

                {!useAutoCategory && (
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                              {BUDGET_CATEGORY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {useAutoCategory && (
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2 border border-dashed">
                    Category will be automatically determined based on the item name and unit
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes, specifications..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Line Item
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}