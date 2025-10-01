import { NextResponse } from "next/server";
import { BudgetCategory } from "@prisma/client";
import { z } from "zod";

import { AuthorizationError, requireProjectBudgetEdit, requireProjectView } from "@/lib/authz";
import { recordAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/db";

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

const BUDGET_CATEGORY_SET = new Set<BudgetCategory>(Object.values(BudgetCategory));

function normalizeCategory(category: string): BudgetCategory {
  return BUDGET_CATEGORY_SET.has(category as BudgetCategory)
    ? (category as BudgetCategory)
    : BudgetCategory.OTHER;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    }

    await requireProjectView(projectId);

    // Get or create budget sheet for project
    const sheet = await prisma.budgetSheet.findUnique({
      where: { projectId },
      include: {
        lines: true,
        versions: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            label: true,
            createdAt: true,
            createdBy: {
              select: { name: true },
            },
          },
        },
        project: {
          select: { name: true, code: true, budgetPlanned: true, budgetActual: true },
        },
        approvedBy: {
          select: { name: true },
        },
      },
    });

    if (!sheet) {
      return NextResponse.json({
        sheet: null,
        totals: {
          total: 0,
          totalsByCategory: {},
          linesCount: 0,
        },
        versions: [],
        project: null,
      });
    }

    // Calculate totals by category
    const totalsByCategory: Record<BudgetCategory, number> = {
      [BudgetCategory.MECHANICAL]: 0,
      [BudgetCategory.ELECTRICAL]: 0,
      [BudgetCategory.SYSTEMS]: 0,
      [BudgetCategory.SOFTWARE]: 0,
      [BudgetCategory.OTHER]: 0,
    };

    let grandTotal = 0;

    for (const line of sheet.lines) {
      const lineTotal = Number(line.quantity) * Number(line.unitPrice);
      const vatRate = line.vatPercent !== null ? Number(line.vatPercent) : sheet.vatDefault ? Number(sheet.vatDefault) : 0;
      const vatAmount = vatRate ? lineTotal * (vatRate / 100) : 0;
      const lineTotalWithVat = lineTotal + vatAmount;
      const categoryKey = normalizeCategory(line.category);

      totalsByCategory[categoryKey] += lineTotalWithVat;
      grandTotal += lineTotalWithVat;
    }

    return NextResponse.json({
      sheet: {
        id: sheet.id,
        projectId: sheet.projectId,
        currency: sheet.currency,
        vatDefault: sheet.vatDefault ? Number(sheet.vatDefault) : null,
        createdAt: sheet.createdAt.toISOString(),
        updatedAt: sheet.updatedAt.toISOString(),
        approvedAt: sheet.approvedAt?.toISOString() ?? null,
        approvedBy: sheet.approvedBy?.name ?? null,
      },
      project: sheet.project
        ? {
            name: sheet.project.name,
            code: sheet.project.code,
            budgetPlanned: sheet.project.budgetPlanned ? Number(sheet.project.budgetPlanned) : null,
            budgetActual: sheet.project.budgetActual ? Number(sheet.project.budgetActual) : null,
          }
        : null,
      totals: {
        total: Math.round(grandTotal * 100) / 100,
        totalsByCategory: Object.fromEntries(
          Object.entries(totalsByCategory).map(([cat, total]) => [cat, Math.round(total * 100) / 100])
        ),
        linesCount: sheet.lines.length,
      },
      versions: sheet.versions,
    });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error fetching budget:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

const updateVatSchema = z.object({
  projectId: z.string().cuid(),
  vatPercent: z.union([z.number().min(0).max(100), z.null()]).optional(),
}).transform((data) => ({
  projectId: data.projectId,
  vatPercent: data.vatPercent ?? null,
}));

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateVatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    const { projectId, vatPercent } = parsed.data;
    const session = await requireProjectBudgetEdit(projectId);

    let sheet = await prisma.budgetSheet.findUnique({
      where: { projectId },
      include: { lines: { select: { id: true } } },
    });

    if (!sheet) {
      sheet = await prisma.budgetSheet.create({
        data: {
          projectId,
          createdById: session.user.id,
          vatDefault: vatPercent,
        },
        include: { lines: { select: { id: true } } },
      });
    }

    await prisma.$transaction([
      prisma.budgetSheet.update({
        where: { id: sheet.id },
        data: { vatDefault: vatPercent },
      }),
      prisma.budgetLine.updateMany({
        where: { sheetId: sheet.id },
        data: { vatPercent: vatPercent },
      }),
    ]);

    await recordAuditEvent({
      type: "BUDGET",
      entity: "budget_sheet",
      entityId: sheet.id,
      userId: session.user.id,
      data: { action: "update-vat", projectId, vatPercent },
    });

    const updatedSheet = await prisma.budgetSheet.findUnique({
      where: { id: sheet.id },
      select: {
        id: true,
        vatDefault: true,
        currency: true,
      },
    });

    if (!updatedSheet) {
      throw new Error("Failed to load updated sheet");
    }

    return NextResponse.json({
      id: updatedSheet.id,
      vatDefault: updatedSheet.vatDefault ? Number(updatedSheet.vatDefault) : null,
      currency: updatedSheet.currency,
    });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error updating budget defaults:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
