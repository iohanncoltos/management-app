import { NextResponse } from "next/server";
import { BudgetCategory } from "@prisma/client";

import { AuthorizationError, requireProjectView } from "@/lib/authz";
import { prisma } from "@/lib/db";

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
          select: { name: true, code: true },
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
      const vatAmount = line.vatPercent ? lineTotal * (Number(line.vatPercent) / 100) : 0;
      const lineTotalWithVat = lineTotal + vatAmount;

      totalsByCategory[line.category] += lineTotalWithVat;
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
      project: sheet.project,
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