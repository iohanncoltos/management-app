"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  projectId: z.string().cuid(),
  recipients: z.string().min(1, "Provide at least one recipient"),
  subject: z.string().min(3),
  message: z.string().min(5),
});

interface MessageFormProps {
  projects: Array<{ id: string; code: string; name: string }>;
}

export function MessageForm({ projects }: MessageFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { projectId: projects[0]?.id ?? "", recipients: "", subject: "", message: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/mail/project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: values.projectId,
            recipients: values.recipients.split(/[,;\s]+/).filter(Boolean),
            subject: values.subject,
            message: values.message,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "Unable to send message");
        }

        toast.success("Transmission sent");
        form.reset({ ...form.getValues(), subject: "", message: "" });
      } catch (error) {
        toast.error("Dispatch failed", {
          description: error instanceof Error ? error.message : "Try again shortly.",
        });
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="projectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mission</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mission" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.code} — {project.name}
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
          name="recipients"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipients</FormLabel>
              <FormControl>
                <Input placeholder="ops@intermax.io; pm@allieddefense.io" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Mission status update" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea rows={6} placeholder="Key updates, risk highlights, decisions required..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Transmitting" : "Send communication"}
        </Button>
      </form>
    </Form>
  );
}
