// Guardrail #1 (tenant isolation) has a real gap check-tenant-
// isolation.mjs doesn't cover: that script verifies application code
// goes through withOrgContext, not whether the table it's querying
// actually has an RLS policy at all. A new orgId-bearing model added to
// prisma/schema.prisma without a matching policy in
// db/migrations/0001_init_rls.sql would pass check-tenant-isolation.mjs
// (the code path is correct) and still leak across tenants at the
// database layer — exactly the class of bug ADR 0003 exists to prevent
// structurally, not by someone remembering.
//
// prisma/schema.prisma's own header states the invariant this checks:
// "every tenant-scoped model here carries orgId; the migration adds the
// matching RLS policy for each." This is a static text check against
// both files, not a live database query — scripts/verify-rls.mjs
// already covers real enforcement against an actual running Postgres;
// this catches the far cheaper case (a model added, the migration
// forgotten) without needing a database at all, so it can run in the
// same guardrail pass as everything else in check:all.

import { readFileSync } from "fs";

const RLS_SQL_PATH = "db/migrations/0001_init_rls.sql";

// Deliberately RLS-exempt, per db/migrations/0001_init_rls.sql's own
// comment and prisma/schema.prisma's per-model documentation: both
// exist to be queryable before orgId is known (resolving them IS how
// orgId gets known), and hold no tenant data beyond id pairings.
const EXEMPT_TABLES = new Set(["bot_public_keys", "user_org_access"]);

const schema = readFileSync("prisma/schema.prisma", "utf8");
const rlsSql = readFileSync(RLS_SQL_PATH, "utf8");

// One pass per `model ... { ... }` block: does it declare an `orgId`
// field, and what's its @@map table name? Deliberately simple line-
// based parsing, not a real Prisma AST — schema.prisma is small and
// hand-written, and this mirrors every other guardrail script's
// text-based approach (check-tenant-isolation.mjs, check-design-
// tokens.mjs) rather than adding a parser dependency for one script.
// Not a brace-counting regex ("model \w+ \{[^}]*\}") — caught for real:
// that truncates early at the first "}" it finds, which can be inside a
// field's own default value (e.g. `@default("{}")`), silently losing
// everything after it including the @@map(...) line. A Prisma model
// block's closing brace is always alone on its own unindented line, so
// that's the real, reliable boundary to scan for instead.
const modelBlocks = [];
{
  const lines = schema.split("\n");
  let current = null;
  for (const line of lines) {
    if (current === null && /^model \w+ \{/.test(line)) {
      current = [line];
    } else if (current !== null) {
      current.push(line);
      if (line.trim() === "}") {
        modelBlocks.push(current.join("\n"));
        current = null;
      }
    }
  }
}

let failed = false;

for (const block of modelBlocks) {
  const hasOrgId = /^\s*orgId\s+String/m.test(block);
  if (!hasOrgId) continue;

  const mapMatch = block.match(/@@map\("(\w+)"\)/);
  if (!mapMatch) {
    console.error(`FAIL: a model with orgId has no @@map(...) table name — can't verify its RLS policy:\n${block}`);
    failed = true;
    continue;
  }
  const table = mapMatch[1];
  if (EXEMPT_TABLES.has(table)) continue;

  const hasRlsEnabled = new RegExp(`alter table ${table} enable row level security`, "i").test(rlsSql);
  const hasPolicy = new RegExp(`create policy \\w+ on ${table}\\b`, "i").test(rlsSql);

  if (!hasRlsEnabled || !hasPolicy) {
    const missing = [!hasRlsEnabled && "ENABLE ROW LEVEL SECURITY", !hasPolicy && "a CREATE POLICY"]
      .filter(Boolean)
      .join(" and ");
    console.error(
      `FAIL: table "${table}" has an orgId column but ${RLS_SQL_PATH} is missing ${missing} for it — ` +
        `add it, or add "${table}" to EXEMPT_TABLES in this script with the same documented reasoning as the existing two.`,
    );
    failed = true;
  }
}

if (failed) {
  console.error(`\nSee docs/adr/0003-auth-multi-tenancy.md — an orgId column with no RLS policy is a real leak, not a style issue.`);
  process.exit(1);
}
console.log("ok: every orgId-bearing table has a matching RLS policy");
