/**
 * Manual test for automatic status updates based on progress
 */

enum TaskStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  BLOCKED = "BLOCKED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

// Replicate the exact logic from route.ts
function getAutoStatus(
  existing: { status: TaskStatus; progress: number },
  updates: { progress?: number; status?: TaskStatus }
): TaskStatus {
  // Check if status hasn't changed (same as in route.ts line 93 and 118)
  const statusUnchanged = !updates.status || updates.status === existing.status;

  let finalStatus = updates.status || existing.status;

  // If progress is 100 and status hasn't changed, set to COMPLETED
  if (updates.progress === 100 && statusUnchanged) {
    finalStatus = TaskStatus.COMPLETED;
  }
  // If progress > 0 and status hasn't changed and current status is NOT_STARTED, set to IN_PROGRESS
  else if (
    updates.progress !== undefined &&
    updates.progress > 0 &&
    statusUnchanged &&
    existing.status === TaskStatus.NOT_STARTED
  ) {
    finalStatus = TaskStatus.IN_PROGRESS;
  }

  return finalStatus;
}

console.log("=== Testing Automatic Status Updates ===\n");

// Test 1: NOT_STARTED -> IN_PROGRESS (status not provided)
console.log("Test 1: NOT_STARTED task, update progress to 25, no status provided");
const test1 = getAutoStatus(
  { status: TaskStatus.NOT_STARTED, progress: 0 },
  { progress: 25 }
);
console.log(`Result: ${test1}`);
console.log(`Expected: IN_PROGRESS`);
console.log(`${test1 === TaskStatus.IN_PROGRESS ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 2: NOT_STARTED -> IN_PROGRESS (status = NOT_STARTED, same as current)
console.log("Test 2: NOT_STARTED task, update progress to 25, status = NOT_STARTED");
const test2 = getAutoStatus(
  { status: TaskStatus.NOT_STARTED, progress: 0 },
  { progress: 25, status: TaskStatus.NOT_STARTED }
);
console.log(`Result: ${test2}`);
console.log(`Expected: IN_PROGRESS`);
console.log(`${test2 === TaskStatus.IN_PROGRESS ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 3: IN_PROGRESS -> COMPLETED
console.log("Test 3: IN_PROGRESS task, update progress to 100");
const test3 = getAutoStatus(
  { status: TaskStatus.IN_PROGRESS, progress: 50 },
  { progress: 100, status: TaskStatus.IN_PROGRESS }
);
console.log(`Result: ${test3}`);
console.log(`Expected: COMPLETED`);
console.log(`${test3 === TaskStatus.COMPLETED ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 4: NOT_STARTED -> COMPLETED (direct, progress 0 -> 100)
console.log("Test 4: NOT_STARTED task, update progress to 100");
const test4 = getAutoStatus(
  { status: TaskStatus.NOT_STARTED, progress: 0 },
  { progress: 100, status: TaskStatus.NOT_STARTED }
);
console.log(`Result: ${test4}`);
console.log(`Expected: COMPLETED`);
console.log(`${test4 === TaskStatus.COMPLETED ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 5: User explicitly changes status (should NOT auto-update)
console.log("Test 5: NOT_STARTED task, update progress to 50, user sets BLOCKED");
const test5 = getAutoStatus(
  { status: TaskStatus.NOT_STARTED, progress: 0 },
  { progress: 50, status: TaskStatus.BLOCKED }
);
console.log(`Result: ${test5}`);
console.log(`Expected: BLOCKED`);
console.log(`${test5 === TaskStatus.BLOCKED ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 6: IN_PROGRESS task, progress changes but status stays same
console.log("Test 6: IN_PROGRESS task, update progress from 25 to 50");
const test6 = getAutoStatus(
  { status: TaskStatus.IN_PROGRESS, progress: 25 },
  { progress: 50, status: TaskStatus.IN_PROGRESS }
);
console.log(`Result: ${test6}`);
console.log(`Expected: IN_PROGRESS (no change)`);
console.log(`${test6 === TaskStatus.IN_PROGRESS ? "✓ PASS" : "✗ FAIL"}\n`);

console.log("=== Test Summary ===");
const allTests = [test1, test2, test3, test4, test5, test6];
const expected = [
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_PROGRESS,
  TaskStatus.COMPLETED,
  TaskStatus.COMPLETED,
  TaskStatus.BLOCKED,
  TaskStatus.IN_PROGRESS,
];
const passed = allTests.filter((result, i) => result === expected[i]).length;
console.log(`${passed}/${allTests.length} tests passed`);
if (passed === allTests.length) {
  console.log("✓ All tests passed!");
} else {
  console.log("✗ Some tests failed!");
  process.exit(1);
}
