import { NextResponse } from "next/server";
import { PassThrough } from "stream";

import { auth } from "@/lib/auth";
import { getDashboardMetrics, getProjectPerformanceSeries, getTaskStatusBreakdown, getUpcomingTasks } from "@/lib/services/dashboard-service";
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

  const [metrics, performance, breakdown, upcoming] = await Promise.all([
    getDashboardMetrics(session.user.id, permissions),
    getProjectPerformanceSeries(),
    getTaskStatusBreakdown(permissions, session.user.id),
    getUpcomingTasks(permissions, session.user.id),
  ]);

  if (format === "pdf") {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: "Mission Control Overview",
        Author: session.user.name || "Intermax Management App",
        Subject: "Dashboard Export",
        Creator: "Intermax Management App"
      }
    });

    // Override addPage method to prevent automatic page creation
    doc.addPage = function() {
      console.warn('Attempted to add new page - prevented for single page report');
      return this;
    };
    const stream = new PassThrough();
    doc.pipe(stream);

    // Helper function for consistent text rendering
    const addText = (text: string, x?: number, y?: number, options?: Record<string, unknown>) => {
      const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      if (x !== undefined && y !== undefined) {
        return doc.text(cleanText, x, y, options);
      } else if (x !== undefined) {
        return doc.text(cleanText, x, options);
      } else {
        return doc.text(cleanText, options);
      }
    };

    // Color scheme matching web app
    const colors = {
      primary: "#b03636",
      primaryDark: "#9b2c2c",
      accent: "#9b2c2c",
      success: "#3bb2ad",
      warning: "#e0b341",
      danger: "#ff4d4f",
      text: "#0f1115",
      textSecondary: "#9aa4b2",
      border: "#d6deeb",
      cardBg: "#ffffff",
      pageBg: "#f9fbff",
      blue: "#3a7bd5"
    };

    // Header with branding - reduced height
    doc.rect(0, 0, doc.page.width, 60).fill(colors.primary);
    doc.fontSize(20).font('Helvetica-Bold').fillColor("#ffffff");
    addText("Mission Control Overview", 40, 20);
    doc.fontSize(9).font('Helvetica').fillColor("#ffffff");
    addText("Live operational snapshot across all Intermax initiatives", 40, 42);

    // Generation timestamp
    doc.fontSize(7).fillColor("#ffffff");
    addText(`Generated: ${new Date().toLocaleString()}`, doc.page.width - 160, 42);

    doc.y = 80;

    // Helper function to draw cards
    const drawCard = (x: number, y: number, width: number, height: number) => {
      // Shadow
      doc.rect(x + 2, y + 2, width, height).fill("#e2e8f0");
      // Card
      doc.rect(x, y, width, height).fillAndStroke(colors.cardBg, colors.border);
      doc.lineWidth(0.5);
    };

    // KPI Cards Section - smaller and better spaced
    const kpiY = doc.y;
    const cardSpacing = 10;
    const cardWidth = (doc.page.width - 80 - (cardSpacing * 3)) / 4; // 4 cards with proper spacing
    const cardHeight = 60; // Reduced height

    // KPI Card 1: Active Missions
    const card1X = 40;
    drawCard(card1X, kpiY, cardWidth, cardHeight);
    doc.fontSize(8).font('Helvetica').fillColor(colors.textSecondary);
    addText("Active Missions", card1X + 8, kpiY + 10);
    doc.fontSize(16).font('Helvetica-Bold').fillColor(colors.primary);
    addText(String(metrics.totalProjects), card1X + 8, kpiY + 22);
    doc.fontSize(7).fillColor(colors.textSecondary);
    addText(`${metrics.completionRate}% complete`, card1X + 8, kpiY + 45);

    // KPI Card 2: Overdue Tasks
    const card2X = card1X + cardWidth + cardSpacing;
    drawCard(card2X, kpiY, cardWidth, cardHeight);
    doc.fontSize(8).font('Helvetica').fillColor(colors.textSecondary);
    addText("Overdue Tasks", card2X + 8, kpiY + 10);
    doc.fontSize(16).font('Helvetica-Bold').fillColor(metrics.overdueTasks > 0 ? colors.danger : colors.success);
    addText(String(metrics.overdueTasks), card2X + 8, kpiY + 22);
    doc.fontSize(7).fillColor(colors.textSecondary);
    addText("Requires attention", card2X + 8, kpiY + 45);

    // KPI Card 3: Workforce Load
    const card3X = card2X + cardWidth + cardSpacing;
    drawCard(card3X, kpiY, cardWidth, cardHeight);
    doc.fontSize(8).font('Helvetica').fillColor(colors.textSecondary);
    addText("Workforce Load", card3X + 8, kpiY + 10);
    doc.fontSize(16).font('Helvetica-Bold').fillColor(metrics.workload > 100 ? colors.warning : colors.success);
    addText(`${metrics.workload}%`, card3X + 8, kpiY + 22);
    doc.fontSize(7).fillColor(colors.textSecondary);
    addText(metrics.workload > 100 ? "Overcommitted" : "Stable", card3X + 8, kpiY + 45);

    // KPI Card 4: Budget Variance
    const card4X = card3X + cardWidth + cardSpacing;
    drawCard(card4X, kpiY, cardWidth, cardHeight);
    doc.fontSize(8).font('Helvetica').fillColor(colors.textSecondary);
    addText("Budget Variance", card4X + 8, kpiY + 10);
    doc.fontSize(16).font('Helvetica-Bold').fillColor(metrics.budgetVariance >= 0 ? colors.danger : colors.success);
    addText(`${metrics.budgetVariance.toFixed(1)}%`, card4X + 8, kpiY + 22);
    doc.fontSize(7).fillColor(colors.textSecondary);
    addText(metrics.budgetVariance >= 0 ? "Over plan" : "Under plan", card4X + 8, kpiY + 45);

    doc.y = kpiY + cardHeight + 15;

    // Project Performance Section - more compact
    const perfY = doc.y;
    const perfCardWidth = (doc.page.width - 90) / 2;
    const perfCardHeight = 120; // Reduced height

    // Budget Trajectory Chart (simplified as table)
    drawCard(40, perfY, perfCardWidth, perfCardHeight);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(colors.text);
    addText("Budget Trajectory", 48, perfY + 10);
    doc.fontSize(7).fillColor(colors.textSecondary);
    addText("Compare planned vs actual spend", 48, perfY + 22);

    // Performance data table - more compact
    let tableY = perfY + 35;
    doc.fontSize(7).font('Helvetica-Bold').fillColor(colors.text);
    addText("Project", 48, tableY);
    addText("Planned", 120, tableY);
    addText("Actual", 170, tableY);
    addText("Progress", 220, tableY);

    tableY += 10;
    doc.rect(48, tableY, perfCardWidth - 16, 0.5).fill(colors.border);

    performance.slice(0, 4).forEach((item, i) => {
      doc.fontSize(6).font('Helvetica').fillColor(colors.text);
      addText(item.label.substring(0, 10), 48, tableY + 5 + (i * 10));
      addText(`$${(item.planned/1000).toFixed(0)}k`, 120, tableY + 5 + (i * 10));
      addText(`$${(item.actual/1000).toFixed(0)}k`, 170, tableY + 5 + (i * 10));
      addText(`${item.completion}%`, 220, tableY + 5 + (i * 10));
    });

    // Task Status Breakdown (right side)
    const statusX = 50 + perfCardWidth;
    drawCard(statusX, perfY, perfCardWidth, perfCardHeight);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(colors.text);
    addText("Execution Status", statusX + 8, perfY + 10);
    doc.fontSize(7).fillColor(colors.textSecondary);
    addText("Live distribution of task states", statusX + 8, perfY + 22);

    // Status breakdown as compact visual bars
    const statuses = [
      { label: "Planned", value: breakdown.planned, color: colors.blue },
      { label: "Executing", value: breakdown.executing, color: colors.primary },
      { label: "Blocked", value: breakdown.blocked, color: colors.warning },
      { label: "Complete", value: breakdown.complete, color: colors.success }
    ];

    const total = statuses.reduce((sum, s) => sum + s.value, 0);
    const barY = perfY + 40;

    statuses.forEach((status, i) => {
      const percentage = total > 0 ? (status.value / total) * 100 : 0;
      const barWidth = Math.max(5, (percentage / 100) * (perfCardWidth - 60));

      // Bar
      doc.rect(statusX + 8, barY + (i * 18), barWidth, 10).fill(status.color);

      // Label and value
      doc.fontSize(6).fillColor(colors.text);
      addText(status.label, statusX + 15 + barWidth, barY + (i * 18) + 2);
      addText(`${status.value} (${percentage.toFixed(1)}%)`, statusX + 15 + barWidth, barY + (i * 18) + 8);
    });

    doc.y = perfY + perfCardHeight + 10;

    // Upcoming Milestones Section - more compact
    const availableSpace = doc.page.height - doc.y - 80; // Leave space for footer
    const milestonesY = doc.y;
    const milestonesHeight = Math.min(100, availableSpace); // Adaptive height

    drawCard(40, milestonesY, doc.page.width - 80, milestonesHeight);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(colors.text);
    addText("Upcoming Milestones", 48, milestonesY + 10);
    doc.fontSize(7).fillColor(colors.textSecondary);
    addText("Next critical deliverables across mission teams", 48, milestonesY + 22);

    // Milestones table - more compact
    let milestoneTableY = milestonesY + 35;
    doc.fontSize(7).font('Helvetica-Bold').fillColor(colors.text);
    addText("Task", 48, milestoneTableY);
    addText("Mission", 200, milestoneTableY);
    addText("Due Date", 300, milestoneTableY);
    addText("Progress", 400, milestoneTableY);

    milestoneTableY += 10;
    doc.rect(48, milestoneTableY, doc.page.width - 96, 0.5).fill(colors.border);

    const maxMilestones = Math.floor((milestonesHeight - 50) / 10);
    upcoming.slice(0, maxMilestones).forEach((task, i) => {
      const dueDate = typeof task.end === "string" ? new Date(task.end) : task.end;
      doc.fontSize(6).font('Helvetica').fillColor(colors.text);
      addText(task.title.substring(0, 25), 48, milestoneTableY + 5 + (i * 10));
      if (task.project) {
        addText(`${task.project.code}`, 200, milestoneTableY + 5 + (i * 10));
      }
      addText(dueDate.toLocaleDateString(), 300, milestoneTableY + 5 + (i * 10));
      addText(`${task.progress}%`, 400, milestoneTableY + 5 + (i * 10));
    });

    // Footer matching daily reports style
    const footerY = doc.page.height - 60;

    // Footer separator line
    doc.rect(40, footerY - 5, doc.page.width - 80, 0.5).fill(colors.border);

    // Generation timestamp (left aligned)
    doc.fontSize(7).font('Helvetica').fillColor(colors.textSecondary);
    addText(`Generated: ${new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`, 40, footerY + 5);

    // Confidential notice (center, prominent)
    doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.text);
    addText("CONFIDENTIAL - For Intermax Projects Only", 40, footerY + 5, {
      width: doc.page.width - 80,
      align: "center",
    });

    // Additional confidential text (center, smaller)
    doc.fontSize(6).font('Helvetica').fillColor(colors.textSecondary);
    addText("This document contains confidential information. Unauthorized distribution is prohibited.", 40, footerY + 22, {
      width: doc.page.width - 80,
      align: "center",
    });

    doc.end();

    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=mission-control-overview.pdf",
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
