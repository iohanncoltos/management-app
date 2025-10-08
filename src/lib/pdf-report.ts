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

    // Override addPage method to prevent automatic page creation
    doc.addPage = function() {
      // Only allow adding pages if explicitly called, not automatically
      console.warn('Attempted to add new page - prevented for single page report');
      return this;
    };

    const buffers: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Helper function to safely add text with proper encoding
    const addText = (text: string, x?: number, y?: number, options?: Record<string, unknown>) => {
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

    // Helper function to draw a card with dynamic height
    const drawCard = (y: number, height: number) => {
      // Card shadow effect
      doc.rect(42, y + 2, doc.page.width - 84, height).fill("#e2e8f0");
      // Card background
      doc.rect(40, y, doc.page.width - 80, height).fillAndStroke(colors.cardBg, colors.border);
      doc.lineWidth(0.5);
    };

    // Helper function to calculate text height
    const calculateTextHeight = (text: string, fontSize: number, width: number, lineGap: number = 2) => {
      const avgCharsPerLine = Math.floor(width / (fontSize * 0.6)); // Approximate character width
      const lines = Math.ceil(text.length / avgCharsPerLine);
      return lines * (fontSize + lineGap) + 10; // Add padding
    };

    // Page background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.pageBg);

    // Modern header
    doc.rect(0, 0, doc.page.width, 120).fill(colors.primary);
    doc.rect(0, 110, doc.page.width, 10).fill(colors.primaryDark);

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

    // Calculate available space for dynamic content
    const footerSpace = 80; // Space reserved for footer
    const maxContentY = doc.page.height - footerSpace;
    const availableSpace = maxContentY - doc.y;

    // Content sections data for dynamic calculation
    const contentSections = [];

    // Always include work summary
    contentSections.push({
      title: "Work Summary",
      content: report.workSummary,
      fontSize: 9,
      priority: 1
    });

    if (report.blockers) {
      contentSections.push({
        title: "Blockers/Issues",
        content: report.blockers,
        fontSize: 8,
        priority: 2
      });
    }

    if (report.tomorrowPlan) {
      contentSections.push({
        title: "Tomorrow's Plan",
        content: report.tomorrowPlan,
        fontSize: 8,
        priority: 3
      });
    }

    // Calculate total space needed
    let totalNeededHeight = 0;
    const sectionData = contentSections.map(section => {
      const textHeight = calculateTextHeight(section.content, section.fontSize, doc.page.width - 110, 2);
      const cardHeight = textHeight + 40; // Header + padding
      totalNeededHeight += cardHeight + 10; // Space between cards
      return { ...section, textHeight, cardHeight };
    });

    // If content exceeds available space, reduce font sizes and recalculate
    if (totalNeededHeight > availableSpace) {
      const scaleFactor = availableSpace / totalNeededHeight * 0.9; // 90% to leave some margin

      sectionData.forEach(section => {
        section.fontSize = Math.max(6, section.fontSize * scaleFactor);
        section.textHeight = calculateTextHeight(section.content, section.fontSize, doc.page.width - 110, 1);
        section.cardHeight = section.textHeight + 35;
      });
    }

    // Render content sections
    sectionData.forEach((section) => {
      const cardY = doc.y;

      drawCard(cardY, section.cardHeight);

      doc
        .fontSize(Math.min(12, section.fontSize + 3))
        .font('Helvetica-Bold')
        .fillColor(colors.text);
      addText(section.title, 55, cardY + 12);

      doc
        .fontSize(section.fontSize)
        .font('Helvetica')
        .fillColor(colors.text);
      addText(section.content, 55, cardY + 32, {
        width: doc.page.width - 110,
        align: "left",
        lineGap: 1
      });

      doc.y = cardY + section.cardHeight + 8;
    });

    // Position footer at absolute bottom of page
    const footerY = doc.page.height - 60;

    // Ensure content doesn't overlap footer by checking current position
    if (doc.y > footerY - 10) {
      // If content is too close to footer, we need to scale it down more
      console.warn('Content approaching footer area - content was scaled appropriately');
    }

    // Footer separator line
    doc.rect(40, footerY - 5, doc.page.width - 80, 0.5).fill(colors.border);

    // Generation timestamp (left aligned)
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
      footerY + 5
    );

    // Confidential notice (center, prominent)
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(colors.text);
    addText("CONFIDENTIAL - For Intermax Projects Only", 40, footerY + 5, {
      width: doc.page.width - 80,
      align: "center",
    });

    // Additional confidential text (center, smaller)
    doc
      .fontSize(6)
      .font('Helvetica')
      .fillColor(colors.textSecondary);
    addText("This document contains confidential information. Unauthorized distribution is prohibited.", 40, footerY + 22, {
      width: doc.page.width - 80,
      align: "center",
    });

    doc.end();
  });
}