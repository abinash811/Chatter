# ADR 0008: Adopt CARE's exact design system — supersedes ADR 0007

Status: accepted

Date: 2026-09-25

## Context

The user reviewed `ohcnetwork/care_fe` and `ohcnetwork/careui` (Open
Healthcare Network's EMR frontend and its extracted shadcn component
registry) and asked for Chatter to look and feel the same — not
"inspired by," an exact copy of their token values, explicitly choosing
this over keeping our own violet accent (ADR 0007) reskinned onto their
structure. Colors can change later; the design itself should not be a
reinterpretation.

`careui` (careui.ohc.network) is the canonical source used here, not
`care_fe` directly: it's the newer, actively maintained extraction of
their design system, installable via the shadcn CLI
(`npx shadcn@latest add <component> --registry https://careui.ohc.network`),
and it's what we'll pull real components (Dialog, Table, Sidebar, etc.)
from next. `care_fe` itself still supplied two things `careui` dropped:
the `warning`/`alert`/`danger` semantic color extensions (amber/violet/
red) and the Figtree font choice.

All values below are direct HSL conversions of CARE's real Tailwind
colors (`emerald`, `neutral`, `red`, `amber`, `violet`, `indigo`),
computed from the actual `tailwindcss/colors` package — not recalled
from memory or eyeballed from a screenshot, per CLAUDE.md's rule to
check real values.

## Decision

**Primary color: emerald**, not violet. `--accent: 163 88% 20%`
(emerald-800, light) / `158 64% 52%` (emerald-400, dark) — CARE's exact
primary, replacing ADR 0007's violet across every existing screen via
the token layer alone (no component edits needed — every component
already referenced `accent`/`background`/`border`/etc. by token name,
never a raw color).

**Full CARE token set adopted**, not just the handful we had:
`background`/`soft-background`/`muted-background`/`strong-background`,
`foreground`/`muted-foreground`/`soft-foreground`/`disabled-foreground`/
`placeholder-foreground`/`inverse-foreground`, `card`, `popover`,
`secondary`, `border`/`soft-border`/`strong-border`/`stronger-border`/
`inverse-border`, `input`, `ring`, and the full `sidebar-*` set — CARE's
exact neutral (`neutral-*`) and indigo (`ring`) values. Nothing here is
used by a component yet beyond the original 8 tokens, but they need to
exist now: components pulled from the `careui` registry reference these
exact variable names, and defining them ahead of time means those
installs will just work instead of silently rendering unstyled.

**Semantic extensions kept from `care_fe`**: `warning` (amber-500),
`alert` (violet-500) — CARE's own naming, kept as-is rather than
renamed to fit ours. `destructive` uses CARE's red instead of ours.

**Radius: `0.625rem`**, CARE's exact value (was our own `0.5rem`).

**Font: Figtree**, CARE's exact typeface. Loaded via `next/font/google`
rather than CARE's `@fontsource` runtime CSS import — same typeface,
self-hosted and build-time-optimized, which is the idiomatic mechanism
in Next.js App Router vs. their Vite setup. The visual result is
identical; only the loading mechanism differs, deliberately.

**Preview mockups** (`docs/design/preview/auth.html`, `bots-list.html`,
`bot-editor.html`) updated to the same emerald values so they stay
accurate as the visual ground truth.

## Alternatives considered

- **Keep violet, adopt only CARE's structure** (ADR 0007's original
  plan, before this decision) — rejected: the user explicitly chose an
  exact copy over a reskin, with colors staying open to revisit later
  if this doesn't work out.
- **Copy `care_fe`'s own token file directly** instead of `careui`'s —
  rejected: `care_fe` uses `cssVariables: false` (raw Tailwind color
  classes, no CSS-variable indirection) and a much thinner token set;
  `careui` is the richer, more current, and — critically — the
  component-installable source, so matching it now avoids a second
  token migration when we pull real components from it.
- **Approximate CARE's alpha-blended dark-mode borders exactly**
  (`white/9%` etc.) — rejected: our HSL-variable system doesn't carry
  alpha compositing without a second `rgba()`-based token path.
  Approximated as solid neutral steps instead — visually equivalent on
  a near-black background, documented inline in `globals.css` rather
  than silently different.

## Consequences

- Every existing screen re-themed automatically (verified with a real
  headless-browser run against a production build — computed `--accent`
  and font both confirmed live) — zero component-level edits required,
  because no raw colors existed outside the token file
  (`check:tokens` guardrail already enforces this).
- The next phase — pulling real components from the `careui` registry
  and rebuilding each screen's layout/density/composition against
  actual `care_fe` screens, not just recoloring our existing ones — is
  still open. This ADR covers tokens/infrastructure only.
- Chart colors, the sidebar-ring/protanopia/tritanopia/high-contrast
  color-blind modes, and CARE's alpha-based border system are
  deliberately not ported — nothing in Chatter uses charts or
  alternate color modes yet, so faithfully porting unused decorative
  tokens would be speculative. Tracked here so it isn't forgotten if
  those features are ever built.
- ADR 0007 is superseded: its violet accent and 6-step type scale's
  color rationale no longer apply. Its typography step *sizes* (10/12/
  14/16/18/20px) are unaffected — this ADR only changes color, radius,
  and font-family, not the type scale.
