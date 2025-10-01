import { notFound } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/authz";

function splitName(fullName: string | null | undefined) {
  if (!fullName) {
    return { firstName: "", lastName: "" };
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = parts;
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

export default async function ProfilePage() {
  const session = await requireSession().catch(() => null);
  if (!session?.user) {
    notFound();
  }

  const { firstName, lastName } = splitName(session.user.name);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Update your operator identity details."
      />
      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            firstName={firstName}
            lastName={lastName}
            email={session.user.email ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
