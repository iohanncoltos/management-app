import { NextResponse } from "next/server";
import { PassThrough } from "stream";

import { auth } from "@/lib/auth";
import { getDashboardMetrics, getProjectPerformanceSeries } from "@/lib/services/dashboard-service";
import { Parser } from "@json2csv/plainjs";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const permissions = session.user.permissions ?? [];

  const [metrics, performance] = await Promise.all([
    getDashboardMetrics(session.user.id, permissions),
    getProjectPerformanceSeries(),
  ]);

  if (format === "pdf") {
    const doc = new PDFDocument({ margin: 40 });
    const stream = new PassThrough();
    doc.pipe(stream);

    doc.fontSize(18).text("Intermax Mission Dashboard", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Overdue Tasks: ${metrics.overdueTasks}`);
    doc.text(`Completion Rate: ${metrics.completionRate}%`);
    doc.text(`Workforce Load: ${metrics.workload}%`);
    doc.text(`Budget Variance: ${metrics.budgetVariance.toFixed(1)}%`);
    doc.moveDown();
    doc.text("Project Performance:");
    performance.forEach((item) => {
      doc.text(`- ${item.label}: Planned $${item.planned.toLocaleString()} / Actual $${item.actual.toLocaleString()} / Completion ${item.completion}%`);
    });
    doc.end();

    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=intermax-dashboard.pdf",
      },
    });
  }

  const parser = new Parser({ fields: ["metric", "value"] });
  const csv = parser.parse([
    { metric: "Overdue Tasks", value: metrics.overdueTasks },
    { metric: "Completion Rate", value: `${metrics.completionRate}%` },
    { metric: "Workforce Load", value: `${metrics.workload}%` },
    { metric: "Budget Variance", value: `${metrics.budgetVariance.toFixed(1)}%` },
  ]);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=intermax-dashboard.csv",
    },
  });
}
