import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

import { requireProjectView, requireWorkspaceView } from "@/lib/authz";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const workspaceId = searchParams.get("workspaceId");

  const hasProject = Boolean(projectId);
  const hasWorkspace = Boolean(workspaceId);

  if (hasProject === hasWorkspace) {
    return NextResponse.json({ message: "Provide either projectId or workspaceId" }, { status: 400 });
  }

  if (projectId) {
    await requireProjectView(projectId);
  }

  if (workspaceId) {
    await requireWorkspaceView(workspaceId);
  }

  const whereClause = projectId ? { projectId } : { workspaceId: workspaceId! };

  const sheet = await prisma.budgetSheet.findUnique({
    where: whereClause,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          budgetPlanned: true,
          budgetActual: true,
        },
      },
      workspace: {
        select: {
          id: true,
          name: true,
          description: true,
          planned: true,
          actual: true,
        },
      },
      lines: {
        orderBy: { createdAt: "asc" },
        select: {
          name: true,
          category: true,
          quantity: true,
          unit: true,
          unitPrice: true,
          currency: true,
          supplier: true,
          notes: true,
        },
      },
    },
  });

  if (!sheet) {
    return NextResponse.json({ message: "Budget sheet not found" }, { status: 404 });
  }

  const project = sheet.project;
  const workspace = sheet.workspace;

  const planned = project?.budgetPlanned
    ? Number(project.budgetPlanned)
    : workspace?.planned
      ? Number(workspace.planned)
      : 0;
  const actual = sheet.lines.reduce((total, line) => {
    const lineTotal = Number(line.quantity) * Number(line.unitPrice);
    const vatRate = sheet.vatDefault ? Number(sheet.vatDefault) : 0;
    const vatAmount = vatRate ? lineTotal * (vatRate / 100) : 0;
    return total + lineTotal + vatAmount;
  }, 0);

  const variance = planned ? actual - planned : actual;

  const doc = new PDFDocument({ margin: 40 });
  doc.font("Helvetica");
  const chunks: Buffer[] = [];
  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const headingLabel = project?.code ?? workspace?.name ?? "Budget";
  doc.fontSize(18).text(`Budget Summary - ${headingLabel}`, { underline: true });
  doc.moveDown();
  if (project) {
    doc.fontSize(12).text(`Project: ${project.name ?? "Unknown"}`);
  }
  if (workspace) {
    doc.fontSize(12).text(`Workspace: ${workspace.name ?? "Untitled"}`);
    if (workspace.description) {
      doc.fontSize(10).text(workspace.description);
    }
  }
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Planned Budget: €${planned.toLocaleString()}`);
  doc.text(
    `Actual Spend: €${actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  );
  doc.text(
    `Variance: €${variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  );
  doc.moveDown();

  doc.fontSize(14).text("Line Items", { underline: true });
  doc.moveDown(0.5);

  if (sheet.lines.length === 0) {
    doc.fontSize(12).text("No line items recorded.");
  }

  sheet.lines.forEach((line, index) => {
    doc.fontSize(12).text(`${index + 1}. ${line.name}`);
    const details = [
      `Category: ${line.category}`,
      `Quantity: ${Number(line.quantity).toLocaleString()}${line.unit ? ` ${line.unit}` : ""}`,
      `Unit Price: €${Number(line.unitPrice).toLocaleString()}`,
      `Currency: ${line.currency}`,
    ];
    doc.fontSize(10).text(details.join("  ·  "));
    if (line.notes) {
      doc.fontSize(10).text(`Notes: ${line.notes}`);
    }
    doc.moveDown(0.5);
  });

  doc.end();

  const buffer = await bufferPromise;
  const payload = Uint8Array.from(buffer);

  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename=budget-${headingLabel.replace(/\s+/g, "-")}.pdf`,
    },
  });
}
