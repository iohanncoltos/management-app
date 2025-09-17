import { z } from "zod";

export const projectCreateSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CLOSED"]).optional(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).nullable().optional(),
  budgetPlanned: z.number().positive(),
  budgetActual: z.number().nonnegative().optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial();
