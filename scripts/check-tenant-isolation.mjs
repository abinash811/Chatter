// Guardrail #1 (tenant isolation): every tenant-scoped query must go
// through withOrgContext (lib/db.ts), never a raw Prisma client. This
// can't be caught by TypeScript — a raw `prisma.bot.findMany()` type-
// checks fine and silently bypasses RLS scoping in application code
// (RLS itself still blocks it at the DB layer per ADR 0003, but a
// second, independent guard at review time is cheaper than relying on
// that alone, and catches the mistake before it's ever run).
//
// Approach: flag any file that imports/instantiates PrismaClient
// directly, other than the small allowlist of files that legitimately
// need raw access (lib/db.ts itself, and lib/auth.ts's identity
// resolution against BotPublicKey/UserOrgAccess — both deliberately
// exempt from RLS and documented as such in prisma/schema.prisma).

import { readFileSync } from "fs";
import { execSync } from "child_process";

const ALLOWLIST = new Set(["lib/db.ts", "lib/auth.ts"]);

const files = execSync("git ls-files '*.ts' '*.tsx'", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

let failed = false;

for (const file of files) {
  if (ALLOWLIST.has(file)) continue;
  const content = readFileSync(file, "utf8");
  // Only PrismaClient itself is the violation — other exports from the
  // package (Prisma.sql, Prisma.InputJsonValue, enum/type imports) are
  // query-building helpers used *inside* a withOrgContext callback, not
  // a way to bypass it.
  const importsPrismaClientAsValue = /^import\s+(?!type\s)\{[^}]*\bPrismaClient\b[^}]*\}\s+from ["']@prisma\/client["']/m.test(
    content,
  );
  if (importsPrismaClientAsValue || /new PrismaClient\(/.test(content)) {
    console.error(
      `FAIL: ${file} imports PrismaClient directly. Use withOrgContext from lib/db.ts instead — see docs/adr/0003-auth-multi-tenancy.md.`,
    );
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("ok: no tenant-scoped query bypasses withOrgContext");
