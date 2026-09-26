import { PrismaClient } from "@prisma/client";

// Every tenant-scoped query must go through withOrgContext, not the raw
// prisma client, so Postgres RLS (db/migrations/0001_init_rls.sql) always
// has app.org_id set. This is the enforcement point that makes guardrail
// #1 (tenant isolation) a database guarantee instead of a convention —
// see docs/adr/0003-auth-multi-tenancy.md.

const prisma = new PrismaClient();

export async function withOrgContext<T>(
  orgId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // set_config(..., true) scopes the setting to this transaction only.
    await tx.$executeRaw`select set_config('app.org_id', ${orgId}, true)`;
    return fn(tx as PrismaClient);
  });
}

// The one sanctioned way to query bot_public_keys — the single table
// deliberately exempt from RLS (see its comment in prisma/schema.prisma).
// Never use this to read anything else; every other table must go
// through withOrgContext.
export async function resolveBotPublicKey(
  publicKey: string,
): Promise<{ orgId: string; botId: string } | null> {
  return prisma.botPublicKey.findUnique({
    where: { publicKey },
    select: { orgId: true, botId: true },
  });
}

// Every bot needs exactly one public key to ever be embeddable. Called
// at bot-creation time; also safe to call lazily (upsert) for a bot
// that predates this, or if creation partially failed.
export async function getOrCreateBotPublicKey(
  orgId: string,
  botId: string,
): Promise<string> {
  const key = await prisma.botPublicKey.upsert({
    where: { botId },
    create: { orgId, botId },
    update: {},
  });
  return key.publicKey;
}

// Same bootstrapping problem as resolveBotPublicKey (need an orgId
// before app.org_id can be set), just keyed by botId instead of the
// public key — used by tests/e2e/helpers.ts's seedConversations to
// scope a direct Prisma seed through withOrgContext, without a second
// PrismaClient instance in the codebase (see check-tenant-isolation.mjs).
export async function getOrgIdForBot(botId: string): Promise<string> {
  const key = await prisma.botPublicKey.findUniqueOrThrow({ where: { botId } });
  return key.orgId;
}
