"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Download, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { useCreateDailyReport, useExportDailyReport, useEmailDailyReport } from "@/hooks/use-daily-reports";
import { useProjects } from "@/hooks/use-projects";

export default function DailyReportPage() {
  const router = useRouter();
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState<string>("");
  const [workSummary, setWorkSummary] = useState("");
  const [blockers, setBlockers] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [additionalEmails, setAdditionalEmails] = useState("");
  const [savedReportId, setSavedReportId] = useState<string | null>(null);

  const { data: projects } = useProjects();
  const createReport = useCreateDailyReport();
  const exportReport = useExportDailyReport();
  const emailReport = useEmailDailyReport();

  const handleSaveDraft = async () => {
    if (!workSummary.trim()) {
      toast.error("Please add a work summary");
      return;
    }

    try {
      const result = await createReport.mutateAsync({
        id: savedReportId || undefined,
        reportDate,
        projectId: projectId && projectId !== "none" ? projectId : null,
        workSummary,
        blockers,
        tomorrowPlan,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
        status: "DRAFT",
      });
      setSavedReportId(result.id);
      toast.success("Draft saved successfully");
    } catch {
      toast.error("Failed to save draft");
    }
  };

  const handleSubmitAndEmail = async () => {
    if (!workSummary.trim()) {
      toast.error("Please add a work summary");
      return;
    }

    try {
      // First save/update the report
      const result = await createReport.mutateAsync({
        id: savedReportId || undefined,
        reportDate,
        projectId: projectId && projectId !== "none" ? projectId : null,
        workSummary,
        blockers,
        tomorrowPlan,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
        status: "SUBMITTED",
      });

      const reportId = result.id;
      setSavedReportId(reportId);

      // Parse additional emails
      const emails = additionalEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.includes("@"));

      // Email the report
      const emailResult = await emailReport.mutateAsync({
        reportId,
        additionalEmails: emails.length > 0 ? emails : undefined,
      });

      toast.success(`Report submitted and emailed to ${emailResult.recipientCount} recipient(s)`);

      // Redirect to history after short delay
      setTimeout(() => router.push("/reports/history"), 1500);
    } catch {
      toast.error("Failed to submit report");
    }
  };

  const handleExport = async () => {
    if (!workSummary.trim()) {
      toast.error("Please add a work summary before exporting");
      return;
    }

    try {
      let reportId = savedReportId;

      // If not saved yet, save as draft first
      if (!reportId) {
        const result = await createReport.mutateAsync({
          reportDate,
          projectId: projectId && projectId !== "none" ? projectId : null,
          workSummary,
          blockers,
          tomorrowPlan,
          hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
          status: "DRAFT",
        });
        reportId = result.id;
        setSavedReportId(reportId);
      }

      if (reportId) {
        await exportReport.mutateAsync(reportId);
        toast.success("Report exported successfully");
      }
    } catch {
      toast.error("Failed to export report");
    }
  };

  const isLoading = createReport.isPending || emailReport.isPending || exportReport.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Work Report"
        description="Document your daily accomplishments and plans"
      />

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and Project */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reportDate">Report Date</Label>
              <Input
                id="reportDate"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectId">Project (Optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project or leave empty for general report" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project (General Report)</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hours Worked */}
          <div className="space-y-2">
            <Label htmlFor="hoursWorked">Hours Worked</Label>
            <Input
              id="hoursWorked"
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder="8.0"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
            />
          </div>

          {/* Work Summary */}
          <div className="space-y-2">
            <Label htmlFor="workSummary">
              Work Summary <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="workSummary"
              placeholder="Describe what you accomplished today..."
              rows={6}
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
              className="resize-none"
            />
          </div>

          {/* Blockers */}
          <div className="space-y-2">
            <Label htmlFor="blockers">Blockers / Issues (Optional)</Label>
            <Textarea
              id="blockers"
              placeholder="Any challenges or blockers you encountered..."
              rows={3}
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              className="resize-none"
            />
          </div>

          {/* Tomorrow's Plan */}
          <div className="space-y-2">
            <Label htmlFor="tomorrowPlan">Tomorrow&apos;s Plan (Optional)</Label>
            <Textarea
              id="tomorrowPlan"
              placeholder="What do you plan to work on tomorrow..."
              rows={3}
              value={tomorrowPlan}
              onChange={(e) => setTomorrowPlan(e.target.value)}
              className="resize-none"
            />
          </div>

          {/* Additional Emails */}
          <div className="space-y-2">
            <Label htmlFor="additionalEmails">Additional Email Recipients (Optional)</Label>
            <Input
              id="additionalEmails"
              placeholder="email1@example.com, email2@example.com"
              value={additionalEmails}
              onChange={(e) => setAdditionalEmails(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Comma-separated emails. Report will automatically be sent to admins and project managers.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isLoading}
            >
              {createReport.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Draft
            </Button>

            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={isLoading}
            >
              {exportReport.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export PDF
            </Button>

            <Button
              onClick={handleSubmitAndEmail}
              disabled={isLoading}
            >
              {emailReport.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit & Email Report
            </Button>
          </div>

          <p className="text-sm text-muted-foreground border-t pt-4">
            <strong>For Intermax Projects Only</strong> - This report contains confidential information
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
