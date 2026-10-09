-- CreateTable
CREATE TABLE "widgets" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerDescription" TEXT NOT NULL,
    "submitLabel" TEXT NOT NULL DEFAULT 'Submit',
    "schema" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "widgets_orgId_idx" ON "widgets"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "widgets_botId_name_key" ON "widgets"("botId", "name");

-- AddForeignKey
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
