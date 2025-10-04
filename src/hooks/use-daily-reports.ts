"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface DailyReport {
  id: string;
  reportDate: string;
  projectId: string | null;
  workSummary: string;
  blockers: string | null;
  tomorrowPlan: string | null;
  hoursWorked: number | null;
  tasksCompleted: unknown;
  tasksInProgress: unknown;
  status: "DRAFT" | "SUBMITTED";
  submittedAt: string | null;
  emailedTo: string | null;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    code: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export function useDailyReports(filters?: { projectId?: string; status?: string; startDate?: string; endDate?: string }) {
  return useQuery<DailyReport[]>({
    queryKey: ["daily-reports", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.append("projectId", filters.projectId);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);

      const response = await fetch(`/api/reports/daily?${params}`);
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
  });
}

export function useCreateDailyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<DailyReport>) => {
      const response = await fetch("/api/reports/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create report");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
    },
  });
}

export function useDeleteDailyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(`/api/reports/daily/${reportId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete report");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
    },
  });
}

export function useExportDailyReport() {
  return useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(`/api/reports/daily/${reportId}/export`);
      if (!response.ok) throw new Error("Failed to export report");
      const blob = await response.blob();

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DailyReport_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}

export function useEmailDailyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, additionalEmails }: { reportId: string; additionalEmails?: string[] }) => {
      const response = await fetch(`/api/reports/daily/${reportId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ additionalEmails }),
      });
      if (!response.ok) throw new Error("Failed to email report");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
    },
  });
}
