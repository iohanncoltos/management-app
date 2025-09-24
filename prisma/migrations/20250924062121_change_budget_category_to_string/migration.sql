/*
  Warnings:

  - Changed the type of `category` on the `BudgetLine` table from enum to string to support custom categories.

*/

-- Step 1: Add a new temporary column
ALTER TABLE "public"."BudgetLine" ADD COLUMN "category_new" TEXT;

-- Step 2: Convert enum values to string values
UPDATE "public"."BudgetLine" SET "category_new" = "category"::text;

-- Step 3: Drop the old column and rename the new one
ALTER TABLE "public"."BudgetLine" DROP COLUMN "category";
ALTER TABLE "public"."BudgetLine" RENAME COLUMN "category_new" TO "category";

-- Step 4: Make the column NOT NULL
ALTER TABLE "public"."BudgetLine" ALTER COLUMN "category" SET NOT NULL;

-- Step 5: Recreate the index
CREATE INDEX "BudgetLine_sheetId_category_idx" ON "public"."BudgetLine"("sheetId", "category");
