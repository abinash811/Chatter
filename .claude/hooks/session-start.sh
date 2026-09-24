#!/usr/bin/env bash
# Runs at the start of every Claude Code session on this repo. Repairs
# the dev environment if a container reset killed Postgres, rather than
# rediscovering "why does npm run dev fail" from scratch every session.
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 0

if command -v pg_lsclusters >/dev/null 2>&1; then
  if ! pg_lsclusters 2>/dev/null | grep -q "online"; then
    echo "[session-start] Postgres is down — starting it." >&2
    service postgresql start >/dev/null 2>&1 || true
  fi
fi

if [ -f package.json ] && [ ! -d node_modules ]; then
  echo "[session-start] node_modules missing — run 'npm install' before anything else." >&2
fi

if [ -f .env ] && [ -d node_modules ]; then
  if ! DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')" \
       node -e "require('@prisma/client'); new (require('@prisma/client').PrismaClient)().\$connect().then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "[session-start] Can't connect to the database in .env — check DATABASE_URL / that Postgres is really up." >&2
  fi
fi

exit 0
