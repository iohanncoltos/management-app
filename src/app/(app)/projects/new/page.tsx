import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Deploy New Mission"
        description="Define mission parameters, budget envelope, and scheduling horizon."
      />
      <ProjectForm />
    </div>
  );
}
