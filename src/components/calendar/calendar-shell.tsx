"use client";

import { eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarTask, CalendarRange } from "@/lib/services/calendar-service";

const PRIORITY_CLASSES: Record<string, string> = {
  CRITICAL: "bg-destructive/20 text-destructive border-destructive/30",
  HIGH: "bg-orange-400/20 text-orange-500 border-orange-400/30",
  MEDIUM: "bg-amber-400/20 text-amber-500 border-amber-400/30",
  LOW: "bg-emerald-400/20 text-emerald-500 border-emerald-400/30",
};

const VIEW_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;

type CalendarView = (typeof VIEW_OPTIONS)[number]["value"];

interface CalendarShellProps {
  initialRange: CalendarRange;
  initialTasks: CalendarTask[];
}

export function CalendarShell({ initialRange, initialTasks }: CalendarShellProps) {
  const [range, setRange] = useState<CalendarRange>(initialRange);
  const [tasks, setTasks] = useState<CalendarTask[]>(initialTasks);
  const [view, setView] = useState<CalendarView>(initialRange.view);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setView(initialRange.view);
  }, [initialRange.view]);

  const handleNavigate = (targetDate: string, nextView = view) => {
    startTransition(async () => {
      const params = new URLSearchParams({ date: targetDate, view: nextView });
      const res = await fetch(`/api/calendar?${params.toString()}`);
      if (!res.ok) {
        console.error("Failed to load calendar schedule");
        return;
      }
      const payload = await res.json();
      setRange(payload.range);
      setTasks(payload.tasks);
    });
  };

  const handleViewChange = (next: CalendarView) => {
    setView(next);
    handleNavigate(range.date, next);
  };

  const handleDateChange = (direction: "prev" | "next") => {
    const target = direction === "prev" ? range.prevDate : range.nextDate;
    handleNavigate(target, view);
  };

  const handleDaySelect = (isoDate: string) => {
    setView("day");
    handleNavigate(isoDate, "day");
  };

  const dayTasksMap = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    tasks.forEach((task) => {
      const start = parseISO(task.start);
      const key = format(start, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()));
    return map;
  }, [tasks]);

  const weekDays = useMemo(() => {
    if (view === "week") {
      return eachDayOfInterval({
        start: parseISO(range.rangeStart),
        end: parseISO(range.rangeEnd),
      });
    }
    return [];
  }, [range.rangeStart, range.rangeEnd, view]);

  const monthDays = useMemo(() => {
    if (view !== "month") return [];
    const start = parseISO(range.rangeStart);
    const end = parseISO(range.rangeEnd);
    return eachDayOfInterval({ start, end });
  }, [range.rangeStart, range.rangeEnd, view]);

  const HOURS = useMemo(() => {
    const startHour = 6;
    const endHour = 20;
    return Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
  }, []);

  const renderTaskBlock = (task: CalendarTask) => {
    const start = new Date(task.start);
    const end = new Date(task.end);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const dayStart = 6 * 60;
    const dayEnd = 20 * 60;
    const clampedStart = Math.max(startMinutes, dayStart);
    const clampedEnd = Math.max(clampedStart + 30, Math.min(endMinutes, dayEnd));
    const top = ((clampedStart - dayStart) / (dayEnd - dayStart)) * 100;
    const height = ((clampedEnd - clampedStart) / (dayEnd - dayStart)) * 100;

    const style = {
      top: `${top}%`,
      height: `${height}%`,
    } as React.CSSProperties;

    return (
      <div
        key={task.id}
        style={style}
        className={`absolute left-1 right-1 rounded-xl border px-3 py-2 text-xs shadow-sm transition ${
          PRIORITY_CLASSES[task.priority] ?? "bg-secondary/60 text-foreground border-transparent"
        }`}
      >
        <p className="font-medium leading-snug">{task.title}</p>
        <p className="text-[10px] text-muted-foreground">
          {format(start, "HH:mm")} – {format(end, "HH:mm")}
          {task.project ? ` · ${task.project.code ?? task.project.name}` : ""}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-background/80">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl font-semibold">
              <CalendarIcon className="h-6 w-6 text-primary" /> Calendar
            </CardTitle>
            <p className="text-sm text-muted-foreground">{format(new Date(range.date), "EEEE, MMMM d, yyyy")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => handleNavigate(new Date().toISOString(), view)}>
              Today
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleDateChange("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDateChange("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Tabs value={view} onValueChange={(val) => handleViewChange(val as CalendarView)}>
              <TabsList className="grid grid-cols-3 rounded-full bg-secondary/60">
                {VIEW_OPTIONS.map((option) => (
                  <TabsTrigger key={option.value} value={option.value} className="rounded-full">
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
      </Card>

      {isPending ? (
        <div className="flex h-[480px] items-center justify-center rounded-3xl border border-border/60 bg-background/80">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <div className={`space-y-6 ${isPending ? "opacity-50" : ""}`}>
        {view === "day" ? (
          <Card className="border-border/70 bg-background/80">
            <CardHeader>
              <CardTitle className="text-lg">Schedule for {format(new Date(range.date), "EEEE, MMM d")}</CardTitle>
            </CardHeader>
            <CardContent className="relative grid grid-cols-[80px_minmax(0,1fr)] gap-4">
              <div className="space-y-6 text-xs text-muted-foreground">
                {HOURS.map((hour) => (
                  <div key={hour} className="h-12">{`${hour}:00`}</div>
                ))}
              </div>
              <div className="relative h-[768px] rounded-3xl border border-border/60 bg-secondary/30 p-2">
                <div className="absolute inset-0">
                  {HOURS.map((hour) => (
                    <div key={hour} className="border-b border-border/40" style={{ height: `${100 / (HOURS.length - 1)}%` }} />
                  ))}
                </div>
                <div className="relative h-full">
                  {(dayTasksMap.get(format(new Date(range.date), "yyyy-MM-dd")) ?? []).map((task) => renderTaskBlock(task))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {view === "week" ? (
          <Card className="border-border/70 bg-background/80">
            <CardHeader>
              <CardTitle className="text-lg">Week overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-[80px_minmax(0,1fr)] gap-4">
              <div className="space-y-6 text-xs text-muted-foreground">
                {HOURS.map((hour) => (
                  <div key={hour} className="h-12">{`${hour}:00`}</div>
                ))}
              </div>
              <div className="relative overflow-x-auto">
                <div className="grid grid-cols-7 gap-4">
                  {weekDays.map((day) => {
                    const iso = format(day, "yyyy-MM-dd");
                    const dayTasks = dayTasksMap.get(iso) ?? [];
                    return (
                      <div key={iso} className="relative h-[768px] rounded-3xl border border-border/60 bg-secondary/30 p-2">
                        <button
                          type="button"
                          onClick={() => handleDaySelect(day.toISOString())}
                          className={`mb-2 flex items-center justify-between rounded-2xl border px-3 py-1 text-xs font-semibold ${
                            isSameDay(day, new Date(range.date))
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/60 text-muted-foreground"
                          }`}
                        >
                          <span>{format(day, "EEE d")}</span>
                        </button>
                        <div className="absolute inset-0 top-9">
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              className="border-b border-border/40"
                              style={{ height: `${100 / (HOURS.length - 1)}%` }}
                            />
                          ))}
                        </div>
                        <div className="relative h-full">
                          {dayTasks.map((task) => renderTaskBlock(task))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {view === "month" ? (
          <Card className="border-border/70 bg-background/80">
            <CardHeader>
              <CardTitle className="text-lg">Month overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-3">
                {monthDays.map((day) => {
                  const iso = format(day, "yyyy-MM-dd");
                  const dayTasks = dayTasksMap.get(iso) ?? [];
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => handleDaySelect(day.toISOString())}
                      className={`flex h-36 flex-col rounded-3xl border p-3 text-left transition ${
                        isSameDay(day, new Date(range.date))
                          ? "border-primary bg-primary/10"
                          : "border-border/60 bg-secondary/40 hover:border-primary/60"
                      }`}
                    >
                      <span className="mb-1 text-xs font-semibold text-muted-foreground">{format(day, "EEE d")}</span>
                      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
                        {dayTasks.slice(0, 3).map((task) => (
                          <div key={task.id} className={`rounded-xl border px-2 py-1 text-xs ${
                            PRIORITY_CLASSES[task.priority] ?? "bg-secondary/60"
                          }`}>
                            <p className="truncate font-medium">{task.title}</p>
                          </div>
                        ))}
                        {dayTasks.length > 3 ? (
                          <span className="text-[10px] font-medium text-primary">+{dayTasks.length - 3} more</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" className="gap-2" asChild>
          <Link href="/tasks">Open task board</Link>
        </Button>
      </div>
    </div>
  );
}
