import { NextResponse } from "next/server";
import { BudgetCategory, Prisma } from "@prisma/client";
import { z } from "zod";

import { recordAuditEvent } from "@/lib/audit";
import { AuthorizationError, requireProjectBudgetEdit } from "@/lib/authz";
import { categorizeBudgetItem } from "@/lib/budgetCategorizer";
import { prisma } from "@/lib/db";

const updateLineSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
  unitPrice: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  supplier: z.string().max(100).optional(),
  link: z.string().url().optional(),
  notes: z.string().max(500).optional(),
  category: z.nativeEnum(BudgetCategory).optional(),
});

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateLineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get the existing line to check permissions
    const existingLine = await prisma.budgetLine.findUnique({
      where: { id },
      include: {
        sheet: {
          select: { projectId: true, vatDefault: true },
        },
      },
    });

    if (!existingLine) {
      return NextResponse.json({ message: "Budget line not found" }, { status: 404 });
    }

    const session = await requireProjectBudgetEdit(existingLine.sheet.projectId);

    // Auto-categorize if name/unit changed but category not explicitly set
    let finalCategory = data.category;
    if (!finalCategory && (data.name || data.unit)) {
      const nameToUse = data.name || existingLine.name;
      const unitToUse = data.unit !== undefined ? data.unit : existingLine.unit;
      const supplierToUse = data.supplier !== undefined ? data.supplier : existingLine.supplier;
      const notesToUse = data.notes !== undefined ? data.notes : existingLine.notes;

      finalCategory = categorizeBudgetItem(nameToUse, unitToUse, supplierToUse, notesToUse);
    }

    const updateData: Prisma.BudgetLineUpdateInput = { ...data };
    if (finalCategory) {
      updateData.category = finalCategory;
    }

    updateData.vatPercent = existingLine.sheet.vatDefault ?? undefined;

    const line = await prisma.budgetLine.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { name: true },
        },
      },
    });

    // Record audit event
    await recordAuditEvent({
      type: "BUDGET",
      entity: "budget_line",
      entityId: line.id,
      userId: session.user.id,
      data: { action: "update", projectId: existingLine.sheet.projectId, lineId: line.id, changes: data },
    });

    const serializedLine = {
      id: line.id,
      name: line.name,
      category: line.category,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitPrice: Number(line.unitPrice),
      currency: line.currency,
      vatPercent: line.vatPercent ? Number(line.vatPercent) : existingLine.sheet.vatDefault ? Number(existingLine.sheet.vatDefault) : null,
      supplier: line.supplier,
      link: line.link,
      notes: line.notes,
      lineTotal: Number(line.quantity) * Number(line.unitPrice),
      createdAt: line.createdAt.toISOString(),
      updatedAt: line.updatedAt.toISOString(),
      createdBy: line.createdBy.name,
    };

    return NextResponse.json(serializedLine);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error updating budget line:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the existing line to check permissions
    const existingLine = await prisma.budgetLine.findUnique({
      where: { id },
      include: {
        sheet: {
          select: { projectId: true },
        },
      },
    });

    if (!existingLine) {
      return NextResponse.json({ message: "Budget line not found" }, { status: 404 });
    }

    const session = await requireProjectBudgetEdit(existingLine.sheet.projectId);

    await prisma.budgetLine.delete({
      where: { id },
    });

    // Record audit event
    await recordAuditEvent({
      type: "BUDGET",
      entity: "budget_line",
      entityId: id,
      userId: session.user.id,
      data: {
        action: "delete",
        projectId: existingLine.sheet.projectId,
        lineId: id,
        name: existingLine.name
      },
    });

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error deleting budget line:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
