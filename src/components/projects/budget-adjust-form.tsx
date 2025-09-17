"use client";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z.object({ budgetPlanned: z.number().min(0), budgetActual: z.number().min(0) });

interface BudgetAdjustFormProps {
  projectId: string;
  budgetPlanned: number;
  budgetActual: number;
}

export function BudgetAdjustForm({ projectId, budgetPlanned, budgetActual }: BudgetAdjustFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { budgetPlanned, budgetActual },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            budgetPlanned: values.budgetPlanned,
            budgetActual: values.budgetActual,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "Unable to update budget");
        }

        toast.success("Budget updated");
        router.refresh();
      } catch (error) {
        toast.error("Update failed", {
          description: error instanceof Error ? error.message : "Try again shortly.",
        });
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="budgetPlanned"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Planned Budget</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} onChange={(event) => field.onChange(Number(event.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="budgetActual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Actual Spend</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} onChange={(event) => field.onChange(Number(event.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="md:col-span-2">
          {isPending ? "Updating" : "Save budget"}
        </Button>
      </form>
    </Form>
  );
}
