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
