import { notFound } from "next/navigation";

import { MessageForm } from "@/components/messaging/message-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { listProjectSummaries } from "@/lib/services/project-service";

export default async function MessagingPage() {
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const projects = await listProjectSummaries();
  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mission Messaging" description="No missions available yet." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Messaging"
        description="Broadcast mission updates, risk advisories, and stakeholder intelligence."
      />
      <Card>
        <CardHeader>
          <CardTitle>Compose Transmission</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageForm projects={projects} />
        </CardContent>
      </Card>
    </div>
  );
}
