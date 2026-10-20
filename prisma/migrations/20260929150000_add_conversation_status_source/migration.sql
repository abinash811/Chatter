-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ongoing',
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'widget';
