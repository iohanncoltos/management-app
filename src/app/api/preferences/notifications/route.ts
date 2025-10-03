import { NextResponse } from "next/server";

import { requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

/**
 * GET /api/preferences/notifications
 * Fetch user's notification preferences
 */
export async function GET() {
  try {
    const session = await requireSession();

    const preferences = await prisma.userPreference.findUnique({
      where: { userId: session.user.id },
      select: {
        notificationSound: true,
        emailNotifications: true,
        desktopNotifications: true,
        doNotDisturbUntil: true,
      },
    });

    // Return defaults if no preferences exist
    if (!preferences) {
      return NextResponse.json({
        notificationSound: true,
        emailNotifications: true,
        desktopNotifications: false,
        doNotDisturbUntil: null,
      });
    }

    return NextResponse.json({
      notificationSound: preferences.notificationSound,
      emailNotifications: preferences.emailNotifications,
      desktopNotifications: preferences.desktopNotifications,
      doNotDisturbUntil: preferences.doNotDisturbUntil?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/preferences/notifications
 * Update user's notification preferences
 */
export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const { notificationSound, emailNotifications, desktopNotifications, doNotDisturbUntil } = body;

    // Validate input
    const updates: {
      notificationSound?: boolean;
      emailNotifications?: boolean;
      desktopNotifications?: boolean;
      doNotDisturbUntil?: Date | null;
    } = {};

    if (typeof notificationSound === "boolean") {
      updates.notificationSound = notificationSound;
    }
    if (typeof emailNotifications === "boolean") {
      updates.emailNotifications = emailNotifications;
    }
    if (typeof desktopNotifications === "boolean") {
      updates.desktopNotifications = desktopNotifications;
    }
    if (doNotDisturbUntil !== undefined) {
      updates.doNotDisturbUntil = doNotDisturbUntil ? new Date(doNotDisturbUntil) : null;
    }

    // Upsert preferences
    const preferences = await prisma.userPreference.upsert({
      where: { userId: session.user.id },
      update: updates,
      create: {
        userId: session.user.id,
        ...updates,
      },
      select: {
        notificationSound: true,
        emailNotifications: true,
        desktopNotifications: true,
        doNotDisturbUntil: true,
      },
    });

    return NextResponse.json({
      notificationSound: preferences.notificationSound,
      emailNotifications: preferences.emailNotifications,
      desktopNotifications: preferences.desktopNotifications,
      doNotDisturbUntil: preferences.doNotDisturbUntil?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
