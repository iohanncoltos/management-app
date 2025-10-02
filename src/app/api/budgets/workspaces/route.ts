import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationError, requireProjectBudgetEdit, requireSession } from "@/lib/authz";
import { recordAuditEvent } from "@/lib/audit";
import {
  createBudgetWorkspace,
  listBudgetWorkspacesForUser,
  serializeWorkspaceSummary,
} from "@/lib/services/budget-service";

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(400).optional(),
  projectId: z.string().cuid().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const projectFilter = searchParams.get("projectId");

    const workspaces = await listBudgetWorkspacesForUser(session.user.id, session.user.permissions ?? []);
    const filtered = projectFilter
      ? workspaces.filter((workspace) => workspace.project?.id === projectFilter)
      : workspaces;

    return NextResponse.json({ workspaces: filtered });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error fetching budget workspaces:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const payload = await request.json();
    const parsed = createWorkspaceSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    const { name, description, projectId } = parsed.data;

    if (projectId) {
      await requireProjectBudgetEdit(projectId);
    }

    const workspace = await createBudgetWorkspace({
      name,
      description,
      ownerId: session.user.id,
      projectId,
    });

    await recordAuditEvent({
      type: "BUDGET",
      entity: "budget_workspace",
      entityId: workspace.id,
      userId: session.user.id,
      data: {
        action: "create",
        workspaceId: workspace.id,
        projectId: projectId ?? undefined,
      },
    });

    return NextResponse.json(serializeWorkspaceSummary(workspace), { status: 201 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error creating budget workspace:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
