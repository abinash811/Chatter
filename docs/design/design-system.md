# Design system — consolidated reference

The single, current source of truth for Chatter's design tokens,
component inventory, and where each one comes from. `docs/design/
principles.md` is the philosophy/bar this measures against;
`app/globals.css` is the actual implementation this describes — if the
two ever disagree, `app/globals.css` is correct and this file is stale
and needs updating in the same PR that changed it.

## Provenance (ADR 0014)

Two separate sources, deliberately not one:

- **Components + tokens**: shadcn/ui's official registry (`new-york-v4`
  style) — pulled from its real, current GitHub source via
  `scripts/pull-shadcn-component.mjs` (its live registry API,
  `ui.shadcn.com`, is blocked by this environment's egress policy;
  `raw.githubusercontent.com` isn't). Default neutral base color,
  default typography (no custom font — plain system sans-serif stack).
- **Layout/structure**: Claude Console's real, current product
  (screenshots supplied directly by the user — Dashboard, Skills pages).
  Not its component source, not its brand typeface/palette — just how
  it composes a screen.

Superseded: ADR 0008 (CARE's exact palette), refined-then-superseded
ADR 0010/0011 (CARE as reference-only). CARE's 18 pulled primitives
still exist in `components/ui/` and are being re-pulled from shadcn's
official source over time, screen by screen (new-screens-first
rollout — see ADR 0014's Consequences).

## Color tokens

Every value below is a real Tailwind `neutral`/`red`/`amber`/`violet`
scale entry, computed from the installed `tailwindcss/colors` package
(`node -e "console.log(require('tailwindcss/colors').neutral)"`), not
guessed — same discipline ADR 0008 used. Format is raw `oklch(...)`,
matching shadcn's own real current convention (its `:root`/`.dark`
blocks, verified via `raw.githubusercontent.com` — not the older
HSL-triplet-in-a-wrapper convention CARE used, which can't carry an
alpha channel the way oklch's `/ N%` slash can).

**Primary is monochrome** — near-black in light mode
(`oklch(0% 0 0)`), near-white in dark (`oklch(92.2% 0 none)`). This
isn't a placeholder; it's the deliberate choice, matching both
shadcn's actual default *and* Claude Console's real screenshots (a
solid-black "Build an agent"/"Create skill" button — no colored UI
chrome anywhere, color reserved for sparing illustration accents only).

| Token | Light | Dark | Source |
|---|---|---|---|
| `background` | `oklch(1 0 0)` white | `oklch(14.5% 0 none)` neutral-950 | shadcn default |
| `foreground` | `oklch(0% 0 0)` black | `oklch(98.5% 0 none)` neutral-50 | shadcn default |
| `primary` | `oklch(0% 0 0)` black | `oklch(92.2% 0 none)` neutral-200 | shadcn default |
| `primary-foreground` | `oklch(98.5% 0 none)` | `oklch(20.5% 0 none)` | shadcn default |
| `secondary` / `accent` / `muted` | `oklch(97% 0 none)` neutral-100 | `oklch(26.9%–37.1% 0 none)` neutral-700/800 | shadcn default |
| `muted-foreground` | `oklch(55.6% 0 none)` neutral-500 | `oklch(70.8% 0 none)` neutral-400 | shadcn default (real 4.74:1 contrast, verified) |
| `border` / `input` | `oklch(92.2%/87% 0 none)` neutral-200/300 | `oklch(1 0 0 / 10–15%)` translucent white | shadcn default |
| `ring` | `oklch(70.8% 0 none)` neutral-400 | `oklch(55.6% 0 none)` neutral-500 | shadcn default |
| `destructive` | `oklch(57.7% 0.245 27.325)` red-600 | `oklch(70.4% 0.191 22.216)` red-400 | Tailwind `red` scale |
| `sidebar` / `sidebar-accent` | neutral-50/100 | neutral-900/800 | shadcn default, monochrome active-item pill (matches Claude Console's subtle gray-pill nav state — no colored active marker) |

**Chatter's own extended vocabulary** (shadcn's leaner default doesn't
define these — kept from the pre-ADR-0014 token set, re-derived from
the same neutral/amber/violet scales):

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `soft-background` / `strong-background` | neutral-50 / neutral-200 | neutral-900 / neutral-700 | finer-grained background tiers than `background`/`muted` alone |
| `soft-foreground` | neutral-600 (7.81:1 contrast, verified) | neutral-300 | a step between `foreground` and `muted-foreground` |
| `disabled-foreground` / `placeholder-foreground` | neutral-300 / neutral-500 | neutral-700 / neutral-500 | form-control states |
| `inverse-foreground` / `inverse-border` | white | black | text/border meant to sit on the fixed-dark `panel` surface |
| `warning` | `oklch(76.9% 0.188 70.08)` amber-500 | same | Tailwind `amber` scale — a real hue, unlike the monochrome UI chrome, since this is a semantic status color |
| `alert` | `oklch(60.6% 0.25 292.717)` violet-500 | same | Tailwind `violet` scale, same reasoning |
| `panel` / `panel-foreground` | neutral-950 / neutral-50 | *(fixed — doesn't follow light/dark)* | the auth split-layout's dark hero panel (`components/auth/AuthShell.tsx`) — deliberately not theme-following |
| `primary-50`…`primary-950` | Tailwind `neutral` scale | — | numbered steps some pulled shadcn/CARE components reference directly for hover/active shades, not just the semantic pair |

**Verified for real**, not just computed on paper: a real headless-
browser check (`getComputedStyle` + a canvas round-trip to get true
rendered sRGB bytes, not trusting oklch math by hand) confirmed
`muted-foreground` at 4.74:1 and `soft-foreground` at 7.81:1 against
`background` — both pass WCAG AA for normal text (4.5:1). `border`/
`disabled-foreground` are intentionally low-contrast (~1.3–1.5:1) —
correct for non-text decorative/disabled elements (WCAG doesn't apply
the 4.5:1 text threshold to them), matching shadcn's own real default
border value exactly.

## Type

No custom font — shadcn's own default: the platform sans-serif stack
(`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`), verified
live via `getComputedStyle(document.body).fontFamily`. `next/font/
google`'s Figtree import (CARE's typeface, ADR 0008) removed from
`app/layout.tsx` — no Google Fonts network dependency at all now.

Explicit user call (ADR 0014): don't chase Anthropic's brand serif
seen in the Claude Console screenshots — Chatter is a separate
commercial product, and it's Anthropic's own brand asset. Claude
Console is a *layout* reference here, not a typeface to replicate.

## Radius & spacing

`--radius: 0.625rem` — unchanged; happens to match shadcn's own real
current default exactly (confirmed via the same `raw.githubusercontent.
com` fetch used for the component source), so this was already correct
before ADR 0014, not a coincidence worth re-deriving.

## Component inventory

**All 18 primitives in `components/ui/` are now on shadcn's real
official registry source (ADR 0014 + ADR 0017)** — the CARE-derived
source (ADR 0008) is fully retired. `@base-ui/react` (CARE's underlying
primitive library) has been removed from `package.json` entirely;
`radix-ui` is the only headless-primitive dependency in the repo now.
ADR 0014's original new-screens-first phasing (migrate one component
whenever its screen is next touched) was itself superseded by ADR 0017
— the user asked to finish the whole set in one pass rather than wait
for each remaining screen to be touched organically.

`Sidebar` and `Table` (the first 2, migrated under ADR 0014) needed no
further changes. The remaining 16
(`Button`, `Dialog`, `AlertDialog`, `Tabs`, `DropdownMenu`, `Popover`,
`Tooltip`, `Select`, `Separator`, `Avatar`, `Skeleton`, `Alert`,
`Switch`, `RadioGroup`, `Sheet`, `ScrollArea`) were migrated under ADR
0017, surfacing a few real API differences between CARE's
`@base-ui/react` and shadcn's real `radix-ui`:

- **`Tabs`**: `TabsContent`'s `keepMounted` (Base UI) renamed to
  `forceMount` (radix-ui) — same semantics, different prop name.
  Updated in `BotEditorForm.tsx`.
- **`Button`**: CARE's 8-variant set (including `destructive-solid`)
  doesn't exist on shadcn's real 6-variant `Button` — the one usage
  (`KnowledgeForm.tsx`'s delete confirmation) uses `destructive`
  instead, shadcn's own single solid-destructive variant.
- **`Select`**: real `<Select.Value>` (radix-ui) resolves the selected
  item's label directly — no `items` prop workaround needed (that was
  specifically a Base UI requirement, since its popup unmounts while
  closed; radix-ui's doesn't have that limitation).
  `ConversationFilters.tsx` simplified accordingly.
- **`Tooltip`**: now also real shadcn source, so `Sidebar`'s one-line
  `delay={0}` adaptation (from the ADR 0014 Sidebar-only migration)
  reverted to shadcn's own real prop, `delayDuration={0}`.
- **`Alert`/`Sheet`**: CARE's extra `AlertAction`/`SheetBody` exports
  don't exist in shadcn's real source (and weren't used anywhere in the
  app) — dropped from `components/ui/index.ts`.
- **A real bug, not just an API rename**: `AlertDialogAction`'s
  `<form action={...}>` submit-button pattern (used by the knowledge
  base's delete confirmation) raced with radix-ui's own close-on-click
  dismissal — the dialog unmounting mid-click corrupted React's
  server-action wiring, so clicking "Delete" never actually submitted
  anything (confirmed: zero network requests fired). Fixed by calling
  the `useActionState` dispatch directly with manually-built `FormData`
  from `onClick` instead of relying on native form submission — see
  `KnowledgeForm.tsx` and its own comment. Caught only by a real
  click-through + checking for an actual network request, not by `tsc`
  or the build; a persistent regression test
  (`tests/e2e/knowledge.spec.ts`) now guards it.

Plus Chatter's own hand-authored primitives (never CARE- or
shadcn-derived): `Input`, `Textarea`, `Label`, `Checkbox`, `Card`/
`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`, `Badge`,
`Toaster`.

To pull a fresh component from shadcn's real official source:
`node scripts/pull-shadcn-component.mjs <name>` (stdout by default;
`--write` to place it in `components/ui/` — deliberately not automatic,
see ADR 0014's Consequences for why).

## Known gaps

- Dark mode (`.dark` class) tokens are defined and were spot-checked
  for real HSL→oklch conversion correctness, but no screen actually
  toggles it yet — no live dark-mode contrast verification has been
  done (same unverified status as before ADR 0014, not a new gap this
  introduced).
- ~~16 of the 18 CARE-derived primitives haven't been re-pulled yet~~
  — resolved by ADR 0017: all 18 are now on shadcn's real source,
  `@base-ui/react` removed entirely.
