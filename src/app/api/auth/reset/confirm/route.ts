import { NextResponse } from "next/server";

import { resetPasswordWithToken } from "@/lib/services/auth-service";
import { resetPasswordSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = resetPasswordSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    await resetPasswordWithToken(parsed.data.token, parsed.data.password);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to reset password" }, { status: 400 });
  }
}
