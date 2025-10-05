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
 * Modern card-based design matching the web interface with proper text encoding
 */
export async function generateDailyReportPDF(report: DailyReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: `Daily Report - ${report.reportDate.toISOString().split('T')[0]}`,
        Author: report.userName,
        Subject: "Daily Work Report",
        Creator: "Intermax Management App"
      }
    });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Helper function to safely add text with proper encoding
    const addText = (text: string, x?: number, y?: number, options?: any) => {
      // Clean and encode text properly
      const cleanText = text
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, '?'); // Replace unsupported chars

      if (x !== undefined && y !== undefined) {
        return doc.text(cleanText, x, y, options);
      } else if (x !== undefined) {
        return doc.text(cleanText, x, options);
      } else {
        return doc.text(cleanText, options);
      }
    };

    // App's actual color scheme - dark theme with red/burgundy accents
    const colors = {
      primary: "#b03636", // Primary red rgb(176, 54, 54)
      primaryDark: "#9b2c2c", // Darker red
      accent: "#9b2c2c", // Accent red rgb(155, 44, 44)
      success: "#3bb2ad", // Teal/success from app
      warning: "#e0b341", // Warning yellow from app
      danger: "#ff4d4f", // Danger red from app
      text: "#0f1115", // Dark text rgb(15, 17, 21)
      textSecondary: "#9aa4b2", // Muted foreground rgb(154, 164, 178)
      border: "#d6deeb", // Light border
      cardBg: "#ffffff", // White cards for print
      pageBg: "#f9fbff", // Very light background for print
      subtle: "#eaf0f8", // Subtle background
    };

    // Helper function to draw a card
    const drawCard = (y: number, height: number) => {
      // Card shadow effect
      doc.rect(42, y + 2, doc.page.width - 84, height).fill("#e2e8f0");
      // Card background
      doc.rect(40, y, doc.page.width - 80, height).fillAndStroke(colors.cardBg, colors.border);
      doc.lineWidth(0.5);
    };

    // Page background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.pageBg);

    // Modern header
    doc.rect(0, 0, doc.page.width, 120).fill(colors.primary);
    doc.rect(0, 110, doc.page.width, 10).fill(colors.primaryDark);

    // Reserve space for footer
    const footerHeight = 40;

    // Header content
    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor("#ffffff");
    addText("Daily Work Report", 40, 30);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor("#ffffff");
    addText(
      report.reportDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      40,
      65
    );

    // Status badge in header
    if (report.status === "SUBMITTED") {
      doc.rect(40, 85, 80, 20).fill(colors.success);
      doc.fontSize(9).fillColor("#ffffff");
      addText("SUBMITTED", 40, 90, { width: 80, align: "center" });
    } else {
      doc.rect(40, 85, 60, 20).fill(colors.warning);
      doc.fontSize(9).fillColor("#ffffff");
      addText("DRAFT", 40, 90, { width: 60, align: "center" });
    }

    doc.y = 140;

    // Employee information card
    const infoCardY = doc.y;
    const infoCardHeight = report.projectName ? 90 : 70;
    drawCard(infoCardY, infoCardHeight);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(colors.text);
    addText("Report Information", 55, infoCardY + 15);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(colors.textSecondary);
    addText("Employee", 55, infoCardY + 35);

    doc.fillColor(colors.text);
    addText(report.userName, 145, infoCardY + 35);

    doc.fillColor(colors.textSecondary);
    addText("Email", 55, infoCardY + 50);

    doc.fillColor(colors.text);
    addText(report.userEmail, 145, infoCardY + 50);

    if (report.projectName) {
      doc.fillColor(colors.textSecondary);
      addText("Project", 55, infoCardY + 65);

      doc
        .font('Helvetica-Bold')
        .fillColor(colors.primary);
      addText(report.projectName, 145, infoCardY + 65);
    }

    doc.y = infoCardY + infoCardHeight + 10;

    // Hours worked card (if provided)
    if (report.hoursWorked) {
      const hoursCardY = doc.y;
      drawCard(hoursCardY, 45);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(colors.text);
      addText("Hours Worked", 55, hoursCardY + 12);

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(colors.primary);
      addText(`${report.hoursWorked}`, 55, hoursCardY + 25);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(colors.textSecondary);
      addText("hours", 85, hoursCardY + 29);

      doc.y = hoursCardY + 55;
    }

    // Tasks completed card - more compact
    if (report.tasksCompleted && Array.isArray(report.tasksCompleted) && report.tasksCompleted.length > 0) {
      const tasksCompletedY = doc.y;
      const taskItemHeight = 15;
      const maxTasks = Math.min(report.tasksCompleted.length, 3); // Limit to 3 tasks
      const tasksCompletedHeight = 35 + (maxTasks * taskItemHeight);

      drawCard(tasksCompletedY, tasksCompletedHeight);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(colors.text);
      addText("✓ Tasks Completed", 55, tasksCompletedY + 12);

      let taskY = tasksCompletedY + 28;
      report.tasksCompleted.slice(0, maxTasks).forEach((task: { title: string; projectName?: string }) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(colors.success);
        addText("●", 60, taskY);

        doc.fillColor(colors.text);
        addText(task.title, 70, taskY, { width: doc.page.width - 130 });

        taskY += taskItemHeight;
      });

      if (report.tasksCompleted.length > maxTasks) {
        doc
          .fontSize(8)
          .fillColor(colors.textSecondary);
        addText(`... and ${report.tasksCompleted.length - maxTasks} more`, 70, taskY);
      }

      doc.y = tasksCompletedY + tasksCompletedHeight + 10;
    }

    // Tasks in progress card - more compact
    if (report.tasksInProgress && Array.isArray(report.tasksInProgress) && report.tasksInProgress.length > 0) {
      const tasksInProgressY = doc.y;
      const taskItemHeight = 20;
      const maxTasks = Math.min(report.tasksInProgress.length, 2); // Limit to 2 tasks
      const tasksInProgressHeight = 35 + (maxTasks * taskItemHeight);

      drawCard(tasksInProgressY, tasksInProgressHeight);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(colors.text);
      addText("⟳ Tasks In Progress", 55, tasksInProgressY + 12);

      let taskY = tasksInProgressY + 28;
      report.tasksInProgress.slice(0, maxTasks).forEach((task: { title: string; progress: number }) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(colors.text);
        addText(task.title, 60, taskY, { width: doc.page.width - 180 });

        // Progress bar
        const progressBarY = taskY + 10;
        const progressBarWidth = 80;
        doc.rect(60, progressBarY, progressBarWidth, 4).fill(colors.subtle);
        const fillWidth = (task.progress / 100) * progressBarWidth;
        doc.rect(60, progressBarY, fillWidth, 4).fill(colors.primary);

        doc
          .fontSize(8)
          .fillColor(colors.textSecondary);
        addText(`${task.progress}%`, 150, progressBarY - 1);

        taskY += taskItemHeight;
      });

      doc.y = tasksInProgressY + tasksInProgressHeight + 10;
    }

    // Work summary card - make it dynamic based on content
    const summaryCardY = doc.y;
    const maxY = doc.page.height - footerHeight - 50; // Leave space for footer

    // Calculate available space and adjust card height accordingly
    const availableHeight = maxY - summaryCardY;
    const summaryCardHeight = Math.min(Math.max(80, 50 + (report.workSummary.length / 8)), availableHeight / 3);

    drawCard(summaryCardY, summaryCardHeight);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(colors.text);
    addText("Work Summary", 55, summaryCardY + 15);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(colors.text);
    addText(report.workSummary, 55, summaryCardY + 35, {
      width: doc.page.width - 110,
      align: "left",
      lineGap: 2,
      height: summaryCardHeight - 50,
      ellipsis: true
    });

    doc.y = summaryCardY + summaryCardHeight + 10;

    // Check if we have space for additional cards, otherwise skip them or make them smaller
    const remainingSpace = maxY - doc.y;

    // Blockers/Issues card - only if we have space
    if (report.blockers && remainingSpace > 100) {
      const blockersCardY = doc.y;
      const blockersCardHeight = Math.min(70, remainingSpace / 2);

      drawCard(blockersCardY, blockersCardHeight);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(colors.text);
      addText("Blockers/Issues", 55, blockersCardY + 12);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(colors.text);
      addText(report.blockers, 55, blockersCardY + 30, {
        width: doc.page.width - 110,
        align: "left",
        lineGap: 2,
        height: blockersCardHeight - 40,
        ellipsis: true
      });

      doc.y = blockersCardY + blockersCardHeight + 8;
    }

    // Tomorrow's plan card - only if we have space
    if (report.tomorrowPlan && (maxY - doc.y) > 60) {
      const planCardY = doc.y;
      const planCardHeight = Math.min(60, maxY - doc.y - 10);

      drawCard(planCardY, planCardHeight);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(colors.text);
      addText("Tomorrow's Plan", 55, planCardY + 12);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(colors.text);
      addText(report.tomorrowPlan, 55, planCardY + 30, {
        width: doc.page.width - 110,
        align: "left",
        lineGap: 2,
        height: planCardHeight - 40,
        ellipsis: true
      });

      doc.y = planCardY + planCardHeight + 8;
    }

    // Compact footer at bottom of page
    const footerY = doc.page.height - 40; // Reduced footer space

    // Footer border line
    doc.rect(40, footerY, doc.page.width - 80, 1).fill(colors.border);

    // Footer content - all on one compact section
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor(colors.textSecondary);
    addText(
      `Generated: ${new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      40,
      footerY + 8
    );

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor(colors.text);
    addText("CONFIDENTIAL - For Intermax Projects Only", 40, footerY + 8, {
      width: doc.page.width - 80,
      align: "center",
    });

    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor(colors.textSecondary);
    addText("This document contains confidential information. Unauthorized distribution is prohibited.", 40, footerY + 20, {
      width: doc.page.width - 80,
      align: "center",
    });

    doc.end();
  });
}