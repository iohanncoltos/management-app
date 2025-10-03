import { NextResponse } from "next/server";
import { ReportStatus } from "@prisma/client";

import { requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

/**
 * GET /api/reports/daily
 * Get user's daily reports with optional filters
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get("projectId") || undefined;
    const status = searchParams.get("status") as ReportStatus | undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {
      userId: session.user.id,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) {
        where.reportDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.reportDate.lte = new Date(endDate);
      }
    }

    const reports = await prisma.dailyReport.findMany({
      where,
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
      orderBy: {
        reportDate: "desc",
      },
      take: limit,
    });

    // Serialize dates
    const serialized = reports.map((report) => ({
      ...report,
      reportDate: report.reportDate.toISOString(),
      submittedAt: report.submittedAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching daily reports:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/reports/daily
 * Create or update a daily report
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const {
      id, // If provided, update existing report
      reportDate,
      projectId,
      workSummary,
      blockers,
      tomorrowPlan,
      hoursWorked,
      tasksCompleted,
      tasksInProgress,
      status,
    } = body;

    // Validate required fields
    if (!reportDate || !workSummary) {
      return NextResponse.json(
        { message: "reportDate and workSummary are required" },
        { status: 400 }
      );
    }

    const data = {
      userId: session.user.id,
      reportDate: new Date(reportDate),
      projectId: projectId || null,
      workSummary,
      blockers: blockers || null,
      tomorrowPlan: tomorrowPlan || null,
      hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
      tasksCompleted: tasksCompleted || null,
      tasksInProgress: tasksInProgress || null,
      status: status || ReportStatus.DRAFT,
      submittedAt: status === ReportStatus.SUBMITTED ? new Date() : null,
    };

    let report;

    if (id) {
      // Update existing report
      const existing = await prisma.dailyReport.findUnique({
        where: { id },
      });

      if (!existing || existing.userId !== session.user.id) {
        return NextResponse.json({ message: "Report not found" }, { status: 404 });
      }

      report = await prisma.dailyReport.update({
        where: { id },
        data,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });
    } else {
      // Create new report
      report = await prisma.dailyReport.create({
        data,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      ...report,
      reportDate: report.reportDate.toISOString(),
      submittedAt: report.submittedAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating/updating daily report:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
