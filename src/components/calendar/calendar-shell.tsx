"use client";

import { eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [draggedTask, setDraggedTask] = useState<CalendarTask | null>(null);
  const [resizing, setResizing] = useState<{ taskId: string; initialY: number; initialEnd: Date; edge: "top" | "bottom" } | null>(null);
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");

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

  const updateTaskTime = useCallback(
    async (taskId: string, newStart: Date, newEnd: Date) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start: newStart.toISOString(),
            end: newEnd.toISOString(),
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to update task");
        }

        const updatedTask = await res.json();

        // Update local state
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  start: updatedTask.start,
                  end: updatedTask.end,
                }
              : task
          )
        );

        toast.success("Task updated successfully");
      } catch (error) {
        console.error("Failed to update task:", error);
        toast.error("Failed to update task");
      }
    },
    []
  );

  const handleTaskClick = useCallback((task: CalendarTask) => {
    const startDate = new Date(task.start);
    const endDate = new Date(task.end);
    setEditingTask(task);
    setEditStartTime(format(startDate, "HH:mm"));
    setEditEndTime(format(endDate, "HH:mm"));
  }, []);

  const handleSaveTimeEdit = useCallback(() => {
    if (!editingTask) return;

    const startDate = new Date(editingTask.start);
    const endDate = new Date(editingTask.end);

    const [startHour, startMinute] = editStartTime.split(":").map(Number);
    const [endHour, endMinute] = editEndTime.split(":").map(Number);

    if (
      startHour === undefined ||
      startMinute === undefined ||
      endHour === undefined ||
      endMinute === undefined
    ) {
      toast.error("Invalid time format");
      return;
    }

    const newStart = new Date(startDate);
    newStart.setHours(startHour, startMinute, 0, 0);

    const newEnd = new Date(endDate);
    newEnd.setHours(endHour, endMinute, 0, 0);

    if (newEnd <= newStart) {
      toast.error("End time must be after start time");
      return;
    }

    const durationMs = newEnd.getTime() - newStart.getTime();
    const durationMinutes = durationMs / (60 * 1000);

    if (durationMinutes < 15) {
      toast.error(`Task duration must be at least 15 minutes (current: ${Math.round(durationMinutes)} minutes)`);
      return;
    }

    updateTaskTime(editingTask.id, newStart, newEnd);
    setEditingTask(null);
  }, [editingTask, editStartTime, editEndTime, updateTaskTime]);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetDate: Date) => {
      e.preventDefault();
      if (!draggedTask) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const containerHeight = rect.height;
      const percentage = y / containerHeight;

      const dayStart = 9 * 60;
      const dayEnd = 21 * 60;
      const totalMinutes = dayEnd - dayStart;
      const minutesFromStart = Math.round(percentage * totalMinutes);
      const newStartMinutes = dayStart + minutesFromStart;

      const taskStart = new Date(draggedTask.start);
      const taskEnd = new Date(draggedTask.end);
      const durationMs = taskEnd.getTime() - taskStart.getTime();

      const newStart = new Date(targetDate);
      newStart.setHours(Math.floor(newStartMinutes / 60), newStartMinutes % 60, 0, 0);

      const newEnd = new Date(newStart.getTime() + durationMs);

      updateTaskTime(draggedTask.id, newStart, newEnd);
      setDraggedTask(null);
    },
    [draggedTask, updateTaskTime]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent, task: CalendarTask, edge: "top" | "bottom") => {
    e.stopPropagation();
    e.preventDefault();
    setResizing({
      taskId: task.id,
      initialY: e.clientY,
      initialEnd: new Date(task.end),
      edge,
    });
  }, []);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const task = tasks.find((t) => t.id === resizing.taskId);
      if (!task) return;

      const deltaY = e.clientY - resizing.initialY;
      const dayStart = 9 * 60;
      const dayEnd = 21 * 60;
      const totalMinutes = dayEnd - dayStart;
      const minutesPerPixel = totalMinutes / 768; // 768px is the container height
      const deltaMinutes = Math.round(deltaY * minutesPerPixel);

      if (resizing.edge === "bottom") {
        // Resizing bottom edge - change end time
        const newEnd = new Date(resizing.initialEnd.getTime() + deltaMinutes * 60 * 1000);
        const taskStart = new Date(task.start);

        // Ensure minimum duration of 15 minutes
        if (newEnd.getTime() - taskStart.getTime() < 15 * 60 * 1000) {
          return;
        }

        // Update optimistically
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === resizing.taskId ? { ...t, end: newEnd.toISOString() } : t
          )
        );
      } else {
        // Resizing top edge - change start time
        const initialStart = new Date(task.start);
        const newStart = new Date(initialStart.getTime() + deltaMinutes * 60 * 1000);
        const taskEnd = new Date(task.end);

        // Ensure minimum duration of 15 minutes
        if (taskEnd.getTime() - newStart.getTime() < 15 * 60 * 1000) {
          return;
        }

        // Update optimistically
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === resizing.taskId ? { ...t, start: newStart.toISOString() } : t
          )
        );
      }
    };

    const handleMouseUp = () => {
      if (!resizing) return;

      const task = tasks.find((t) => t.id === resizing.taskId);
      if (task) {
        updateTaskTime(task.id, new Date(task.start), new Date(task.end));
      }
      setResizing(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, tasks, updateTaskTime]);

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
    const startHour = 9;
    const endHour = 21;
    return Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
  }, []);

  // Calculate task layout with column positioning for overlapping tasks
  const calculateTaskLayout = (tasks: CalendarTask[]) => {
    const dayStart = 9 * 60;
    const dayEnd = 21 * 60;

    const tasksWithTimes = tasks.map((task) => {
      const start = new Date(task.start);
      const end = new Date(task.end);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();
      const clampedStart = Math.max(startMinutes, dayStart);
      const clampedEnd = Math.max(clampedStart + 30, Math.min(endMinutes, dayEnd));

      return {
        task,
        startMinutes: clampedStart,
        endMinutes: clampedEnd,
        start,
        end,
      };
    });

    // Sort by start time, then by duration (longer first)
    tasksWithTimes.sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) {
        return a.startMinutes - b.startMinutes;
      }
      return b.endMinutes - b.startMinutes - (a.endMinutes - a.startMinutes);
    });

    // Detect overlaps and assign columns
    const taskLayout: Array<{
      task: CalendarTask;
      column: number;
      totalColumns: number;
      top: number;
      height: number;
      start: Date;
      end: Date;
    }> = [];

    tasksWithTimes.forEach((taskWithTime) => {
      // Find overlapping tasks that are already positioned
      const overlapping = taskLayout.filter((layout) => {
        return (
          layout.top < ((taskWithTime.endMinutes - dayStart) / (dayEnd - dayStart)) * 100 &&
          layout.top + layout.height > ((taskWithTime.startMinutes - dayStart) / (dayEnd - dayStart)) * 100
        );
      });

      // Find the first available column
      const usedColumns = new Set(overlapping.map((t) => t.column));
      let column = 0;
      while (usedColumns.has(column)) {
        column++;
      }

      // Calculate total columns needed (max of current and overlapping)
      const maxColumn = Math.max(column, ...overlapping.map((t) => t.column));
      const totalColumns = maxColumn + 1;

      // Update total columns for overlapping tasks
      overlapping.forEach((layout) => {
        layout.totalColumns = Math.max(layout.totalColumns, totalColumns);
      });

      const top = ((taskWithTime.startMinutes - dayStart) / (dayEnd - dayStart)) * 100;
      const height = ((taskWithTime.endMinutes - taskWithTime.startMinutes) / (dayEnd - dayStart)) * 100;

      taskLayout.push({
        task: taskWithTime.task,
        column,
        totalColumns,
        top,
        height,
        start: taskWithTime.start,
        end: taskWithTime.end,
      });
    });

    return taskLayout;
  };

  const renderTaskBlock = (
    layout: {
      task: CalendarTask;
      column: number;
      totalColumns: number;
      top: number;
      height: number;
      start: Date;
      end: Date;
    },
    dayKey?: string
  ) => {
    const { task, column, totalColumns, top, height, start, end } = layout;

    const columnWidth = 100 / totalColumns;
    const left = column * columnWidth;
    const width = columnWidth;

    const style = {
      top: `${top}%`,
      height: `${height}%`,
      left: `${left}%`,
      width: `${width - 1}%`, // -1% for gap between columns
    } as React.CSSProperties;

    // Truncate title if needed
    const shouldTruncate = totalColumns > 1 || task.title.length > 30;
    const displayTitle = shouldTruncate && task.title.length > 25 ? `${task.title.slice(0, 25)}...` : task.title;

    const handleDragStart = (e: React.DragEvent) => {
      setDraggedTask(task);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("taskId", task.id);
      if (dayKey) {
        e.dataTransfer.setData("dayKey", dayKey);
      }
    };

    const handleDragEnd = () => {
      setDraggedTask(null);
    };

    const handleClick = (e: React.MouseEvent) => {
      // Only trigger if not clicking on resize handle
      if ((e.target as HTMLElement).closest('[data-resize-handle]')) {
        return;
      }
      handleTaskClick(task);
    };

    return (
      <div
        key={task.id}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        style={style}
        title={task.title} // Tooltip shows full title
        className={`absolute rounded-lg border px-2 py-1.5 text-xs shadow-sm transition hover:z-10 hover:shadow-md cursor-pointer ${
          draggedTask?.id === task.id ? "opacity-50" : ""
        } ${PRIORITY_CLASSES[task.priority] ?? "bg-secondary/60 text-foreground border-transparent"}`}
      >
        {/* Resize handle at top */}
        <div
          data-resize-handle
          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary/30 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, task, "top")}
        />
        <p className="font-medium leading-tight truncate">{displayTitle}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {format(start, "HH:mm")} – {format(end, "HH:mm")}
          {task.project ? ` · ${task.project.code ?? task.project.name}` : ""}
        </p>
        {/* Resize handle at bottom */}
        <div
          data-resize-handle
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary/30 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, task, "bottom")}
        />
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
                <div
                  className="relative h-full"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, new Date(range.date))}
                >
                  {calculateTaskLayout(dayTasksMap.get(format(new Date(range.date), "yyyy-MM-dd")) ?? []).map((layout) =>
                    renderTaskBlock(layout)
                  )}
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
                        <div
                          className="relative h-full"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, day)}
                        >
                          {calculateTaskLayout(dayTasks).map((layout) => renderTaskBlock(layout, iso))}
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

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-name">Task</Label>
              <p className="text-sm font-medium">{editingTask?.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum task duration: 15 minutes
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTimeEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
