-- CreateTable
CREATE TABLE "custom_actions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "headersEncrypted" TEXT,
    "inputSchema" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_actions_orgId_idx" ON "custom_actions"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_actions_botId_name_key" ON "custom_actions"("botId", "name");

-- AddForeignKey
ALTER TABLE "custom_actions" ADD CONSTRAINT "custom_actions_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
