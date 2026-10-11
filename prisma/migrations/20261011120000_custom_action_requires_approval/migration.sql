-- ADR 0040: Custom Actions can require human approval before firing.
ALTER TABLE "custom_actions" ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT false;
