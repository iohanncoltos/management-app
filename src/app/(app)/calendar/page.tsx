import { redirect } from "next/navigation";

import { CalendarShell } from "@/components/calendar/calendar-shell";
import { auth } from "@/lib/auth";
import { getCalendarSchedule } from "@/lib/services/calendar-service";

function parseView(value?: string | string[] | null) {
  if (value === "day" || value === "week" || value === "month") return value;
  return "week";
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const dateParam = typeof params?.date === "string" ? params?.date : undefined;
  const viewParam = typeof params?.view === "string" ? params?.view : undefined;

  const date = dateParam ? new Date(dateParam) : new Date();
  const view = parseView(viewParam);

  const schedule = await getCalendarSchedule({
    date,
    view,
    userId: session.user.id,
  });

  return <CalendarShell initialRange={schedule.range} initialTasks={schedule.tasks} />;
}
