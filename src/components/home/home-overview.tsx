"use client";

import { addMonths, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { HomeOverviewData } from "@/lib/services/home-service";

const weekdayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function buildMonthMatrix(currentMonth: Date) {
  const firstDayOfMonth = startOfMonth(currentMonth);
  const firstVisibleDay = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    days.push(addDays(firstVisibleDay, i));
  }
  return days;
}

const priorityAccent: Record<string, string> = {
  CRITICAL: "bg-destructive/10 text-destructive",
  HIGH: "bg-orange-500/10 text-orange-500",
  MEDIUM: "bg-amber-500/10 text-amber-500",
  LOW: "bg-emerald-500/10 text-emerald-500",
};

function addDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

interface HomeOverviewProps {
  userName: string;
  data: HomeOverviewData;
}

export function HomeOverview({ userName, data }: HomeOverviewProps) {
  const router = useRouter();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const calendarCounts = useMemo(() => {
    const map = new Map<string, number>();
    data.calendar.forEach(({ date, count }) => {
      map.set(date, count);
    });
    return map;
  }, [data.calendar]);

  const monthDays = useMemo(() => buildMonthMatrix(month), [month]);
  const today = new Date();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-border/60 bg-gradient-to-tr from-primary/15 via-primary/10 to-transparent p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Good day</p>
            <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
              Welcome back, {userName.split(" ")[0] ?? "Operator"}!
            </h1>
            <p className="text-muted-foreground">
              Here is your agenda for {format(today, "EEEE, MMMM do")}. Stay sharp and keep the mission on track.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-background/70 px-5 py-3 shadow-sm">
              <Icon icon={Search} className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search anything…" className="border-none bg-transparent p-0 text-sm focus-visible:ring-0" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="border-border/70 bg-background/80">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{format(month, "MMMM yyyy")}</CardTitle>
                <p className="text-xs text-muted-foreground">Tap a date to inspect upcoming objectives.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
                  <Icon icon={ChevronLeft} className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
                  <Icon icon={ChevronRight} className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-semibold text-muted-foreground">
                {weekdayLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 text-center">
                {monthDays.map((date) => {
                  const iso = format(date, "yyyy-MM-dd");
                  const count = calendarCounts.get(iso) ?? 0;
                  const isCurrent = isSameMonth(date, month);
                  const isCurrentDay = isSameDay(date, today);
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => router.push(`/calendar?date=${iso}`)}
                      className={`relative flex h-12 flex-col items-center justify-center rounded-2xl border text-sm transition-colors ${
                        isCurrent ? "border-border/60" : "border-transparent text-muted-foreground/60"
                      } ${isCurrentDay ? "border-primary bg-primary/10 text-primary" : ""}`}
                    >
                      <span>{format(date, "d")}</span>
                      {count > 0 ? (
                        <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/80">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Project directory</CardTitle>
              <Button variant="ghost" size="sm" className="gap-2" asChild>
                <Link href="/projects">
                  View all
                  <Icon icon={ArrowRight} className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.projects.map((project) => (
                <div key={project.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/40 p-3">
                  <div>
                    <p className="font-medium text-foreground">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{project.code}</p>
                  </div>
                  <div className="flex -space-x-3">
                    {project.members.map((member) => (
                      <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                        <AvatarFallback>{member.initials}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              ))}
              {data.projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  No projects assigned yet.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/70 bg-background/80">
            <CardHeader>
              <CardTitle className="text-lg">Urgent tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.urgentTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  No critical tasks for the next few days. Maintain readiness.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.urgentTasks.map((task) => (
                    <div key={task.id} className="flex items-start justify-between rounded-2xl border border-border/60 bg-secondary/50 p-3">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{task.title}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant="outline"
                            className={`border-transparent px-2 py-0.5 ${priorityAccent[task.priority] ?? "bg-secondary/60"}`}
                          >
                            {task.priority.toLowerCase()}
                          </Badge>
                          {task.project ? <span>• {task.project.code ?? task.project.name}</span> : null}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-primary">{task.dueLabel}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Card className="border-border/70 bg-background/80">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Team directory</CardTitle>
                <Button variant="ghost" size="sm" className="gap-2" asChild>
                  <Link href="/resources">
                    Directory
                    <Icon icon={ArrowRight} className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {data.team.map((member) => (
                  <div key={member.id} className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-secondary/30 p-4 text-center">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{member.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{member.name ?? member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.role ?? "Contributor"}</p>
                    </div>
                  </div>
                ))}
                {data.team.length === 0 ? (
                  <div className="col-span-2 rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                    Your mission crew will appear here once assigned.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/80">
              <CardHeader>
                <CardTitle className="text-lg">Quick launch</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {data.quickLinks.map((link) => (
                  <Button key={link.href} variant="outline" className="justify-between rounded-2xl border-border/60" asChild>
                    <Link href={link.href}>
                      {link.label}
                      <Icon icon={ArrowRight} className="h-4 w-4" />
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => router.push("/calendar")}
        >
          View full calendar
        </Button>
        <Button variant="outline" className="gap-2" asChild>
          <Link href="/tasks">Open task board</Link>
        </Button>
      </div>
    </div>
  );
}
