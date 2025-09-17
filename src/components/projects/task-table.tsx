"use client";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import { CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ProjectTask {
  id: string;
  title: string;
  start: Date;
  end: Date;
  progress: number;
  assignee?: { id: string; name: string | null } | null;
}

interface TaskTableProps {
  tasks: ProjectTask[];
  canEdit: boolean;
  onUpdated?: () => void;
}

export function TaskTable({ tasks, canEdit, onUpdated }: TaskTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const markComplete = async (taskId: string) => {
    setLoadingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: 100 }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      toast.success("Task updated");
      router.refresh();
      onUpdated?.();
    } catch {
      toast.error("Unable to update task");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Schedule</TableHead>
          <TableHead>Progress</TableHead>
          {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <div className="font-medium text-foreground">{task.title}</div>
              {task.progress === 100 ? <Badge variant="success">Complete</Badge> : null}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{task.assignee?.name ?? "Unassigned"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {format(task.start, "dd MMM yyyy")} Ă„â€šĂ˘â‚¬ĹľÄ‚ËĂ˘â€šÂ¬ÄąË‡Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ă„Ä…Ă„ÄľÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ‚ÂĂ„â€šĂ‹ÂÄ‚ËĂ˘â€šÂ¬ÄąË‡Ä‚â€šĂ‚Â¬Ä‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡Ă„â€šĂ˘â‚¬ĹľÄ‚ËĂ˘â€šÂ¬ÄąË‡Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€žĂ˘â‚¬Â¦Ä‚â€žĂ˘â‚¬ĹˇÄ‚ËĂ˘â€šÂ¬ÄąË‡Ă„â€šĂ˘â‚¬ĹˇÄ‚â€šĂ‚ÂÄ‚â€žĂ˘â‚¬ĹˇÄ‚ËĂ˘â€šÂ¬ÄąÄľĂ„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ă„Ä…Ă‹â€ˇÄ‚â€žĂ˘â‚¬ĹˇÄ‚ËĂ˘â€šÂ¬Ă„â€¦Ă„â€šĂ˘â‚¬ĹˇÄ‚â€šĂ‚ÂĂ„â€šĂ˘â‚¬ĹľÄ‚ËĂ˘â€šÂ¬ÄąË‡Ă„â€šĂ˘â‚¬Ä…Ä‚â€šĂ‚ÂÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ‚ÂĂ„â€šĂ‹ÂÄ‚ËĂ˘â€šÂ¬ÄąË‡Ä‚â€šĂ‚Â¬Ä‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡Ä‚â€žĂ˘â‚¬ĹˇÄ‚ËĂ˘â€šÂ¬ÄąË‡Ă„â€šĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â¬Ă„â€šĂ˘â‚¬ĹľÄ‚ËĂ˘â€šÂ¬ÄąË‡Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ă„Ä…Ă‹â€ˇÄ‚â€žĂ˘â‚¬ĹˇÄ‚ËĂ˘â€šÂ¬ÄąË‡Ă„â€šĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â Ä‚â€žĂ˘â‚¬ĹˇÄ‚ËĂ˘â€šÂ¬ÄąÄľĂ„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ă„Ä…Ă‹â€ˇÄ‚â€žĂ˘â‚¬ĹˇÄ‚ËĂ˘â€šÂ¬Ă„â€¦Ă„â€šĂ˘â‚¬ĹˇÄ‚â€šĂ‚ÂĂ„â€šĂ˘â‚¬ĹľÄ‚ËĂ˘â€šÂ¬ÄąË‡Ă„â€šĂ˘â‚¬Ä…Ä‚â€šĂ‚ÂÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ‚ÂĂ„â€šĂ‹ÂÄ‚ËĂ˘â€šÂ¬ÄąË‡Ä‚â€šĂ‚Â¬Ä‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡Ä‚â€žĂ˘â‚¬ĹˇÄ‚ËĂ˘â€šÂ¬ÄąË‡Ă„â€šĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â¬Ă„â€šĂ˘â‚¬ĹľÄ‚ËĂ˘â€šÂ¬ÄąË‡Ă„â€šĂ˘â‚¬Ä…Ä‚â€šĂ‚ÂÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ‚ÂĂ„â€šĂ‹ÂÄ‚ËĂ˘â€šÂ¬ÄąË‡Ä‚â€šĂ‚Â¬Ä‚â€žĂ„â€¦Ä‚â€žĂ„ÄľÄ‚â€žĂ˘â‚¬ĹˇÄ‚ËĂ˘â€šÂ¬Ă„â€¦Ă„â€šĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â {format(task.end, "dd MMM yyyy")}
            </TableCell>
            <TableCell className="w-48">
              <div className="flex items-center gap-3">
                <Progress value={task.progress} />
                <span className="text-sm text-foreground">{task.progress}%</span>
              </div>
            </TableCell>
            {canEdit ? (
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={task.progress === 100 || loadingId === task.id}
                  onClick={() => markComplete(task.id)}
                >
                  {loadingId === task.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                  Mark complete
                </Button>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
        {tasks.length === 0 ? (
          <TableRow>
            <TableCell colSpan={canEdit ? 5 : 4} className="py-8 text-center text-sm text-muted-foreground">
              No tasks registered.
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}
