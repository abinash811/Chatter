-- CreateEnum
CREATE TYPE "PendingActionStatus" AS ENUM ('pending', 'approved', 'rejected', 'failed');

-- CreateTable
CREATE TABLE "pending_actions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "status" "PendingActionStatus" NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "pending_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_actions_orgId_idx" ON "pending_actions"("orgId");

-- AddForeignKey
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
