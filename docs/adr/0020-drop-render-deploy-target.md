# ADR 0020: Drop Render as the deploy target — hosting undecided again

Status: accepted

Date: 2026-09-27

## Context

ADR 0005 picked Render specifically to get a real, browsable deployment
during early build — "get it running and look at it," explicitly not a
final infrastructure decision (its own Consequences section said so).
Since then, Render's choice quietly hardened into a real architectural
assumption in several places that were never meant to be Render-specific:
`lib/rateLimit.ts`'s in-memory rate limiter reasons about "one
long-running process, not serverless/edge" and names Render directly;
`lib/auth.ts` trusts the request's `Host` header "behind Render's proxy";
`docs/security.md` justifies in-memory state the same way. None of that
reasoning actually requires Render — it requires *a* single long-running
Node process behind *a* reverse proxy, which several hosts provide.

Separately, scoping hybrid search (`docs/ai-tech-radar.md`) surfaced a
real BM25-in-Postgres option (ParadeDB `pg_search`, Tiger Data
`pg_textsearch`) that native `tsvector`/`ts_rank` doesn't match on
relevance quality. Checking whether Render's managed Postgres supports
either extension turned up an open, apparently unresolved Render feature
request for `pg_search` and no confirmed answer either way. The user's
call, given that: stop assuming Render at all, rather than build around
a host whose extension support can't currently be confirmed.

## Decision

Render is no longer the deploy target. No replacement is chosen yet —
hosting is explicitly undecided again, reopening `docs/open-questions.md`
#1 (hosted SaaS vs. also self-hostable) and adding hosting platform as
its own open question. `render.yaml` is removed. Every place that
assumed Render specifically is generalized to the actual underlying
requirement (a single long-running Node process behind a reverse proxy)
instead of naming a host that's no longer decided.

## Alternatives considered

- **Keep Render, revisit only if it actually blocks something** —
  rejected: the extension-support uncertainty is exactly the kind of
  unverifiable blocker CLAUDE.md's "check current practice, don't
  recall it" exists to catch before building on top of it, not after.
- **Pick a replacement now** (self-hosted Postgres, Supabase, Neon, RDS)
  — rejected for this pass: the user's call was to remove Render first;
  picking a real replacement is its own decision with its own tradeoffs
  (ops burden, extension support, pricing) and deserves the same
  explain-then-ask treatment as any other vendor choice, not a rushed
  substitution in the same turn.

## Consequences

- Hard to reverse only in the sense that any hosting decision is —
  nothing built depends on Render's specific behavior once the
  generalized reasoning above lands, so there's no migration cost today,
  same as ADR 0019's reasoning for why dropping an unused abstraction is
  cheap now and gets more expensive the longer something is silently
  built on top of it.
- Blocks a real deploy again until a new host is chosen — the "look at
  it running in a browser" need ADR 0005 existed for is unmet until
  then.
- The BM25-in-Postgres question (`pg_search`/`pg_textsearch`) is now
  live again, not blocked on a specific host's extension list — worth
  factoring into whatever hosting decision comes next, per
  `docs/ai-tech-radar.md`'s Retrieval & search section.
- Supersedes ADR 0005 entirely (not just its "Render" specifics) — that
  ADR's own framing ("this picks a hosting platform for now, not a
  final answer") turned out right in hindsight.
