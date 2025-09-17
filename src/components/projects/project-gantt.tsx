"use client";

import "@syncfusion/ej2-react-gantt/styles/material.css";

import {
  ColumnDirective,
  ColumnsDirective,
  Edit,
  GanttComponent,
  Inject,
  Selection,
  Toolbar,
} from "@syncfusion/ej2-react-gantt";
import { toast } from "sonner";

interface GanttTask {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  progress: number;
  dependsOn: string[];
}

interface ProjectGanttProps {
  tasks: GanttTask[];
}

export function ProjectGantt({ tasks }: ProjectGanttProps) {
  const handleActionComplete = async (args: { requestType?: string; data?: unknown }) => {
    if (args?.requestType === "save" && args.data) {
      const data = Array.isArray(args.data) ? args.data[0] : args.data;
      try {
        await fetch(`/api/tasks/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            start: data.startDate,
            end: data.endDate,
            progress: data.progress,
          }),
        });
      } catch {
        toast.error("Failed to sync task update");
      }
    }
  };

  const dataSource = tasks.map((task) => ({
    ...task,
    startDate: typeof task.start === "string" ? new Date(task.start) : task.start,
    endDate: typeof task.end === "string" ? new Date(task.end) : task.end,
    dependency: task.dependsOn.join(","),
  }));

  return (
    <div className="rounded-3xl border border-border/60 bg-panel-gradient p-4">
      <GanttComponent
        dataSource={dataSource}
        height="500px"
        allowSelection
        highlightWeekends
        editSettings={{ allowEditing: true, allowTaskbarEditing: true, showDeleteConfirmDialog: false }}
        taskFields={{
          id: "id",
          name: "title",
          startDate: "startDate",
          endDate: "endDate",
          progress: "progress",
          dependency: "dependency",
        }}
        timelineSettings={{ timelineUnitSize: 60, topTier: { unit: "Week" }, bottomTier: { unit: "Day" } }}
        splitterSettings={{ columnIndex: 2 }}
        toolbar={["ZoomIn", "ZoomOut", "ZoomToFit", "ExpandAll", "CollapseAll"]}
        rowHeight={50}
        actionComplete={handleActionComplete}
      >
        <ColumnsDirective>
          <ColumnDirective field="title" headerText="Task" width="260" />
          <ColumnDirective field="startDate" headerText="Start" width="120" textAlign="Left" format="yMd" />
          <ColumnDirective field="endDate" headerText="Finish" width="120" textAlign="Left" format="yMd" />
          <ColumnDirective field="progress" headerText="Progress" width="120" textAlign="Right" />
        </ColumnsDirective>
        <Inject services={[Edit, Selection, Toolbar]} />
      </GanttComponent>
    </div>
  );
}
