// Runs automatically before `npm run dev` (npm's `pre<script>`
// convention) on WHOEVER'S MACHINE runs it — unlike
// .claude/hooks/session-start.sh, which only protects a Claude Code
// session. Catches the exact class of problem that took a long back-
// and-forth to diagnose in person: a placeholder DATABASE_URL, Postgres
// not running, or a corrupted native module — in one line, before the
// dev server even starts, instead of three error messages deep in the
// browser.
//
// Deliberately fast and best-effort: never blocks `npm run dev` from
// starting (a warning here can be wrong in an unusual setup), just
// surfaces the likely cause up front.

import { existsSync } from "fs";
import { Client } from "pg";

try {
  process.loadEnvFile();
} catch {
  // no .env — the check below will report it clearly.
}

const warn = (msg) => console.warn(`[predev] ${msg}`);
let hadWarning = false;

if (!existsSync(".env")) {
  warn("No .env file found — copy .env.example to .env and fill in your local values.");
  hadWarning = true;
} else if (!process.env.DATABASE_URL) {
  warn("DATABASE_URL is not set in .env.");
  hadWarning = true;
} else if (process.env.DATABASE_URL.includes("user:password")) {
  warn("DATABASE_URL still has the placeholder from .env.example — set it to your real database role.");
  hadWarning = true;
}

if (!existsSync("node_modules/@prisma/client/default.js")) {
  warn(
    "node_modules/@prisma/client/default.js is missing — the Prisma client install looks incomplete/corrupted. Try: rm -rf node_modules && npm install",
  );
  hadWarning = true;
}

if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("user:password")) {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2000 });
    await client.connect();
    await client.end();
  } catch (err) {
    warn(`Can't connect to the database — is Postgres running? (${err.message})`);
    hadWarning = true;
  }
}

if (hadWarning) {
  console.warn("[predev] Starting dev server anyway — the warning(s) above are the likely cause of anything that breaks.\n");
} else {
  console.log("[predev] Environment looks good.");
}
