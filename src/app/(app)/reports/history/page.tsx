"use client";

import { useState } from "react";
import { FileText, Download, Mail, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  useDailyReports,
  useDeleteDailyReport,
  useExportDailyReport,
} from "@/hooks/use-daily-reports";

export default function ReportHistoryPage() {
  const { data: reports, isLoading } = useDailyReports();
  const deleteReport = useDeleteDailyReport();
  const exportReport = useExportDailyReport();

  const handleDelete = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      await deleteReport.mutateAsync(reportId);
      toast.success("Report deleted");
    } catch (error) {
      toast.error("Failed to delete report");
    }
  };

  const handleExport = async (reportId: string) => {
    try {
      await exportReport.mutateAsync(reportId);
      toast.success("Report exported");
    } catch (error) {
      toast.error("Failed to export report");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Report History"
          description="View and manage your daily work reports"
        />
        <Button onClick={() => (window.location.href = "/reports/daily")}>
          <FileText className="mr-2 h-4 w-4" />
          New Report
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Loading reports...</p>
        </Card>
      ) : !reports || reports.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
          <p className="text-muted-foreground mb-4">Create your first daily work report</p>
          <Button onClick={() => (window.location.href = "/reports/daily")}>
            Create Report
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {new Date(report.reportDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>
                    <Badge variant={report.status === "SUBMITTED" ? "default" : "outline"}>
                      {report.status}
                    </Badge>
                  </div>

                  {report.project && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Project: <span className="text-primary font-medium">{report.project.name}</span>
                    </p>
                  )}

                  {report.hoursWorked && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Hours Worked: <span className="font-medium">{report.hoursWorked}</span>
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground line-clamp-2 mt-3">
                    {report.workSummary}
                  </p>

                  {report.submittedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Submitted: {new Date(report.submittedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleExport(report.id)}
                    title="Export PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(report.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
