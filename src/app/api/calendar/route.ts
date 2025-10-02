import { NextResponse } from "next/server";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { getCalendarSchedule } from "@/lib/services/calendar-service";

function toDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
}

function parseView(value: string | null) {
  if (value === "day" || value === "week" || value === "month") {
    return value;
  }
  return "week";
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const view = parseView(searchParams.get("view"));
    const date = toDate(searchParams.get("date"), new Date());

    const canViewAllTasks = session.user.permissions.includes("ASSIGN_TASKS");

    const payload = await getCalendarSchedule({
      date,
      view,
      userId: session.user.id,
      canViewAllTasks,
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("Failed to load calendar schedule", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
