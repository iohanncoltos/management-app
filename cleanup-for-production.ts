import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

/**
 * Production cleanup script
 * Removes all user data, projects, tasks, reports, etc.
 * Keeps only system roles and admin user for production deployment
 */
async function cleanupForProduction() {
  console.log("🧹 Starting production cleanup...");

  try {
    // Delete in correct order to respect foreign key constraints

    // 1. Delete notifications (references users, tasks, projects)
    console.log("Deleting notifications...");
    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`✅ Deleted ${deletedNotifications.count} notifications`);

    // 2. Delete daily reports (references users, projects)
    console.log("Deleting daily reports...");
    const deletedReports = await prisma.dailyReport.deleteMany({});
    console.log(`✅ Deleted ${deletedReports.count} daily reports`);

    // 3. Delete task update logs (references tasks, users)
    console.log("Deleting task update logs...");
    const deletedTaskLogs = await prisma.taskUpdateLog.deleteMany({});
    console.log(`✅ Deleted ${deletedTaskLogs.count} task update logs`);

    // 4. Delete assignments (references tasks, users)
    console.log("Deleting task assignments...");
    const deletedAssignments = await prisma.assignment.deleteMany({});
    console.log(`✅ Deleted ${deletedAssignments.count} task assignments`);

    // 5. Delete tasks (references projects, users)
    console.log("Deleting tasks...");
    const deletedTasks = await prisma.task.deleteMany({});
    console.log(`✅ Deleted ${deletedTasks.count} tasks`);

    // 6. Delete budget-related data
    console.log("Deleting budget versions...");
    const deletedBudgetVersions = await prisma.budgetVersion.deleteMany({});
    console.log(`✅ Deleted ${deletedBudgetVersions.count} budget versions`);

    console.log("Deleting budget lines...");
    const deletedBudgetLines = await prisma.budgetLine.deleteMany({});
    console.log(`✅ Deleted ${deletedBudgetLines.count} budget lines`);

    console.log("Deleting budget sheets...");
    const deletedBudgetSheets = await prisma.budgetSheet.deleteMany({});
    console.log(`✅ Deleted ${deletedBudgetSheets.count} budget sheets`);

    console.log("Deleting budget workspaces...");
    const deletedBudgetWorkspaces = await prisma.budgetWorkspace.deleteMany({});
    console.log(`✅ Deleted ${deletedBudgetWorkspaces.count} budget workspaces`);

    // 7. Delete files (references projects, users)
    console.log("Deleting files...");
    const deletedFiles = await prisma.file.deleteMany({});
    console.log(`✅ Deleted ${deletedFiles.count} files`);

    // 8. Delete project members (references projects, users)
    console.log("Deleting project members...");
    const deletedProjectMembers = await prisma.projectMember.deleteMany({});
    console.log(`✅ Deleted ${deletedProjectMembers.count} project members`);

    // 9. Delete projects (references users)
    console.log("Deleting projects...");
    const deletedProjects = await prisma.project.deleteMany({});
    console.log(`✅ Deleted ${deletedProjects.count} projects`);

    // 10. Delete audit events (references users)
    console.log("Deleting audit events...");
    const deletedAuditEvents = await prisma.auditEvent.deleteMany({});
    console.log(`✅ Deleted ${deletedAuditEvents.count} audit events`);

    // 11. Delete user-related data (but keep admin)
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";

    console.log("Deleting user preferences (except admin)...");
    const deletedPreferences = await prisma.userPreference.deleteMany({
      where: {
        user: {
          email: {
            not: adminEmail
          }
        }
      }
    });
    console.log(`✅ Deleted ${deletedPreferences.count} user preferences`);

    console.log("Deleting password reset tokens...");
    const deletedTokens = await prisma.passwordResetToken.deleteMany({});
    console.log(`✅ Deleted ${deletedTokens.count} password reset tokens`);

    console.log("Deleting verification tokens...");
    const deletedVerificationTokens = await prisma.verificationToken.deleteMany({});
    console.log(`✅ Deleted ${deletedVerificationTokens.count} verification tokens`);

    console.log("Deleting sessions (except admin)...");
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        user: {
          email: {
            not: adminEmail
          }
        }
      }
    });
    console.log(`✅ Deleted ${deletedSessions.count} sessions`);

    console.log("Deleting accounts (except admin)...");
    const deletedAccounts = await prisma.account.deleteMany({
      where: {
        user: {
          email: {
            not: adminEmail
          }
        }
      }
    });
    console.log(`✅ Deleted ${deletedAccounts.count} accounts`);

    console.log("Deleting passkeys (except admin)...");
    const deletedPasskeys = await prisma.passkey.deleteMany({
      where: {
        user: {
          email: {
            not: adminEmail
          }
        }
      }
    });
    console.log(`✅ Deleted ${deletedPasskeys.count} passkeys`);

    // 12. Delete non-admin users
    console.log("Deleting non-admin users...");
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          not: adminEmail
        }
      }
    });
    console.log(`✅ Deleted ${deletedUsers.count} users (kept admin user)`);

    // Summary
    console.log("\n🎉 Production cleanup completed successfully!");
    console.log("\n📋 What was kept:");
    console.log("  ✅ System roles (ADMIN, PROJECT_MANAGER, USER, VIEWER, etc.)");
    console.log("  ✅ Admin user account");
    console.log("  ✅ Admin user preferences");
    console.log("\n🗑️ What was removed:");
    console.log("  ❌ All projects and project data");
    console.log("  ❌ All tasks and assignments");
    console.log("  ❌ All budget data");
    console.log("  ❌ All files");
    console.log("  ❌ All daily reports");
    console.log("  ❌ All notifications");
    console.log("  ❌ All non-admin users");
    console.log("  ❌ All audit events");
    console.log("\n🚀 Database is now ready for production deployment!");

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
}

async function main() {
  await cleanupForProduction();
}

main()
  .catch((error) => {
    console.error("Failed to cleanup for production:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });