import { sendTaskAssignmentEmail } from "./src/lib/mail";

async function testEmail() {
  console.log("🚀 Testing email notification with Resend...\n");

  try {
    await sendTaskAssignmentEmail({
      to: "cosmin@20max.ro", // Sending to yourself for testing
      taskTitle: "Test Task - Email Verification",
      start: new Date(),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      description: "This is a test task to verify that email notifications are working correctly through Resend.",
      projectName: "Test Project",
      assignerName: "System Administrator",
      taskId: "test-task-123",
    });

    console.log("✅ Email sent successfully!");
    console.log("📧 Check your inbox at: cosmin@20max.ro");
    console.log("\nIf you received the email, Resend is working! 🎉");
  } catch (error) {
    console.error("❌ Failed to send email:");
    console.error(error);
    console.log("\n⚠️  Make sure you've added your Resend API key to .env!");
  }
}

testEmail();
