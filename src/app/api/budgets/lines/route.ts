import { NextResponse } from "next/server";
import { z } from "zod";

import { recordAuditEvent } from "@/lib/audit";
import {
  AuthorizationError,
  requireProjectBudgetEdit,
  requireProjectView,
  requireWorkspaceBudgetEdit,
  requireWorkspaceView,
} from "@/lib/authz";
import { prisma } from "@/lib/db";

const createLineSchema = z
  .object({
    projectId: z.string().cuid().optional(),
    workspaceId: z.string().cuid().optional(),
    name: z.string().min(1, "Name is required").max(200),
    quantity: z.number().positive("Quantity must be positive"),
    unit: z.string().max(50).optional(),
    unitPrice: z.number().min(0, "Unit price must be non-negative"),
    currency: z.string().length(3).optional(),
    supplier: z.string().max(100).optional(),
    link: z.string().url().optional(),
    notes: z.string().max(500).optional(),
    category: z.string().min(1, "Category is required").max(100),
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
    ...data,
    currency: data.currency ?? "EUR",
  }));

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

function ensureSingleContext(projectId: string | null, workspaceId: string | null) {
  const hasProject = Boolean(projectId);
  const hasWorkspace = Boolean(workspaceId);
  if (hasProject === hasWorkspace) {
    throw new AuthorizationError("Provide either projectId or workspaceId", 400);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const workspaceId = searchParams.get("workspaceId");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const supplier = searchParams.get("supplier");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

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
    });

    if (!sheet) {
      return NextResponse.json({
        lines: [],
        totalCount: 0,
        hasMore: false,
        page,
        limit,
      });
    }

    const where: Record<string, unknown> = {
      sheetId: sheet.id,
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { supplier: { contains: search, mode: "insensitive" } },
      ];
    }

    if (supplier) {
      where.supplier = { contains: supplier, mode: "insensitive" };
    }

    const totalCount = await prisma.budgetLine.count({ where });

    const lines = await prisma.budgetLine.findMany({
      where,
      include: {
        createdBy: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const defaultVat = sheet.vatDefault ? Number(sheet.vatDefault) : null;

    const serializedLines = lines.map((line) => ({
      id: line.id,
      name: line.name,
      category: line.category,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitPrice: Number(line.unitPrice),
      currency: line.currency,
      vatPercent: line.vatPercent ? Number(line.vatPercent) : defaultVat,
      supplier: line.supplier,
      link: line.link,
      notes: line.notes,
      lineTotal: Number(line.quantity) * Number(line.unitPrice),
      createdAt: line.createdAt.toISOString(),
      updatedAt: line.updatedAt.toISOString(),
      createdBy: line.createdBy.name,
    }));

    return NextResponse.json({
      lines: serializedLines,
      totalCount,
      hasMore: totalCount > page * limit,
      page,
      limit,
    });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error fetching budget lines:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createLineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid payload", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { projectId, workspaceId, ...data } = parsed.data;

    const sheetWhere = projectId ? { projectId } : { workspaceId: workspaceId! };

    const session = projectId
      ? await requireProjectBudgetEdit(projectId)
      : await requireWorkspaceBudgetEdit(workspaceId!);

    let sheet = await prisma.budgetSheet.findUnique({ where: sheetWhere });

    if (!sheet) {
      sheet = await prisma.budgetSheet.create({
        data: {
          ...sheetWhere,
          createdById: session.user.id,
        },
      });
    }

    const line = await prisma.budgetLine.create({
      data: {
        ...data,
        sheetId: sheet.id,
        createdById: session.user.id,
        vatPercent: sheet.vatDefault,
      },
      include: {
        createdBy: {
          select: { name: true },
        },
      },
    });

    await recordAuditEvent({
      type: "BUDGET",
      entity: "budget_line",
      entityId: line.id,
      userId: session.user.id,
      data: {
        action: "create",
        projectId: projectId ?? undefined,
        workspaceId: workspaceId ?? undefined,
        lineId: line.id,
        name: line.name,
      },
    });

    const serializedLine = {
      id: line.id,
      name: line.name,
      category: line.category,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitPrice: Number(line.unitPrice),
      currency: line.currency,
      vatPercent: line.vatPercent ? Number(line.vatPercent) : sheet.vatDefault ? Number(sheet.vatDefault) : null,
      supplier: line.supplier,
      link: line.link,
      notes: line.notes,
      lineTotal: Number(line.quantity) * Number(line.unitPrice),
      createdAt: line.createdAt.toISOString(),
      updatedAt: line.updatedAt.toISOString(),
      createdBy: line.createdBy.name,
    };

    return NextResponse.json(serializedLine, { status: 201 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error creating budget line:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
