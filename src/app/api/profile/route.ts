import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80, "First name is too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(80, "Last name is too long"),
});

type RouteHandler = (request: Request) => Promise<NextResponse>;

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

export const PATCH: RouteHandler = async (request) => {
  try {
    const session = await requireSession();

    const payload = await request.json().catch(() => null);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.replace(/\s+/g, " ").trim();

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: fullName,
      },
      select: {
        name: true,
      },
    });

    return NextResponse.json({ name: updated.name });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error updating profile:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};
