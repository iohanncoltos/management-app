"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const schema = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2).max(160),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  memberUserIds: z.array(z.string().cuid()).optional(),
});

type ProjectFormProps = {
  users: Array<{ id: string; name: string; email: string; role: string }>;
  statuses: string[];
};

type FormValues = z.infer<typeof schema>;

export function ProjectForm({ users, statuses }: ProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      name: "",
      status: undefined,
      startDate: "",
      endDate: "",
      memberUserIds: [],
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: values.code,
            name: values.name,
            status: values.status,
            startDate: values.startDate || undefined,
            endDate: values.endDate || undefined,
            memberUserIds: values.memberUserIds ?? [],
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? "Unable to create project");
        }

        const project = await response.json();
        toast.success("Mission deployed");
        router.replace(`/projects/${project.id}`);
      } catch (error) {
        toast.error("Deployment failed", {
          description: error instanceof Error ? error.message : "Try again shortly.",
        });
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Program Code</FormLabel>
                <FormControl>
                  <Input placeholder="IMX-204" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mission Name</FormLabel>
                <FormControl>
                  <Input placeholder="Orbital Defense Upgrade" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="memberUserIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign Operators</FormLabel>
              <div className="space-y-2 rounded-2xl border border-border/60 p-3">
                {users.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No operators available.</p>
                ) : null}
                {users.map((user) => {
                  const checked = field.value?.includes(user.id) ?? false;
                  return (
                    <label
                      key={user.id}
                      className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm text-muted-foreground"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{user.name}</span>
                        <span className="text-xs">{user.email}</span>
                      </div>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          const next = new Set(field.value ?? []);
                          if (value) {
                            next.add(user.id);
                          } else {
                            next.delete(user.id);
                          }
                          field.onChange(Array.from(next));
                        }}
                      />
                    </label>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Deploying..." : "Deploy Mission"}
        </Button>
      </form>
    </Form>
  );
}
