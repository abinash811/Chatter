-- AlterTable
ALTER TABLE "bot_config_versions" ADD COLUMN "abuseProtection" JSONB NOT NULL DEFAULT '{}';
