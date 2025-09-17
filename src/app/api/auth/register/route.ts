import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { registerUser } from "@/lib/services/auth-service";
import { registerSchema } from "@/lib/validation/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const session = await auth();
    const role = session?.user?.role === Role.ADMIN ? parsed.data.role : Role.MEMBER;

    const user = await registerUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role,
      createdById: session?.user?.id,
    });

    return NextResponse.json({ id: user.id, role: user.role }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to register" }, { status: 400 });
  }
}
