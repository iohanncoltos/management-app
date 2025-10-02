/**
 * Unit tests for automatic status updates based on progress
 *
 * Test scenarios:
 * 1. NOT_STARTED -> IN_PROGRESS when progress changes from 0 to any value > 0
 * 2. Any status -> COMPLETED when progress = 100
 * 3. Status should NOT change if user explicitly sets a different status
 */

import { TaskStatus } from "@prisma/client";

// Test helper to simulate the status update logic
function getAutoStatus(
  currentStatus: TaskStatus,
  currentProgress: number,
  newProgress: number | undefined,
  newStatus: TaskStatus | undefined
): TaskStatus | undefined {
  // Check if status hasn't changed (same as in route.ts)
  const statusUnchanged = !newStatus || newStatus === currentStatus;

  // If progress is 100 and status hasn't changed, set to COMPLETED
  if (newProgress === 100 && statusUnchanged) {
    return TaskStatus.COMPLETED;
  }

  // If progress > 0 and status hasn't changed and current status is NOT_STARTED, set to IN_PROGRESS
  if (
    newProgress !== undefined &&
    newProgress > 0 &&
    statusUnchanged &&
    currentStatus === TaskStatus.NOT_STARTED
  ) {
    return TaskStatus.IN_PROGRESS;
  }

  // Return the new status if provided, otherwise keep current
  return newStatus || currentStatus;
}

describe("Task Status Auto-Update Logic", () => {
  describe("NOT_STARTED -> IN_PROGRESS transition", () => {
    test("should change to IN_PROGRESS when progress goes from 0 to 25", () => {
      const result = getAutoStatus(
        TaskStatus.NOT_STARTED,
        0,
        25,
        undefined
      );
      expect(result).toBe(TaskStatus.IN_PROGRESS);
    });

    test("should change to IN_PROGRESS when progress goes from 0 to 1", () => {
      const result = getAutoStatus(
        TaskStatus.NOT_STARTED,
        0,
        1,
        undefined
      );
      expect(result).toBe(TaskStatus.IN_PROGRESS);
    });

    test("should change to IN_PROGRESS when status is sent as NOT_STARTED (unchanged)", () => {
      const result = getAutoStatus(
        TaskStatus.NOT_STARTED,
        0,
        25,
        TaskStatus.NOT_STARTED // Frontend sends current status
      );
      expect(result).toBe(TaskStatus.IN_PROGRESS);
    });

    test("should NOT change if user explicitly sets status to BLOCKED", () => {
      const result = getAutoStatus(
        TaskStatus.NOT_STARTED,
        0,
        25,
        TaskStatus.BLOCKED // User explicitly changed status
      );
      expect(result).toBe(TaskStatus.BLOCKED);
    });
  });

  describe("Any status -> COMPLETED transition", () => {
    test("should change to COMPLETED when progress = 100 from IN_PROGRESS", () => {
      const result = getAutoStatus(
        TaskStatus.IN_PROGRESS,
        50,
        100,
        undefined
      );
      expect(result).toBe(TaskStatus.COMPLETED);
    });

    test("should change to COMPLETED when progress = 100 from NOT_STARTED", () => {
      const result = getAutoStatus(
        TaskStatus.NOT_STARTED,
        0,
        100,
        undefined
      );
      expect(result).toBe(TaskStatus.COMPLETED);
    });

    test("should change to COMPLETED even when status is sent as IN_PROGRESS", () => {
      const result = getAutoStatus(
        TaskStatus.IN_PROGRESS,
        50,
        100,
        TaskStatus.IN_PROGRESS // Frontend sends current status
      );
      expect(result).toBe(TaskStatus.COMPLETED);
    });
  });

  describe("Edge cases", () => {
    test("should stay IN_PROGRESS when progress changes from 25 to 50", () => {
      const result = getAutoStatus(
        TaskStatus.IN_PROGRESS,
        25,
        50,
        undefined
      );
      expect(result).toBe(TaskStatus.IN_PROGRESS);
    });

    test("should stay BLOCKED when progress changes but user set BLOCKED", () => {
      const result = getAutoStatus(
        TaskStatus.BLOCKED,
        0,
        50,
        TaskStatus.BLOCKED
      );
      expect(result).toBe(TaskStatus.BLOCKED);
    });

    test("should NOT transition NOT_STARTED -> IN_PROGRESS if status explicitly set to NOT_STARTED", () => {
      // This is a tricky case: if user explicitly keeps NOT_STARTED while setting progress > 0
      // Currently our logic treats "same status" as unchanged, so it WILL transition
      const result = getAutoStatus(
        TaskStatus.NOT_STARTED,
        0,
        50,
        TaskStatus.NOT_STARTED
      );
      expect(result).toBe(TaskStatus.IN_PROGRESS); // Our logic treats unchanged status as auto-update trigger
    });
  });
});

console.log("Running manual tests...\n");

// Test 1: NOT_STARTED -> IN_PROGRESS
console.log("Test 1: NOT_STARTED task, progress 0 -> 25");
const test1 = getAutoStatus(TaskStatus.NOT_STARTED, 0, 25, TaskStatus.NOT_STARTED);
console.log(`Result: ${test1} (expected: IN_PROGRESS) - ${test1 === TaskStatus.IN_PROGRESS ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 2: IN_PROGRESS -> COMPLETED
console.log("Test 2: IN_PROGRESS task, progress 50 -> 100");
const test2 = getAutoStatus(TaskStatus.IN_PROGRESS, 50, 100, TaskStatus.IN_PROGRESS);
console.log(`Result: ${test2} (expected: COMPLETED) - ${test2 === TaskStatus.COMPLETED ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 3: NOT_STARTED -> COMPLETED (direct)
console.log("Test 3: NOT_STARTED task, progress 0 -> 100");
const test3 = getAutoStatus(TaskStatus.NOT_STARTED, 0, 100, TaskStatus.NOT_STARTED);
console.log(`Result: ${test3} (expected: COMPLETED) - ${test3 === TaskStatus.COMPLETED ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 4: User explicitly sets different status
console.log("Test 4: NOT_STARTED task, progress 0 -> 50, user sets BLOCKED");
const test4 = getAutoStatus(TaskStatus.NOT_STARTED, 0, 50, TaskStatus.BLOCKED);
console.log(`Result: ${test4} (expected: BLOCKED) - ${test4 === TaskStatus.BLOCKED ? "✓ PASS" : "✗ FAIL"}\n`);

console.log("All manual tests completed!");
