// Automated regression test for guardrail #1 (tenant isolation).
//
// This exists because the bug it would have caught — every RLS policy
// silently failing to create (docs' "Verified by a real run" note in
// README.md) — was invisible to TypeScript, invisible to reading the
// code, and only surfaced by actually running it against a real
// Postgres. Run this in CI on every push, not just when someone
// remembers to ask for a manual test run.
//
// Usage: node scripts/verify-rls.mjs (needs DATABASE_URL set, with RLS
// and pgvector already applied — see README's Local Setup).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function withOrg(orgId, fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.org_id', ${orgId}, true)`;
    return fn(tx);
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

async function main() {
  const orgA = crypto.randomUUID();
  const orgB = crypto.randomUUID();

  await withOrg(orgA, (tx) => tx.org.create({ data: { id: orgA, name: "RLS test org A" } }));
  await withOrg(orgB, (tx) => tx.org.create({ data: { id: orgB, name: "RLS test org B" } }));

  const botA = await withOrg(orgA, (tx) =>
    tx.bot.create({ data: { orgId: orgA, name: "RLS test bot A" } }),
  );
  await withOrg(orgB, (tx) => tx.bot.create({ data: { orgId: orgB, name: "RLS test bot B" } }));

  const seenByB = await withOrg(orgB, (tx) => tx.bot.findMany({ where: { name: { startsWith: "RLS test" } } }));
  assert(
    seenByB.every((b) => b.name !== "RLS test bot A"),
    "Org B's list query never returns Org A's bot",
  );

  const directRead = await withOrg(orgB, (tx) => tx.bot.findUnique({ where: { id: botA.id } }));
  assert(directRead === null, "Org B cannot read Org A's bot by its exact ID");

  const noContext = await prisma.bot.findMany({ where: { id: botA.id } });
  assert(noContext.length === 0, "A query with no app.org_id set returns nothing (fails closed)");

  // Cleanup — leave the DB as we found it.
  await withOrg(orgA, (tx) => tx.bot.deleteMany({ where: { orgId: orgA } }));
  await withOrg(orgB, (tx) => tx.bot.deleteMany({ where: { orgId: orgB } }));
  await prisma.org.deleteMany({ where: { id: { in: [orgA, orgB] } } });

  await prisma.$disconnect();
  if (process.exitCode) {
    console.error("\nRLS verification FAILED — tenant isolation is not enforced.");
    process.exit(1);
  }
  console.log("\nRLS verification passed.");
}

main();
