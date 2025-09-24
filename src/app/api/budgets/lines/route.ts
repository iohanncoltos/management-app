import { NextResponse } from "next/server";
import { z } from "zod";

import { recordAuditEvent } from "@/lib/audit";
import { AuthorizationError, requireProjectView, requireProjectBudgetEdit } from "@/lib/authz";
import { prisma } from "@/lib/db";

const createLineSchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unit: z.string().max(50).optional(),
  unitPrice: z.number().min(0),
  currency: z.string().length(3).optional().default("EUR"),
  vatPercent: z.number().min(0).max(100).optional(),
  supplier: z.string().max(100).optional(),
  link: z.string().url().optional(),
  notes: z.string().max(500).optional(),
  category: z.string().min(1).max(100),
});

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const supplier = searchParams.get("supplier");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!projectId) {
      return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    }

    await requireProjectView(projectId);

    // Get budget sheet
    const sheet = await prisma.budgetSheet.findUnique({
      where: { projectId },
    });

    if (!sheet) {
      return NextResponse.json({
        lines: [],
        totalCount: 0,
        hasMore: false,
      });
    }

    // Build where clause
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

    // Get total count
    const totalCount = await prisma.budgetLine.count({ where });

    // Get paginated lines
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

    const serializedLines = lines.map((line) => ({
      id: line.id,
      name: line.name,
      category: line.category,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitPrice: Number(line.unitPrice),
      currency: line.currency,
      vatPercent: line.vatPercent ? Number(line.vatPercent) : null,
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
    const session = await requireProjectBudgetEdit("");
    const body = await request.json();
    const parsed = createLineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { projectId, ...data } = parsed.data;

    // Verify project permissions
    await requireProjectBudgetEdit(projectId);

    // Get or create budget sheet
    let sheet = await prisma.budgetSheet.findUnique({
      where: { projectId },
    });

    if (!sheet) {
      sheet = await prisma.budgetSheet.create({
        data: {
          projectId,
          createdById: session.user.id,
        },
      });
    }

    const line = await prisma.budgetLine.create({
      data: {
        ...data,
        sheetId: sheet.id,
        createdById: session.user.id,
      },
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
      data: { action: "create", projectId, lineId: line.id, name: line.name },
    });

    const serializedLine = {
      id: line.id,
      name: line.name,
      category: line.category,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitPrice: Number(line.unitPrice),
      currency: line.currency,
      vatPercent: line.vatPercent ? Number(line.vatPercent) : null,
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