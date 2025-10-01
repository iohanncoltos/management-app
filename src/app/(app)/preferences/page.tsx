import { notFound } from "next/navigation";

import { ThemeLayoutForm } from "@/components/preferences/theme-layout-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/authz";
import { getUserPreferences } from "@/lib/services/preferences-service";

export default async function PreferencesPage() {
  const session = await requireSession().catch(() => null);
  if (!session?.user) {
    notFound();
  }

  const preferences = await getUserPreferences(session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preferences"
        description="Tune the visual presentation of your mission console."
      />
      <Card>
        <CardHeader>
          <CardTitle>Theme & Layout</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeLayoutForm initialTheme={preferences.theme} initialDensity={preferences.density} />
        </CardContent>
      </Card>
    </div>
  );
}
