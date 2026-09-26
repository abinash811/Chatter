-- AlterTable
-- ADR 0012: onboarding gate + optional BYOA.
-- Note: `prisma migrate diff` also proposed dropping knowledge_chunks'
-- `embedding` column here — that column is intentionally NOT in
-- schema.prisma (added by db/migrations/0002_pgvector.sql instead,
-- since Prisma can't declare a pgvector `vector` column natively; see
-- that file's own comment). That part of the diff is deliberately
-- excluded from this migration.
ALTER TABLE "orgs" ADD COLUMN     "anthropicApiKeyEncrypted" TEXT,
ADD COLUMN     "onboardedAt" TIMESTAMP(3);
