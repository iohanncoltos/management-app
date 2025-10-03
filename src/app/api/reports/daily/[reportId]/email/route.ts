import { NextResponse } from "next/server";
import { ReportStatus } from "@prisma/client";

import { requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { sendDailyReportEmail } from "@/lib/mail";
import { generateDailyReportPDF } from "@/lib/pdf-report";

type RouteContext = { params: Promise<{ reportId: string }> };

/**
 * POST /api/reports/daily/[reportId]/email
 * Email daily report to admins, project managers, and custom recipients
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { reportId } = await context.params;
    const session = await requireSession();
    const body = await request.json();

    const { additionalEmails } = body; // Array of additional email addresses

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
            createdBy: {
              select: {
                email: true,
              },
            },
            memberships: {
              select: {
                user: {
                  select: {
                    email: true,
                    role: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
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

    // Collect recipient emails
    const recipients: Set<string> = new Set();

    // 1. Get all admins (users with MANAGE_USERS permission)
    const admins = await prisma.user.findMany({
      where: {
        role: {
          permissions: {
            some: {
              action: "MANAGE_USERS",
            },
          },
        },
      },
      select: {
        email: true,
      },
    });
    admins.forEach((admin) => recipients.add(admin.email));

    // 2. If project is specified, add project creator
    if (report.project?.createdBy?.email) {
      recipients.add(report.project.createdBy.email);
    }

    // 3. Add project members who are managers/leads (optional: could filter by role)
    if (report.project?.memberships) {
      report.project.memberships.forEach((membership) => {
        if (membership.user.email) {
          recipients.add(membership.user.email);
        }
      });
    }

    // 4. Add custom emails from user input
    if (additionalEmails && Array.isArray(additionalEmails)) {
      additionalEmails.forEach((email: string) => {
        if (email && email.includes("@")) {
          recipients.add(email.trim());
        }
      });
    }

    // Remove the report author's own email
    recipients.delete(report.user.email);

    if (recipients.size === 0) {
      return NextResponse.json(
        { message: "No recipients found. Please add email addresses manually." },
        { status: 400 }
      );
    }

    // Generate PDF attachment
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

    // Send email to all recipients
    await sendDailyReportEmail({
      to: Array.from(recipients),
      reportDate: report.reportDate,
      userName: report.user.name || "Unknown User",
      projectName: report.project?.name,
      workSummary: report.workSummary,
      pdfAttachment: pdfBuffer,
    });

    // Update report status to SUBMITTED and save emailed recipients
    await prisma.dailyReport.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.SUBMITTED,
        submittedAt: new Date(),
        emailedTo: Array.from(recipients).join(", "),
      },
    });

    return NextResponse.json({
      success: true,
      recipientCount: recipients.size,
      recipients: Array.from(recipients),
    });
  } catch (error) {
    console.error("Error emailing daily report:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
