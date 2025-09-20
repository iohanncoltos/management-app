import { z } from "zod";
import { TaskPriority, TaskCategory, TaskStatus } from "@prisma/client";

export const taskCreateSchema = z.object({
  projectId: z.string().cuid().nullable().optional(),
  title: z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  start: z.string().or(z.date()),
  end: z.string().or(z.date()),
  progress: z.number().int().min(0).max(100).optional().default(0),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  category: z.nativeEnum(TaskCategory).optional().default(TaskCategory.PROJECT_WORK),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.NOT_STARTED),
  estimatedHours: z.number().int().min(1).max(1000).nullable().optional(),
  actualHours: z.number().int().min(0).max(1000).nullable().optional(),
  parentId: z.string().cuid().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  dependsOn: z.array(z.string().cuid()).optional().default([]),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().max(2000).optional(),
  start: z.string().or(z.date()).optional(),
  end: z.string().or(z.date()).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  category: z.nativeEnum(TaskCategory).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  estimatedHours: z.number().int().min(1).max(1000).nullable().optional(),
  actualHours: z.number().int().min(0).max(1000).nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  dependsOn: z.array(z.string().cuid()).optional(),
});

export const taskFiltersSchema = z.object({
  status: z.array(z.nativeEnum(TaskStatus)).optional(),
  priority: z.array(z.nativeEnum(TaskPriority)).optional(),
  category: z.array(z.nativeEnum(TaskCategory)).optional(),
  assigneeId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  createdById: z.string().cuid().optional(),
  search: z.string().max(255).optional(),
  dueSoon: z.boolean().optional(),
  overdue: z.boolean().optional(),
});

export const taskSortSchema = z.object({
  field: z.enum([
    "title",
    "priority",
    "status",
    "category",
    "start",
    "end",
    "progress",
    "createdAt",
    "updatedAt",
  ]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});
