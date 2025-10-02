import { NextResponse } from "next/server";
import { BudgetCategory } from "@prisma/client";
import { z } from "zod";

import {
  AuthorizationError,
  requireProjectBudgetEdit,
  requireProjectView,
  requireWorkspaceBudgetEdit,
  requireWorkspaceView,
} from "@/lib/authz";
import { recordAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getProjectSummaryById, getWorkspaceSummaryById } from "@/lib/services/budget-service";

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

function initCategoryTotals() {
  return {
    [BudgetCategory.MECHANICAL]: 0,
    [BudgetCategory.ELECTRICAL]: 0,
    [BudgetCategory.SYSTEMS]: 0,
    [BudgetCategory.SOFTWARE]: 0,
    [BudgetCategory.OTHER]: 0,
  } satisfies Record<BudgetCategory, number>;
}

function ensureSingleContext(projectId: string | null, workspaceId: string | null) {
  const hasProject = Boolean(projectId);
  const hasWorkspace = Boolean(workspaceId);
  if (hasProject === hasWorkspace) {
    throw new AuthorizationError("Provide either projectId or workspaceId", 400);
  }
}

const sheetInclude = {
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
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      budgetPlanned: true,
      budgetActual: true,
    },
  },
  workspace: {
    select: {
      id: true,
      name: true,
      description: true,
      planned: true,
      actual: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  approvedBy: {
    select: { name: true },
  },
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const workspaceId = searchParams.get("workspaceId");

    ensureSingleContext(projectId, workspaceId);

    if (projectId) {
      await requireProjectView(projectId);
    }

    if (workspaceId) {
      await requireWorkspaceView(workspaceId);
    }

    const whereClause = projectId ? { projectId } : { workspaceId: workspaceId! };

    const sheet = await prisma.budgetSheet.findUnique({
      where: whereClause,
      include: sheetInclude,
    });

    const projectSummary = sheet?.project
      ? {
          id: sheet.project.id,
          code: sheet.project.code,
          name: sheet.project.name,
          status: sheet.project.status,
          budgetPlanned: sheet.project.budgetPlanned ? Number(sheet.project.budgetPlanned) : null,
          budgetActual: sheet.project.budgetActual ? Number(sheet.project.budgetActual) : null,
        }
      : projectId
        ? await getProjectSummaryById(projectId)
        : null;

    const workspaceSummary = sheet?.workspace
      ? {
          id: sheet.workspace.id,
          name: sheet.workspace.name,
          description: sheet.workspace.description,
          planned: sheet.workspace.planned ? Number(sheet.workspace.planned) : null,
          actual: sheet.workspace.actual ? Number(sheet.workspace.actual) : null,
          owner: sheet.workspace.owner
            ? {
                id: sheet.workspace.owner.id,
                name: sheet.workspace.owner.name,
                email: sheet.workspace.owner.email,
              }
            : null,
          project: projectSummary,
          createdAt: sheet.workspace.createdAt,
          updatedAt: sheet.workspace.updatedAt,
        }
      : workspaceId
        ? await getWorkspaceSummaryById(workspaceId)
        : null;

    if (!sheet) {
      return NextResponse.json({
        sheet: null,
        totals: {
          total: 0,
          totalsByCategory: initCategoryTotals(),
          linesCount: 0,
        },
        versions: [],
        project: projectSummary,
        workspace: workspaceSummary,
      });
    }

    const totalsByCategory = initCategoryTotals();
    let grandTotal = 0;

    for (const line of sheet.lines) {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const lineTotal = quantity * unitPrice;
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
        workspaceId: sheet.workspaceId,
        currency: sheet.currency,
        vatDefault: sheet.vatDefault ? Number(sheet.vatDefault) : null,
        createdAt: sheet.createdAt.toISOString(),
        updatedAt: sheet.updatedAt.toISOString(),
        approvedAt: sheet.approvedAt?.toISOString() ?? null,
        approvedBy: sheet.approvedBy?.name ?? null,
      },
      project: projectSummary,
      workspace: workspaceSummary,
      totals: {
        total: Math.round(grandTotal * 100) / 100,
        totalsByCategory: Object.fromEntries(
          Object.entries(totalsByCategory).map(([cat, total]) => [cat, Math.round(total * 100) / 100]),
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

const updateVatSchema = z
  .object({
    projectId: z.string().cuid().optional(),
    workspaceId: z.string().cuid().optional(),
    vatPercent: z.union([z.number().min(0).max(100), z.null()]).optional(),
  })
  .superRefine((data, ctx) => {
    const hasProject = Boolean(data.projectId);
    const hasWorkspace = Boolean(data.workspaceId);
    if (hasProject === hasWorkspace) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either projectId or workspaceId",
        path: ["projectId"],
      });
    }
  })
  .transform((data) => ({
    projectId: data.projectId ?? null,
    workspaceId: data.workspaceId ?? null,
    vatPercent: data.vatPercent ?? null,
  }));

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateVatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    const { projectId, workspaceId, vatPercent } = parsed.data;

    let session: Awaited<ReturnType<typeof requireProjectBudgetEdit>>;
    if (projectId) {
      session = await requireProjectBudgetEdit(projectId);
    } else {
      session = await requireWorkspaceBudgetEdit(workspaceId!);
    }

    const sheetWhere = projectId ? { projectId } : { workspaceId: workspaceId! };

    let sheet = await prisma.budgetSheet.findUnique({
      where: sheetWhere,
      include: { lines: { select: { id: true } } },
    });

    if (!sheet) {
      sheet = await prisma.budgetSheet.create({
        data: {
          ...sheetWhere,
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
      data: {
        action: "update-vat",
        projectId: projectId ?? undefined,
        workspaceId: workspaceId ?? undefined,
        vatPercent,
      },
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
