# ADR 0025: Every components/ui/ primitive must be a verified shadcn/ui source, mechanically enforced

Status: accepted

Date: 2026-09-28

## Context

Investigating a follow-up question ("are all the components used shadcn?") surfaced a real gap: 7 of the 25 files in `components/ui/` (`Input`, `Textarea`, `Label`, `Checkbox`, `Card`, `Badge`, `Toaster`) were hand-authored from scratch, imitating shadcn's style (same `cn()` helper, similar prop shapes) but never actually pulled from shadcn's real upstream source — unlike the other 18, migrated under ADR 0014/0017.

The user's direction was explicit: "There shouldn't be any hand rolled in the product. Whole tool should use only shadcn," plus "how do we make sure in future we don't miss this" — a request for a real, mechanical safeguard, not just a one-time cleanup.

The existing exemption mechanism (`scripts/lib/careExemption.mjs`) sniffs for shadcn's own `@type registry:` JSDoc header to identify verbatim-pulled files. That header turned out not to be a reliable signal: pulling `input`/`textarea`/`label`/`checkbox`/`badge`/`card`/`sonner` for real from shadcn's actual registry source showed none of them carry it — only a subset (`button`, `avatar`, `switch`, ...) do. A check built on that header would produce false failures on legitimate shadcn source, or (worse) never have caught this gap in the first place, since the header's *absence* was never itself flagged as suspicious.

## Decision

1. Rebase all 7 hand-authored primitives onto shadcn's real official source (`scripts/pull-shadcn-component.mjs`), keeping each file's deliberate design customizations as documented deltas in its own header comment — never a blind overwrite (see `Card`'s Notion-register tuning, `Badge`'s app-specific variant names, `Toaster`'s hardcoded light theme). `Checkbox` is a real behavior change, not just styling: it's now radix-ui's real `Checkbox` primitive, which changed its event API (`onChange` → `onCheckedChange`) at its two real call sites.
2. Add a new guardrail, `scripts/check-shadcn-only-primitives.mjs` (wired into `check:all`, now 10 checks), backed by an explicit manifest (`scripts/shadcn-manifest.json`) rather than header-sniffing. Every file in `components/ui/*.tsx` must be listed in the manifest; a new file is added only after actually pulling and diffing the real source, never by assumption — same trust model as the existing `NAMED_ALLOWLIST` pattern in `scripts/check-guardrail-exemptions.mjs`.

## Alternatives considered

- **Keep header-sniffing (`@type registry:`) as the enforcement signal** — rejected: demonstrably unreliable, since real shadcn source doesn't consistently carry that header. Would either miss real hand-rolled files (exactly the gap this ADR closes) or false-fail legitimate pulls.
- **Clean swap to shadcn's raw defaults, no customization preserved** — rejected: several of the 7 files carry real, deliberate design decisions (`Card`'s soft-fill Notion-register tuning, `Badge`'s app-wide variant names every call site depends on). A blind overwrite would silently regress shipped design work under the banner of "using real shadcn," which isn't what was actually being asked for.
- **A CI-only check instead of a local `check:all` guardrail** — rejected: every other provenance/token rule in this project runs locally via `check:all` and at commit time (`.githooks`), catching drift before it's pushed, not after.

## Consequences

- No hand-rolled primitive can land again without failing `check:all` — a genuinely mechanical safeguard, not a convention to remember.
- The manifest is a trust boundary, not an automatic re-verification: adding a filename to it is a real claim ("I pulled and diffed this against upstream"), the same honesty model the rest of this project's guardrail-exemption system already relies on. It will not catch a manifest entry added carelessly; it does catch every *unlisted* file.
- A real bug was caught in the same pass, only visible in an actual rendered screenshot, not by any type-check or automated test: `Checkbox`'s generic `rounded` utility resolves to this app's 10px `--radius` token, which on a 16px checkbox rendered as a full circle, indistinguishable from a radio button. Fixed to match shadcn's real source, which explicitly uses `rounded-[4px]` for exactly this reason. Reinforces this project's own standing rule (`.claude/rules/console-frontend.md` item 8) that a real screenshot review is not optional even for a "just a provenance rebase" change.
- Verified: `tsc` clean, all 10 `check:all` guardrails (including the new one), full unit suite (166 tests), the complete `tests/e2e/` suite (isolating and re-running every ambiguous failure to separate real regressions from this session's already-documented toast-timeout flake — none found), the full a11y scan, and all 18 `tests/visual/` baselines regenerated and confirmed stable across two runs.
