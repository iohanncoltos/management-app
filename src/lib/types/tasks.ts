import { TaskPriority, TaskCategory, TaskStatus } from "@prisma/client";

export { TaskPriority, TaskCategory, TaskStatus };

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  PROJECT_WORK: "Project Work",
  ADMINISTRATIVE: "Administrative",
  TRAINING: "Training",
  REVIEW: "Review",
  RESEARCH: "Research",
  MAINTENANCE: "Maintenance",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  REVIEW: "In Review",
  COMPLETED: "Completed",
};

export const TASK_PRIORITY_OPTIONS = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({
  value: value as TaskPriority,
  label,
}));

export const TASK_CATEGORY_OPTIONS = Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => ({
  value: value as TaskCategory,
  label,
}));

export const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
  value: value as TaskStatus,
  label,
}));

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "text-blue-600 bg-blue-50 border-blue-200",
  MEDIUM: "text-yellow-600 bg-yellow-50 border-yellow-200",
  HIGH: "text-orange-600 bg-orange-50 border-orange-200",
  CRITICAL: "text-red-600 bg-red-50 border-red-200",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  NOT_STARTED: "text-gray-600 bg-gray-50 border-gray-200",
  IN_PROGRESS: "text-blue-600 bg-blue-50 border-blue-200",
  BLOCKED: "text-red-600 bg-red-50 border-red-200",
  REVIEW: "text-purple-600 bg-purple-50 border-purple-200",
  COMPLETED: "text-green-600 bg-green-50 border-green-200",
};

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  PROJECT_WORK: "text-indigo-600 bg-indigo-50 border-indigo-200",
  ADMINISTRATIVE: "text-gray-600 bg-gray-50 border-gray-200",
  TRAINING: "text-emerald-600 bg-emerald-50 border-emerald-200",
  REVIEW: "text-purple-600 bg-purple-50 border-purple-200",
  RESEARCH: "text-cyan-600 bg-cyan-50 border-cyan-200",
  MAINTENANCE: "text-orange-600 bg-orange-50 border-orange-200",
};

export type TaskWithDetails = {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  progress: number;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  estimatedHours: number | null;
  actualHours: number | null;
  projectId: string | null;
  assigneeId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    role?: {
      name: string;
    } | null;
  } | null;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  };
  project?: {
    id: string;
    name: string;
    code: string;
  } | null;
  dependsOn: string[];
  subtasks?: TaskWithDetails[];
  parent?: {
    id: string;
    title: string;
  } | null;
};

export type TaskSummary = {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  start: Date;
  end: Date;
  progress: number;
  assignee?: {
    id: string;
    name: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

export type TaskFilters = {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  category?: TaskCategory[];
  assigneeId?: string;
  projectId?: string;
  createdById?: string;
  search?: string;
  dueSoon?: boolean; // Tasks due within 7 days
  overdue?: boolean; // Tasks past due date
};

export type TaskSortField =
  | "title"
  | "priority"
  | "status"
  | "category"
  | "start"
  | "end"
  | "progress"
  | "createdAt"
  | "updatedAt";

export type TaskSortOrder = "asc" | "desc";

export type TaskSort = {
  field: TaskSortField;
  order: TaskSortOrder;
};