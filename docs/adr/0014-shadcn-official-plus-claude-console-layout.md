# ADR 0014: shadcn/ui's official registry (not CARE) + Claude Console's real layout as design reference

Status: accepted

Date: 2026-09-26

## Context

ADR 0008 built Chatter's design system as an exact copy of CARE
(`ohcnetwork/care_fe`/`careui`) — real component source pulled verbatim.
ADR 0010 stopped verbatim pulling after 3 silent bugs (dead Tailwind v4
classes, a missing token, a dead `data-*` selector — all invisible to
`tsc`/the build) shared one root cause: copying CARE's source meant
silently inheriting every assumption its authors made about *their*
exact Base UI/Tailwind versions. ADR 0011 then dropped CARE as a
*visual* reference too, since its GitHub repo is source code, not a
design artifact, and every attempt to see CARE's actual shipped product
(screenshots, live access) failed for environment reasons.

The user proposed replacing both pieces at once: use shadcn/ui itself
(not a fork of it) as the component foundation, and Claude Console's
real, currently-shipping product (two screenshots supplied directly —
Dashboard and Skills pages) as the layout/structure reference. This
resolves ADR 0011's exact problem (no real screenshots of a finished
product) with an actual finished product's actual screenshots, and
resolves ADR 0010's problem (verbatim-pulling a smaller fork with its
own drifted assumptions) by pulling from shadcn's own upstream instead —
the canonical, actively-maintained implementation CARE itself was
originally forked from.

Two things surfaced during scoping, not assumed:
- `ui.shadcn.com`'s live registry API (what `npx shadcn add` actually
  calls) is denied by this session's egress policy — confirmed via
  `$HTTPS_PROXY/__agentproxy/status` ("gateway answered 403 to CONNECT
  … policy denial"), not a target-server issue. `raw.githubusercontent.
  com`, however, is reachable, and shadcn's actual new-york-v4 style
  component source is checked into their repo as static `.tsx` files
  (`apps/v4/registry/new-york-v4/ui/<name>.tsx`), not only generated at
  docs-site build time — fetched and verified for real (Button, Table,
  Card all returned real, current source, confirming this path is
  genuine and current, not stale).
- shadcn's current new-york-v4 registry uses the unified `radix-ui`
  package (v1.6.7, checked via `npm view`) for primitives, not
  `@base-ui/react` — CARE's fork apparently swapped to Base UI; shadcn's
  own upstream never did. A real, material dependency difference, not
  guessed.
- The serif display typeface in the Claude Console screenshots is
  Anthropic's own brand asset. Explicit user call: don't chase it —
  shadcn/ui itself is the inspiration for typography/component defaults
  (its own neutral sans-serif, default tokens), Claude Console is the
  inspiration for *layout/structure/interaction* only (sidebar shape,
  card patterns, table patterns, button hierarchy, spacing, the
  monochrome-with-sparing-color restraint). No attempt to replicate or
  license Anthropic's font.

## Decision

1. **Component source**: shadcn/ui's official `new-york-v4` style,
   pulled from `github.com/shadcn-ui/ui`'s real current source via
   `raw.githubusercontent.com` (`scripts/pull-shadcn-component.mjs`,
   mirroring `scripts/pull-care-component.mjs`'s shape) since the live
   registry API is blocked here. `--from <local-checkout>` covers any
   environment where even `raw.githubusercontent.com` isn't reachable.
   Prints to stdout by default; `--write` is required to place a file
   in `components/ui/` — deliberately not the default, see Consequences.
2. **Typography/tokens**: shadcn's own defaults (neutral base color,
   its standard sans-serif stack) — not Anthropic's serif, not CARE's
   emerald-primary palette. This is a full token replacement, not
   additive.
3. **Layout/structure reference**: Claude Console's actual screenshots
   (Dashboard, Skills) — collapsible sidebar sections with a subtle
   gray-pill active state, bordered-not-shadowed cards, solid-dark
   primary buttons vs. outlined secondary, borderless plain-text tables
   with monospace IDs and simple prev/next pagination, generous
   whitespace, color used only for sparing illustration accents, never
   as UI chrome. `docs/design/principles.md` gets a new entry for this
   once the first real screen is built against it (not written
   speculatively here, ahead of any concrete screen).
4. **The 18 already-pulled CARE primitives**: re-pull all of them from
   shadcn's official registry over time — resolves `docs/open-
   questions.md` #5 (previously undecided) in favor of a full,
   one-provenance codebase rather than leaving CARE-derived and
   shadcn-official components mixed.
5. **Rollout: new-screens-first, not a blanket repaint.** The next
   screens built (the "self-serve configurability" roadmap pillars —
   conversation inbox, appearance editor, etc.) use shadcn-official +
   this layout language from the start. Existing shipped screens
   (login/signup, bots list, bot editor, knowledge, settings,
   onboarding) keep their current CARE look until each is deliberately
   migrated in its own pass — not touched as a side effect of this ADR.

## Alternatives considered

- **Match Anthropic's exact serif typeface** — rejected by explicit user
  decision: Chatter is a separate commercial product, and the font is
  Anthropic's own brand asset; using it would need a license we haven't
  verified exists for this use, and even if it did, it risks visual
  pass-off. shadcn's own defaults instead.
- **Keep the working CARE primitives, only replace where visuals
  differ** — rejected: leaves two component provenances mixed in the
  codebase long-term, harder to reason about "which convention does
  this file follow." User chose the full re-pull instead, accepting the
  near-term churn.
- **Full repaint now, every existing screen at once** — rejected as
  more risk than this decision alone justifies; matches this session's
  established pattern (BYOA, RAG architecture, self-serve roadmap) of
  phasing a large change rather than doing it all in one pass.
- **Use `npx shadcn add` directly against the official registry** —
  not possible in this session (network policy), and even where it
  would work, CARE's own puller script already established the pattern
  of reading real registry source directly for a documented, repo-
  specific reason (there, a CLI URL-substitution bug; here, a network
  policy) rather than fighting the CLI.

## Consequences

- `components/ui/` will carry two provenances (CARE-derived, shadcn-
  official) simultaneously during the transition — an accepted, known
  state, not a mistake, until every existing screen is migrated. Any
  new screen must use shadcn-official; don't add new CARE-derived
  components going forward.
- `radix-ui` becomes a new dependency once the first real component is
  pulled with `--write` and wired into a screen (not added
  speculatively in this ADR, since nothing consumes it yet); `@base-ui/
  react` stays until the last CARE-derived primitive that needs it is
  retired.
- `scripts/pull-shadcn-component.mjs` defaults to stdout specifically
  because an early version of it defaulted to writing straight into
  `components/ui/<name>.tsx` and clobbered the live, still-in-use CARE
  Button before any rollout decision had been made for that specific
  component — caught immediately via `git status`/`git diff --stat` and
  reverted with `git checkout --`, nothing was committed. Recorded here
  so the reasoning for the `--write` gate doesn't get silently dropped
  later.
- Hard to fully reverse once several new screens exist on this system —
  same as ADR 0008 was for CARE. Easy to reverse *right now*, before any
  screen consumes it: no schema, no committed component files yet.
