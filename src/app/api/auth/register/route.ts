import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { registerUser } from "@/lib/services/auth-service";
import { registerSchema } from "@/lib/validation/auth";

function normalizeRole(role?: string) {
  return role?.trim().replace(/\s+/g, "_").toUpperCase();
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const session = await auth();
    const canAssignRoles = session?.user?.permissions.includes("MANAGE_USERS") ?? false;
    const requestedRole = normalizeRole(parsed.data.role);
    const role = canAssignRoles ? requestedRole : undefined;

    const user = await registerUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role,
      createdById: session?.user?.id,
    });

    return NextResponse.json({ id: user.id, role: user.role?.name ?? null }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to register" }, { status: 400 });
  }
}
