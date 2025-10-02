# Status Auto-Update Fix

## Problem
The automatic status update from `NOT_STARTED` to `IN_PROGRESS` was not working when users updated task progress.

## Root Cause
The original logic checked `!updates.status` to determine if status should be auto-updated. However, the frontend was always sending the current status along with progress updates:

```typescript
// From task-detail-modal.tsx line 75
body: JSON.stringify({ progress: editProgress, status: editStatus })
```

This meant `updates.status` was never `undefined`, so the condition `!updates.status` was always false.

## Solution
Changed the logic to check if the status has **actually changed** from the current value:

```typescript
// Old logic (didn't work):
if (updates.progress > 0 && !updates.status && existing.status === TaskStatus.NOT_STARTED)

// New logic (works):
const statusUnchanged = !updates.status || updates.status === existing.status;
if (updates.progress > 0 && statusUnchanged && existing.status === TaskStatus.NOT_STARTED)
```

## Updated Files
- `/src/app/api/tasks/[taskId]/route.ts` - Lines 93, 98, 118, 122

## Test Results
Created comprehensive tests in `test-status-logic.ts`:

✓ Test 1: NOT_STARTED → IN_PROGRESS (no status provided)
✓ Test 2: NOT_STARTED → IN_PROGRESS (status = NOT_STARTED sent)
✓ Test 3: IN_PROGRESS → COMPLETED (progress = 100)
✓ Test 4: NOT_STARTED → COMPLETED (progress = 100, direct)
✓ Test 5: User explicitly changes status (should NOT auto-update)
✓ Test 6: IN_PROGRESS task progress changes (stays IN_PROGRESS)

**All 6 tests passed ✓**

## Behavior

### Automatic Transitions:
1. **NOT_STARTED → IN_PROGRESS**: When progress changes to any value > 0
2. **Any Status → COMPLETED**: When progress = 100

### When Status is NOT Auto-Updated:
- User explicitly changes status to a different value
- Status is already at the target value

### Works for:
- ✅ Regular users (assignees)
- ✅ Users with ASSIGN_TASKS permission (admins/project managers)
