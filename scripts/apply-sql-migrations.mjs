// Applies db/migrations/*.sql (RLS policies, pgvector) against
// DATABASE_URL. Runs after `prisma migrate deploy` — Prisma owns the
// base schema, not RLS or pgvector (Prisma can't express either).
//
// Uses the `pg` driver directly rather than shelling out to `psql`,
// since the deploy image (Render's Node build environment, or any
// other host) isn't guaranteed to have the psql binary installed.
//
// Both migration files are idempotent by design (confirmed by running
// each twice locally, 2026-09-24) — safe to run on every deploy, not
// just the first one.

import { readFileSync } from "fs";
import { Client } from "pg";

// Prisma's CLI auto-loads .env; a plain Node script doesn't. Without
// this, running this script locally silently got DATABASE_URL as
// undefined and failed with a cryptic pg error ("no PostgreSQL user
// name specified") instead of a clear one — caught by actually running
// it, not by reading the code. Render injects env vars directly (no
// .env file there), so this is a local-dev convenience only —
// loadEnvFile throws if the file doesn't exist, which we want to ignore.
try {
  process.loadEnvFile();
} catch {
  // no .env file — fine on Render, or if vars are already exported.
}

const MIGRATIONS = ["db/migrations/0001_init_rls.sql", "db/migrations/0002_pgvector.sql"];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — check .env or the environment.");
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    for (const file of MIGRATIONS) {
      console.log(`Applying ${file}...`);
      const sql = readFileSync(file, "utf8");
      await client.query(sql);
      console.log(`  ok`);
    }
  } finally {
    await client.end();
  }

  console.log("All SQL migrations applied.");
}

main().catch((err) => {
  console.error("SQL migration failed:", err);
  process.exit(1);
});
