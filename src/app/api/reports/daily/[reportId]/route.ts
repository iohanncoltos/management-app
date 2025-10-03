import { NextResponse } from "next/server";

import { requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ reportId: string }> };

/**
 * GET /api/reports/daily/[reportId]
 * Get a specific daily report
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { reportId } = await context.params;
    const session = await requireSession();

    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ message: "Report not found" }, { status: 404 });
    }

    // Check authorization (user must own the report)
    if (report.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      ...report,
      reportDate: report.reportDate.toISOString(),
      submittedAt: report.submittedAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching daily report:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/reports/daily/[reportId]
 * Delete a daily report
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { reportId } = await context.params;
    const session = await requireSession();

    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ message: "Report not found" }, { status: 404 });
    }

    // Check authorization
    if (report.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.dailyReport.delete({
      where: { id: reportId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting daily report:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
