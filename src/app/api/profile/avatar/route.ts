import { NextResponse } from "next/server";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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
      return NextResponse.json({ message: "Provide an image file" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ message: "Image exceeds 5MB limit" }, { status: 400 });
    }

    const contentType = file.type || "application/octet-stream";
    if (file.type && !ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json({ message: "Unsupported image format" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `avatars/${session.user.id}-${Date.now()}`;

    await uploadToR2({
      key,
      contentType,
      body: buffer,
      cacheControl: "public, max-age=31536000, immutable",
    });

    const avatarUrl = `${env.server.R2_PUBLIC_BASE_URL}/${key}`;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
    });

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Failed to upload avatar", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ avatarUrl: null });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Failed to remove avatar", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
