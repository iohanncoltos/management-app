import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/redis";
import { createPasswordResetToken } from "@/lib/services/auth-service";
import { resetPasswordRequestSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = resetPasswordRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const rate = await rateLimit({
      key: `reset:${parsed.data.email}`,
      window: 15 * 60 * 1000,
      limit: 3,
    });

    if (!rate.success) {
      return NextResponse.json({ message: "Too many reset requests" }, { status: 429 });
    }

    await createPasswordResetToken(parsed.data.email);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to process request" }, { status: 400 });
  }
}
