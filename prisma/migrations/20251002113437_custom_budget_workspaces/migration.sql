/*
  Warnings:

  - A unique constraint covering the columns `[workspaceId]` on the table `BudgetSheet` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BudgetSheet" ADD COLUMN     "workspaceId" TEXT,
ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "BudgetWorkspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT,
    "ownerId" TEXT,
    "planned" DECIMAL(18,2),
    "actual" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetSheet_workspaceId_key" ON "BudgetSheet"("workspaceId");

-- AddForeignKey
ALTER TABLE "BudgetSheet" ADD CONSTRAINT "BudgetSheet_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BudgetWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetWorkspace" ADD CONSTRAINT "BudgetWorkspace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetWorkspace" ADD CONSTRAINT "BudgetWorkspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
