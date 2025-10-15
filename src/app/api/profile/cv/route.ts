import { NextResponse } from "next/server";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Provide a CV file" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ message: "CV file exceeds 10MB limit" }, { status: 400 });
    }

    const contentType = file.type || "application/octet-stream";
    if (file.type && !ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json({ message: "Unsupported file format. Please upload PDF or Word documents." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = file.name.split(".").pop() || "pdf";
    const key = `cvs/${session.user.id}-${Date.now()}.${fileExtension}`;

    await uploadToR2({
      key,
      contentType,
      body: buffer,
      cacheControl: "private, max-age=3600",
    });

    const cvUrl = `${env.server.R2_PUBLIC_BASE_URL}/${key}`;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        cvUrl,
        cvFileName: file.name,
      },
    });

    return NextResponse.json({ cvUrl, cvFileName: file.name });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Failed to upload CV", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        cvUrl: null,
        cvFileName: null,
      },
    });

    return NextResponse.json({ cvUrl: null, cvFileName: null });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Failed to remove CV", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
