import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getR2SignedUrl } from "@/lib/r2";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  let { userId } = await context.params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Support "me" alias for current user
  if (userId === "me") {
    userId = session.user.id;
  }

  // Check if user is requesting their own CV or is an admin
  const isOwnCV = session.user.id === userId;
  const isAdmin = session.user.permissions.includes("MANAGE_USERS");

  if (!isOwnCV && !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cvUrl: true },
  });

  if (!user?.cvUrl) {
    return NextResponse.json({ message: "CV not found" }, { status: 404 });
  }

  // Extract the key from the URL
  // URL format: https://{account}.r2.cloudflarestorage.com/{key}
  const url = new URL(user.cvUrl);
  const key = url.pathname.substring(1); // Remove leading slash

  // Generate signed URL (valid for 1 hour)
  const signedUrl = await getR2SignedUrl(key, 3600);

  return NextResponse.redirect(signedUrl);
}
