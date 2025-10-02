import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths, subWeeks, subMonths, addDays, subDays } from "date-fns";
import type { TaskPriority, TaskStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

type CalendarView = "day" | "week" | "month";

export type CalendarTask = {
  id: string;
  title: string;
  start: string;
  end: string;
  status: TaskStatus;
  priority: TaskPriority;
  project?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
};

export type CalendarRange = {
  view: CalendarView;
  date: string;
  rangeStart: string;
  rangeEnd: string;
  prevDate: string;
  nextDate: string;
};

interface CalendarParams {
  date: Date;
  view: CalendarView;
  userId: string;
}

function computeRange(date: Date, view: CalendarView): CalendarRange {
  if (view === "day") {
    const start = startOfDay(date);
    const end = endOfDay(date);
    return {
      view,
      date: date.toISOString(),
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      prevDate: subDays(date, 1).toISOString(),
      nextDate: addDays(date, 1).toISOString(),
    };
  }

  if (view === "week") {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return {
      view,
      date: date.toISOString(),
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      prevDate: subWeeks(date, 1).toISOString(),
      nextDate: addWeeks(date, 1).toISOString(),
    };
  }

  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return {
    view,
    date: date.toISOString(),
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    prevDate: subMonths(date, 1).toISOString(),
    nextDate: addMonths(date, 1).toISOString(),
  };
}

export async function getCalendarSchedule({ date, view, userId }: CalendarParams) {
  const range = computeRange(date, view);

  const overlapFilter = {
    start: { lte: new Date(range.rangeEnd) },
    end: { gte: new Date(range.rangeStart) },
  };

  // Calendar should always show only user's own tasks
  const taskWhere = {
    assigneeId: userId,
    ...overlapFilter,
  };

  const tasks = await prisma.task.findMany({
    where: taskWhere,
    orderBy: [{ start: "asc" }],
    include: {
      project: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  const normalized: CalendarTask[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    start: task.start.toISOString(),
    end: task.end.toISOString(),
    status: task.status,
    priority: task.priority,
    project: task.project ? { id: task.project.id, name: task.project.name, code: task.project.code } : null,
  }));

  return { range, tasks: normalized };
}
