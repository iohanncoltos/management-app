"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

const editLineSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().max(50).optional(),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  currency: z.string().length(3).optional(),
  vatPercent: z.number().min(0).max(100).optional(),
  supplier: z.string().max(100).optional(),
  link: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
  category: z.string().min(1, "Category is required").max(100),
  customCategory: z.string().max(100).optional(),
});

type EditLineFormData = z.infer<typeof editLineSchema>;

const PREDEFINED_CATEGORIES = [
  { value: "MECHANICAL", label: "Mechanical" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "SYSTEMS", label: "Systems" },
  { value: "SOFTWARE", label: "Software" },
  { value: "OTHER", label: "Other" },
  { value: "CUSTOM", label: "Custom..." }
];

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

interface EditLineDialogProps {
  line: BudgetLine;
  isOpen: boolean;
  onClose: () => void;
  onLineUpdated: (line: BudgetLine) => void;
}

export function EditLineDialog({ line, isOpen, onClose, onLineUpdated }: EditLineDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const form = useForm<EditLineFormData>({
    resolver: zodResolver(editLineSchema),
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
      category: "",
      customCategory: "",
    },
  });

  // Update form when line changes
  useEffect(() => {
    if (line) {
      form.reset({
        name: line.name,
        quantity: line.quantity,
        unit: line.unit || "",
        unitPrice: line.unitPrice,
        currency: line.currency,
        vatPercent: line.vatPercent || 0,
        supplier: line.supplier || "",
        link: line.link || "",
        notes: line.notes || "",
        category: PREDEFINED_CATEGORIES.some(cat => cat.value === line.category) ? line.category : "CUSTOM",
        customCategory: PREDEFINED_CATEGORIES.some(cat => cat.value === line.category) ? "" : line.category,
      });
      setShowCustomCategory(!PREDEFINED_CATEGORIES.some(cat => cat.value === line.category));
    }
  }, [line, form]);

  const onSubmit = async (data: EditLineFormData) => {
    setIsSubmitting(true);
    try {
      const finalCategory = data.category === "CUSTOM" ? data.customCategory : data.category;
      const payload = {
        ...data,
        category: finalCategory,
        // Clean up empty strings
        unit: data.unit || undefined,
        supplier: data.supplier || undefined,
        link: data.link || undefined,
        notes: data.notes || undefined,
      };
      delete payload.customCategory;

      const response = await fetch(`/api/budgets/lines/${line.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update line item");
      }

      const updatedLine: BudgetLine = await response.json();
      onLineUpdated(updatedLine);
      toast.success("Line item updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating line item:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update line item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setShowCustomCategory(false);
      onClose();
    }
  };

  const handleCategoryChange = (value: string) => {
    form.setValue("category", value);
    setShowCustomCategory(value === "CUSTOM");
    if (value !== "CUSTOM") {
      form.setValue("customCategory", "");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Budget Line Item</DialogTitle>
          <DialogDescription>
            Update the details of this budget line item.
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
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={handleCategoryChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {PREDEFINED_CATEGORIES.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {showCustomCategory && (
                  <FormField
                    control={form.control}
                    name="customCategory"
                    render={({ field }) => (
                      <FormItem className="mt-2">
                        <FormLabel>Custom Category Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Electronics, Tooling, Services..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                Update Line Item
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}