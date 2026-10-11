// Required by Prisma 7 (ADR 0034) — schema.prisma's datasource block can
// no longer hold a connection `url` at all (hard error, confirmed by
// running `prisma generate` against the old shape before writing this).
// `prisma migrate`/`generate` read the connection string from here now;
// `PrismaClient` itself still needs a driver adapter passed explicitly
// at construction (lib/db.ts, lib/auth.ts, scripts/verify-rls.mjs) —
// this file doesn't supply that for the running app, only for the CLI.
//
// Unlike Prisma 5's `schema.prisma`, the CLI no longer auto-loads `.env`
// before evaluating this file (confirmed: `prisma generate` failed with
// "Cannot resolve environment variable: DATABASE_URL" until this was
// added) — same `process.loadEnvFile()` convention already used in
// scripts/apply-sql-migrations.mjs and scripts/predev-check.mjs, not a
// new dependency.
try {
  process.loadEnvFile();
} catch {
  // no .env file — fine when DATABASE_URL is already exported (CI, a
  // real deploy host).
}

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
