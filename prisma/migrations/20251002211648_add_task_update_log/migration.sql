-- CreateTable
CREATE TABLE "TaskUpdateLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "milestone" BOOLEAN NOT NULL DEFAULT false,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskUpdateLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskUpdateLog_taskId_createdAt_idx" ON "TaskUpdateLog"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskUpdateLog_createdAt_idx" ON "TaskUpdateLog"("createdAt");

-- CreateIndex
CREATE INDEX "TaskUpdateLog_notified_idx" ON "TaskUpdateLog"("notified");

-- AddForeignKey
ALTER TABLE "TaskUpdateLog" ADD CONSTRAINT "TaskUpdateLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskUpdateLog" ADD CONSTRAINT "TaskUpdateLog_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
