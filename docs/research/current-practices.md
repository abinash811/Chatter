# Current practices — living reference

Unlike the other files in `docs/research/` (a one-time research pass on a
specific question), this file is **checked before introducing any new
technical pattern** — a validation library, a testing approach, a
dependency-update tool, an API convention — the same discipline CLAUDE.md
already requires for dependency *versions* ("check real version numbers,
don't recall them"), extended to practices and conventions, not just
version numbers.

**Rule**: before adopting a new pattern not already covered below,
research it fresh (a quick web check is enough — this doesn't need a
full research-note pass every time) and add an entry here with the date
checked. If an entry gets stale (a new pattern has clearly taken over),
update it in place rather than leaving it to rot.

## Frontend

- **Form validation**: Zod + a form-state library (react-hook-form is
  the common pairing) is the standard approach for a form beyond
  trivial — schema-defined validation, typed on both client and server.
  Chatter currently does raw `String(formData.get(...))` with manual
  inline checks. *Checked 2026-09-25.*
- **Component primitives**: shadcn/ui (Radix-based, copy-into-your-repo
  rather than an installed package) remains the default pairing for a
  Next.js + Tailwind admin UI. Already the direction Chatter took.
  *Checked 2026-09-23, see `docs/research/design-system-standards.md`.*

## Backend / API

- **Input validation at the API boundary**: the same schema (Zod)
  used for a form's client-side validation is typically reused
  server-side for the API route handling that submission — one schema,
  not two hand-maintained copies. *Checked 2026-09-25.*
- **Rate limiting**: token-bucket or sliding-window, applied at the edge
  (middleware) for public-facing routes especially. Chatter has none yet
  — flagged in `docs/security.md`. *Not yet researched for a specific
  library choice.*

## Database

- **Multi-tenant row-level security**: index the tenant-id column on
  every RLS-protected table — without it, every RLS-filtered query scans
  the full table. Standard advice wherever Postgres RLS is used for
  multi-tenancy. Chatter has none yet. *Checked 2026-09-25.*

## Dependency hygiene

- **Automated dependency updates**: Dependabot (built into GitHub, zero
  setup cost) or Renovate (more configurable — grouping, scheduling,
  auto-merge rules — but needs its own config file) are the two standard
  choices. Dependabot is the default unless there's a specific need
  Renovate's extra config buys. *Checked 2026-09-25.*

## Testing

- Not yet researched for current practice beyond what's already in
  place (Playwright canary + CI against a real Postgres instance).
