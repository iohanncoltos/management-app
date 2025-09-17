import { z } from "zod";

export const taskCreateSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  start: z.string().or(z.date()),
  end: z.string().or(z.date()),
  progress: z.number().int().min(0).max(100).optional(),
  parentId: z.string().cuid().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  dependsOn: z.array(z.string().cuid()).optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();
