-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CHAT_MENTION';

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "mentionAll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mentions" TEXT[];

-- CreateIndex
CREATE INDEX "ChatMessage_mentions_idx" ON "ChatMessage"("mentions");
