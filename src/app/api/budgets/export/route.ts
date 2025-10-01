import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

import { requireProjectView } from "@/lib/authz";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ message: "projectId is required" }, { status: 400 });
  }

  await requireProjectView(projectId);

  const sheet = await prisma.budgetSheet.findUnique({
    where: { projectId },
    include: {
      project: {
        select: {
          name: true,
          code: true,
          budgetPlanned: true,
          budgetActual: true,
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
  const planned = project?.budgetPlanned ? Number(project.budgetPlanned) : 0;
  const actual = sheet.lines.reduce((total, line) => {
    const lineTotal = Number(line.quantity) * Number(line.unitPrice);
    const vatRate = sheet.vatDefault ? Number(sheet.vatDefault) : 0;
    const vatAmount = vatRate ? lineTotal * (vatRate / 100) : 0;
    return total + lineTotal + vatAmount;
  }, 0);

  const variance = planned ? actual - planned : actual;

  const doc = new PDFDocument({ margin: 40, font: "Helvetica" });
  const chunks: Buffer[] = [];
  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.fontSize(18).text(`Budget Summary - ${project?.code ?? "Project"}`, { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Project: ${project?.name ?? "Unknown"}`);
  doc.text(`Planned Budget: €${planned.toLocaleString()}`);
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
  const arrayBuffer = Uint8Array.from(buffer).buffer;

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename=budget-${project?.code ?? projectId}.pdf`,
    },
  });
}
