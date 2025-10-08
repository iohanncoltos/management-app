import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createProjectChat } from "@/lib/services/chat-service";
import { prisma } from "@/lib/db";

/**
 * POST /api/chat/project - Create a project chat (admin/PM only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission (admins or users with MANAGE_PROJECTS permission)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    const permissions = user?.role?.permissions.map((p) => p.action) ?? [];
    const canManageChats = permissions.includes("MANAGE_PROJECTS") || permissions.includes("MANAGE_USERS");

    if (!canManageChats) {
      return NextResponse.json(
        { error: "Only admins and project managers can create project chats" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { projectId, name, memberUserIds } = body;

    if (!projectId || !name || !Array.isArray(memberUserIds)) {
      return NextResponse.json(
        { error: "projectId, name, and memberUserIds are required" },
        { status: 400 }
      );
    }

    if (memberUserIds.length === 0) {
      return NextResponse.json(
        { error: "At least one member is required" },
        { status: 400 }
      );
    }

    // Ensure creator is included in members
    if (!memberUserIds.includes(session.user.id)) {
      memberUserIds.push(session.user.id);
    }

    const chat = await createProjectChat(
      projectId,
      name,
      session.user.id,
      memberUserIds
    );

    return NextResponse.json({ chat });
  } catch (error) {
    console.error("Error creating project chat:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create chat" },
      { status: 500 }
    );
  }
}
