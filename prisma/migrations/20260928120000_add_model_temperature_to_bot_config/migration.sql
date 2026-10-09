-- AlterTable
ALTER TABLE "bot_config_versions" ADD COLUMN "model" TEXT NOT NULL DEFAULT 'claude-sonnet-5',
ADD COLUMN "temperature" DOUBLE PRECISION NOT NULL DEFAULT 1;
