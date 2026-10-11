-- ADR 0018: soft delete for bots.
ALTER TABLE "bots" ADD COLUMN "archivedAt" TIMESTAMP(3);
