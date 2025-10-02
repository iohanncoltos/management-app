import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { AuthorizationError, requireWorkspaceBudgetEdit, requireWorkspaceView } from "@/lib/authz";
import { recordAuditEvent } from "@/lib/audit";
import {
  getWorkspaceSummaryById,
  serializeWorkspaceSummary,
  updateBudgetWorkspace,
} from "@/lib/services/budget-service";

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

const updateWorkspaceSchema = z
  .object({
    planned: z.number().min(0).nullable().optional(),
    actual: z.number().min(0).nullable().optional(),
  })
  .refine((data) => data.planned !== undefined || data.actual !== undefined, {
    message: "Provide planned and/or actual values",
    path: ["planned"],
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;
    const body = await request.json();
    const parsed = updateWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    const session = await requireWorkspaceBudgetEdit(workspaceId);
    const updateData: Prisma.BudgetWorkspaceUpdateInput = {};

    if (parsed.data.planned !== undefined) {
      updateData.planned = parsed.data.planned !== null ? new Prisma.Decimal(parsed.data.planned) : null;
    }

    if (parsed.data.actual !== undefined) {
      updateData.actual = parsed.data.actual !== null ? new Prisma.Decimal(parsed.data.actual) : null;
    }

    const updated = await updateBudgetWorkspace(workspaceId, updateData);
    const summary = serializeWorkspaceSummary(updated);

    await recordAuditEvent({
      type: "BUDGET",
      entity: "budget_workspace",
      entityId: workspaceId,
      userId: session.user.id,
      data: {
        action: "update",
        workspaceId,
        planned: parsed.data.planned,
        actual: parsed.data.actual,
      },
    });

    return NextResponse.json(summary);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error updating budget workspace:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;
    await requireWorkspaceView(workspaceId);
    const workspace = await getWorkspaceSummaryById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ message: "Workspace not found" }, { status: 404 });
    }
    return NextResponse.json(workspace);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error("Error loading workspace:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
