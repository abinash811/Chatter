import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Every tenant-scoped query must go through withOrgContext, not the raw
// prisma client, so Postgres RLS (db/migrations/0001_init_rls.sql) always
// has app.org_id set. This is the enforcement point that makes guardrail
// #1 (tenant isolation) a database guarantee instead of a convention —
// see docs/adr/0003-auth-multi-tenancy.md.

// Prisma 7 (ADR 0034): a driver adapter is now mandatory — PrismaClient
// no longer reads DATABASE_URL on its own, which means *we* are now
// responsible for getting it into process.env, a job Prisma 5's engine
// quietly did for every consumer. Next.js's own server already loads
// .env itself, but tests/e2e/helpers.ts and scripts/verify-rls.mjs run
// as plain Node processes that don't — caught for real, not assumed:
// every e2e spec that seeds data through lib/db.ts (leads, widgets,
// conversations, etc.) failed with "User was denied access on the
// database `(not available)`" until this was added. Same defensive
// process.loadEnvFile() pattern already used in scripts/apply-sql-
// migrations.mjs, scripts/predev-check.mjs, and prisma.config.ts — a
// no-op when .env doesn't exist or DATABASE_URL is already exported
// (CI, a real deploy host).
try {
  process.loadEnvFile();
} catch {
  // no .env file — fine, see above.
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function withOrgContext<T>(
  orgId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // set_config(..., true) scopes the setting to this transaction only.
      await tx.$executeRaw`select set_config('app.org_id', ${orgId}, true)`;
      return fn(tx as PrismaClient);
    },
    // Prisma's own defaults (maxWait 2s to acquire a connection, timeout
    // 5s for the whole transaction) assume the database is on the same
    // machine or network. Real deploys — and any pooled/managed Postgres
    // reached over the public internet (Supabase, RDS, etc., see
    // docs/open-questions.md #8) — need real headroom instead; a tight
    // default here surfaces as a confusing "Unable to start a
    // transaction in the given time" on every single request, not a
    // one-off flake. 10s/20s is generous without masking a genuinely
    // hung connection.
    { maxWait: 10_000, timeout: 20_000 },
  );
}

// The one sanctioned way to query bot_public_keys — the single table
// deliberately exempt from RLS (see its comment in prisma/schema.prisma).
// Never use this to read anything else; every other table must go
// through withOrgContext.
export async function resolveBotPublicKey(
  publicKey: string,
): Promise<{ orgId: string; botId: string } | null> {
  const key = await prisma.botPublicKey.findUnique({
    where: { publicKey },
    select: { orgId: true, botId: true },
  });
  if (!key) return null;

  // ADR 0018: an archived bot's embed snippet must go dead immediately,
  // the same "invalid key" response as one that never existed — no
  // special-cased error path the widget or an attacker could use to
  // distinguish "archived" from "never existed."
  const bot = await withOrgContext(key.orgId, (tx) =>
    tx.bot.findUnique({
      where: { id: key.botId },
      select: { archivedAt: true },
    }),
  );
  if (!bot || bot.archivedAt) return null;

  return key;
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
