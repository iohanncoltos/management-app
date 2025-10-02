import { redirect } from "next/navigation";

import { HomeOverview } from "@/components/home/home-overview";
import { auth } from "@/lib/auth";
import { getHomeOverview } from "@/lib/services/home-service";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const overview = await getHomeOverview(session.user.id, session.user.permissions ?? []);

  return <HomeOverview userName={session.user.name ?? "Operator"} data={overview} />;
}
