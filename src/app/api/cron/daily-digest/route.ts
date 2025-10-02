import { NextResponse } from "next/server";

import { getDailyDigestData } from "@/lib/services/task-digest-service";
import { sendDailyDigestEmail } from "@/lib/mail";
import { prisma } from "@/lib/db";

/**
 * Daily Digest Cron Job
 * Runs daily at 6 PM to send task update summaries
 *
 * Security: Should be protected by Vercel Cron Secret
 */
export async function GET(request: Request) {
  try {
    // Verify this is a legitimate cron job request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Daily Digest] Starting daily digest generation...");

    // Get digest data for all creators
    const digestData = await getDailyDigestData();

    console.log(`[Daily Digest] Found ${digestData.length} creators to notify`);

    const results = {
      total: digestData.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send digest email to each creator
    for (const data of digestData) {
      try {
        console.log(`[Daily Digest] Sending digest to ${data.creatorEmail}...`);

        await sendDailyDigestEmail({
          to: data.creatorEmail,
          recipientName: data.creatorName,
          progressUpdates: data.progressUpdates.map((u) => ({
            taskTitle: u.taskTitle,
            assigneeName: u.assigneeName,
            oldValue: u.oldValue,
            newValue: u.newValue,
            milestone: u.milestone,
            projectName: u.projectName,
          })),
          completedTasks: data.completedTasks.map((t) => ({
            taskTitle: t.taskTitle,
            assigneeName: t.assigneeName,
            projectName: t.projectName,
          })),
          blockedTasks: data.blockedTasks.map((t) => ({
            taskTitle: t.taskTitle,
            assigneeName: t.assigneeName,
            projectName: t.projectName,
          })),
          tasksInProgress: data.tasksInProgress,
          hasUpdates: data.hasUpdates,
        });

        results.sent++;

        // Mark all updates for this creator as notified
        if (data.hasUpdates) {
          const updateIds = [
            ...data.progressUpdates,
            ...data.completedTasks,
            ...data.blockedTasks,
            ...data.statusChanges,
          ].map((u) => u.taskId);

          // Get the actual update log IDs
          const updates = await prisma.taskUpdateLog.findMany({
            where: {
              taskId: { in: updateIds },
              notified: false,
            },
            select: { id: true },
          });

          await prisma.taskUpdateLog.updateMany({
            where: {
              id: { in: updates.map((u) => u.id) },
            },
            data: {
              notified: true,
            },
          });

          console.log(`[Daily Digest] Marked ${updates.length} updates as notified for ${data.creatorEmail}`);
        }
      } catch (error) {
        console.error(`[Daily Digest] Failed to send to ${data.creatorEmail}:`, error);
        results.failed++;
        results.errors.push(`${data.creatorEmail}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    console.log(`[Daily Digest] Completed. Sent: ${results.sent}, Failed: ${results.failed}`);

    return NextResponse.json({
      success: true,
      message: `Daily digest sent to ${results.sent} recipients`,
      results,
    });
  } catch (error) {
    console.error("[Daily Digest] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
