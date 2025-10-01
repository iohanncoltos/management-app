import { NextResponse } from "next/server";
import { z } from "zod";
import { LayoutDensityPreference, ThemePreference } from "@prisma/client";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { upsertUserPreferences } from "@/lib/services/preferences-service";

const schema = z.object({
  theme: z.nativeEnum(ThemePreference),
  density: z.nativeEnum(LayoutDensityPreference),
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

    const updated = await upsertUserPreferences(session.user.id, parsed.data);

    return NextResponse.json(updated);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error updating theme preferences:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};
