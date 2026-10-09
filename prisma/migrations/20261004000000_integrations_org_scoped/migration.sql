-- ADR 0038: Integration becomes org-level, not per-bot — one Shopify
-- connection shared by every bot in the org, matching how a real
-- Shopify store actually works.

-- DropForeignKey
ALTER TABLE "integrations" DROP CONSTRAINT "integrations_botId_fkey";

-- DropIndex
DROP INDEX "integrations_botId_provider_key";

-- DropIndex
DROP INDEX "integrations_orgId_idx";

-- AlterTable
ALTER TABLE "integrations" DROP COLUMN "botId";

-- CreateIndex
CREATE UNIQUE INDEX "integrations_orgId_provider_key" ON "integrations"("orgId", "provider");

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
