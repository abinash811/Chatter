# ADR 0039: Hosted SaaS only — no self-hostable product option

Status: accepted

Date: 2026-10-11

## Context

`docs/open-questions.md` #1 ("Hosted SaaS vs. also self-hostable?") had
sat under a "Blocking further scaffolding" header since the file was
created — but nothing had actually been blocked by it. Dozens of
features shipped in the months since (multi-tenancy via RLS, BYOA,
custom actions, widgets, Shopify integration, approvals, etc.), none of
them designed around an undecided hosting model. A full docs-critique
pass surfaced this as a doc-integrity problem worth resolving directly
rather than leaving a provably-false "blocking" label in place.

Looking at what was actually built settles the question on its own:
tenant isolation is Postgres Row-Level Security against one shared
database (ADR 0003) — not a per-tenant deployable unit; BYOA (ADR 0012)
lets a business bring their own Anthropic API key, but that's a
billing-account credential, not infrastructure — the business never
runs their own copy of the app or database. Nothing in the codebase,
`docs/architecture.md`, or `docs/roadmap.md` has ever assumed a business
could deploy Chatter on its own infrastructure. The architecture had
already answered this question in practice; it just was never recorded.

## Decision

Chatter is a hosted SaaS product only. One instance (one shared
database, RLS-isolated per org) serves every business that signs up —
the same model as Chatbase, Intercom, or Slack. There is no self-hosted
deployment option, now or as a planned future capability. A business
never operates its own instance of the app or database; BYOA stays
scoped to bringing an API key/billing account, not infrastructure.

## Alternatives considered

- **Also support self-hosting** (GitLab/Mattermost-style: a business
  can deploy their own private instance) — rejected. This would require
  packaging, install docs, a licensing model for independently-operated
  instances, and dropping the "one shared database" assumption RLS
  tenant isolation is built on — none of which has been designed for,
  and no real demand for it exists today. Revisiting this later is a
  new, from-scratch design effort, not a flag to flip.
- **Leave it formally undecided** — rejected as a doc-integrity matter:
  the code already only works as hosted SaaS, so leaving the question
  "open" was actively misleading about what decision had really been
  made, not a genuinely live choice.

## Consequences

- Resolves `docs/open-questions.md` #1; removes the file's now-empty
  "Blocking further scaffolding" section.
- Confirms multi-tenancy (RLS, ADR 0003) and BYOA (ADR 0012) were
  already built correctly for this model — no code changes needed.
- Hard to reverse in practice: supporting self-hosting later means
  designing deployment packaging, a licensing/support model for
  independently-run instances, and likely loosening the "one shared
  database" assumption now baked into tenant isolation — a real
  from-scratch initiative, not a config flag, if ever revisited.
