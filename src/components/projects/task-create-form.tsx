"use client";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { TaskStatus, TaskPriority, TaskCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function normalizeDate(value: string | Date | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

const schema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  start: z.string().or(z.date()),
  end: z.string().or(z.date()),
  progress: z.number().int().min(0).max(100),
  priority: z.nativeEnum(TaskPriority),
  category: z.nativeEnum(TaskCategory),
  status: z.nativeEnum(TaskStatus),
  estimatedHours: z.number().int().min(1).max(1000).nullable().optional(),
  actualHours: z.number().int().min(0).max(1000).nullable().optional(),
  parentId: z.string().cuid().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  dependsOn: z.array(z.string().cuid()),
});

interface TaskCreateFormProps {
  projectId: string;
  users: Array<{ id: string; name: string; email: string }>;
  tasks: Array<{ id: string; title: string }>;
  onCreated?: () => void;
}

export function TaskCreateForm({ projectId, users, tasks, onCreated }: TaskCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId,
      title: "",
      description: "",
      start: new Date().toISOString().slice(0, 10),
      end: new Date().toISOString().slice(0, 10),
      progress: 0,
      priority: TaskPriority.MEDIUM,
      category: TaskCategory.PROJECT_WORK,
      status: TaskStatus.NOT_STARTED,
      assigneeId: undefined,
      dependsOn: [],
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "Unable to create task");
        }

        toast.success("Workstream added");
        router.refresh();
        form.reset({
          ...form.getValues(),
          title: "",
          description: "",
          dependsOn: [],
        });
        onCreated?.();
      } catch (error) {
        toast.error("Failed to add workstream", {
          description: error instanceof Error ? error.message : "Please retry shortly.",
        });
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task title</FormLabel>
                <FormControl>
                  <Input placeholder="Assemble integration build" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to</FormLabel>
                <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Logistics, dependencies, acceptance criteria" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="start"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={normalizeDate(field.value)} onChange={(event) => field.onChange(event.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Finish</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={normalizeDate(field.value)} onChange={(event) => field.onChange(event.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="progress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Progress (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    {...field}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="dependsOn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dependencies</FormLabel>
              <div className="grid gap-2 rounded-2xl border border-border/60 bg-secondary/40 p-3">
                {tasks.length === 0 ? <p className="text-xs text-muted-foreground">No upstream tasks defined.</p> : null}
                {tasks.map((task) => {
                  const checked = field.value?.includes(task.id) ?? false;
                  return (
                    <label key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(isChecked) => {
                          const next = new Set(field.value ?? []);
                          if (isChecked) {
                            next.add(task.id);
                          } else {
                            next.delete(task.id);
                          }
                          field.onChange(Array.from(next));
                        }}
                      />
                      {task.title}
                    </label>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Scheduling" : "Add workstream"}
        </Button>
      </form>
    </Form>
  );
}
