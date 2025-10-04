import { NextResponse } from "next/server";

import { requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { generateDailyReportPDF } from "@/lib/pdf-report";

type RouteContext = { params: Promise<{ reportId: string }> };

/**
 * GET /api/reports/daily/[reportId]/export
 * Export daily report as PDF
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { reportId } = await context.params;
    const session = await requireSession();

    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ message: "Report not found" }, { status: 404 });
    }

    // Check authorization
    if (report.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Generate PDF
    const pdfBuffer = await generateDailyReportPDF({
      id: report.id,
      reportDate: report.reportDate,
      userName: report.user.name || "Unknown User",
      userEmail: report.user.email,
      projectName: report.project?.name,
      workSummary: report.workSummary,
      blockers: report.blockers,
      tomorrowPlan: report.tomorrowPlan,
      hoursWorked: report.hoursWorked ? parseFloat(report.hoursWorked.toString()) : null,
      tasksCompleted: report.tasksCompleted,
      tasksInProgress: report.tasksInProgress,
      status: report.status,
      submittedAt: report.submittedAt,
    });

    // Format filename: DailyReport_YYYY-MM-DD_ProjectName.pdf
    const dateStr = report.reportDate.toISOString().split("T")[0];
    const projectStr = report.project?.name.replace(/\s+/g, "_") || "General";
    const filename = `DailyReport_${dateStr}_${projectStr}.pdf`;

    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting daily report:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
