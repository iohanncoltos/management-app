import PDFDocument from "pdfkit";

interface DailyReportData {
  id: string;
  reportDate: Date;
  userName: string;
  userEmail: string;
  projectName?: string | null;
  workSummary: string;
  blockers?: string | null;
  tomorrowPlan?: string | null;
  hoursWorked?: number | null;
  tasksCompleted?: unknown;
  tasksInProgress?: unknown;
  status: string;
  submittedAt?: Date | null;
}

/**
 * Generate a PDF report for a daily work report
 * Uses app's color scheme: dark background, blue/teal accents
 */
export async function generateDailyReportPDF(report: DailyReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
      autoFirstPage: true,
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Use standard PDF fonts (no external files needed)
    doc.font('Helvetica');

    // Color scheme matching the app
    const colors = {
      primary: "#3a7bd5", // Blue
      accent: "#3bb2ad", // Teal
      text: "#1f2937", // Dark gray
      textLight: "#6b7280", // Light gray
      border: "#e5e7eb", // Border gray
      background: "#f9fafb", // Light background
    };

    // Header with colored accent bar
    doc
      .rect(0, 0, doc.page.width, 10)
      .fill(colors.primary);

    doc
      .moveDown(0.5)
      .fontSize(24)
      .fillColor(colors.text)
      .text("Daily Work Report", { align: "center" });

    doc
      .fontSize(10)
      .fillColor(colors.textLight)
      .text(
        `Report Date: ${report.reportDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        { align: "center" }
      );

    doc.moveDown(0.5);

    // Employee information box
    const boxY = doc.y;
    doc
      .rect(50, boxY, doc.page.width - 100, 60)
      .fillAndStroke(colors.background, colors.border);

    doc
      .fontSize(10)
      .fillColor(colors.text)
      .text("Employee:", 60, boxY + 15)
      .text(report.userName, 130, boxY + 15);

    doc
      .text("Email:", 60, boxY + 30)
      .text(report.userEmail, 130, boxY + 30);

    if (report.projectName) {
      doc
        .text("Project:", 60, boxY + 45)
        .fillColor(colors.accent)
        .text(report.projectName, 130, boxY + 45);
    }

    doc.moveDown(3);

    // Hours worked (if provided)
    if (report.hoursWorked) {
      doc
        .fontSize(11)
        .fillColor(colors.text)
        .text(`Hours Worked: `, { continued: true })
        .fillColor(colors.primary)
        .text(`${report.hoursWorked} hours`);
      doc.moveDown(1);
    }

    // Tasks completed section
    if (report.tasksCompleted && Array.isArray(report.tasksCompleted) && report.tasksCompleted.length > 0) {
      doc
        .fontSize(12)
        .fillColor(colors.primary)
        
        .text("TASKS COMPLETED");

      doc
        .moveDown(0.3)
        .rect(50, doc.y, 100, 2)
        .fill(colors.accent);

      doc.moveDown(0.5);

      report.tasksCompleted.forEach((task: { title: string; projectName?: string }) => {
        doc
          .fontSize(10)
          .fillColor(colors.text)
          
          .text(`• ${task.title}`, { indent: 10 });
        if (task.projectName) {
          doc
            .fillColor(colors.textLight)
            .fontSize(9)
            .text(`  Project: ${task.projectName}`, { indent: 15 });
        }
      });
      doc.moveDown(1);
    }

    // Tasks in progress section
    if (report.tasksInProgress && Array.isArray(report.tasksInProgress) && report.tasksInProgress.length > 0) {
      doc
        .fontSize(12)
        .fillColor(colors.primary)
        
        .text("TASKS IN PROGRESS");

      doc
        .moveDown(0.3)
        .rect(50, doc.y, 100, 2)
        .fill(colors.accent);

      doc.moveDown(0.5);

      report.tasksInProgress.forEach((task: { title: string; progress: number }) => {
        doc
          .fontSize(10)
          .fillColor(colors.text)
          
          .text(`• ${task.title} (${task.progress}%)`, { indent: 10 });
      });
      doc.moveDown(1);
    }

    // Work summary section
    doc
      .fontSize(12)
      .fillColor(colors.primary)
      
      .text("WORK SUMMARY");

    doc
      .moveDown(0.3)
      .rect(50, doc.y, 100, 2)
      .fill(colors.accent);

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor(colors.text)
      
      .text(report.workSummary, {
        align: "left",
        lineGap: 3,
      });

    doc.moveDown(1);

    // Blockers/Issues section
    if (report.blockers) {
      doc
        .fontSize(12)
        .fillColor(colors.primary)
        
        .text("BLOCKERS / ISSUES");

      doc
        .moveDown(0.3)
        .rect(50, doc.y, 100, 2)
        .fill(colors.accent);

      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor(colors.text)
        
        .text(report.blockers, {
          align: "left",
          lineGap: 3,
        });

      doc.moveDown(1);
    }

    // Tomorrow's plan section
    if (report.tomorrowPlan) {
      doc
        .fontSize(12)
        .fillColor(colors.primary)
        
        .text("TOMORROW'S PLAN");

      doc
        .moveDown(0.3)
        .rect(50, doc.y, 100, 2)
        .fill(colors.accent);

      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor(colors.text)
        
        .text(report.tomorrowPlan, {
          align: "left",
          lineGap: 3,
        });
    }

    // Footer with timestamp and confidentiality notice
    const footerY = doc.page.height - 80;
    doc
      .rect(0, footerY, doc.page.width, 1)
      .fill(colors.border);

    doc
      .fontSize(8)
      .fillColor(colors.textLight)
      .text(
        `Generated on: ${new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        50,
        footerY + 15,
        { align: "left" }
      );

    doc
      
      .fillColor(colors.text)
      .text("For Intermax Projects Only - Confidential", 50, footerY + 30, {
        align: "center",
      });

    doc
      .fontSize(7)
      .fillColor(colors.textLight)
      
      .text("This document contains confidential information. Unauthorized distribution is prohibited.", 50, footerY + 45, {
        align: "center",
      });

    // Colored bottom accent bar
    doc
      .rect(0, doc.page.height - 10, doc.page.width, 10)
      .fill(colors.accent);

    doc.end();
  });
}
