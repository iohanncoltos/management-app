import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * POST /api/files/upload-chat - Upload a file for chat
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Invalid file" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: "File too large. Maximum 10MB" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `chat/${session.user.id}/${Date.now()}-${file.name}`;

    const url = await uploadToR2({
      key,
      contentType: file.type || "application/octet-stream",
      body: buffer,
    });

    return NextResponse.json({
      url,
      name: file.name,
      size: file.size,
      mime: file.type,
    });
  } catch (error) {
    console.error("Error uploading chat file:", error);
    return NextResponse.json(
      { message: "Failed to upload file" },
      { status: 500 }
    );
  }
}
