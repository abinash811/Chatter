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
| `secondary` / `muted` | `oklch(97% 0 none)` neutral-100 | `oklch(26.9%–37.1% 0 none)` neutral-700/800 | shadcn default |
| `accent` | `oklch(92.2% 0 none)` neutral-200 | `oklch(37.1% 0 none)` neutral-700 (unchanged) | 2026-10-02: darkened from neutral-100 — the old value was only a 3-point lightness gap from `--background`'s pure white, making every ghost-button hover nearly invisible (flagged in this file's own audit, fixed after explaining the tradeoff to the user). Reuses the same neutral-200 step already used for `border`/`strong-background`, not a new raw value. |
| `muted-foreground` | `oklch(48% 0 none)` (darker than shadcn's stock 55.6%) | `oklch(70.8% 0 none)` neutral-400 | 2026-10-02: the stock value was a razor-thin 4.34:1 against `--muted` (97% L) — see note below |
| `border` / `input` | `oklch(92.2%/87% 0 none)` neutral-200/300 | `oklch(1 0 0 / 10–15%)` translucent white | shadcn default |
| `ring` | `oklch(70.8% 0 none)` neutral-400 | `oklch(55.6% 0 none)` neutral-500 | shadcn default |
| `destructive` | `oklch(45% 0.245 27.325)` (darker than Tailwind's stock red-600, 57.7%) | `oklch(70.4% 0.191 22.216)` red-400 | 2026-10-02: the stock value was 4.0-4.77:1 depending on usage site (text on white, the destructive Badge's tinted background) — see note below |
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
`soft-foreground` at 7.81:1 against `background` — passes WCAG AA for
normal text (4.5:1). `border`/`disabled-foreground` are intentionally
low-contrast (~1.3–1.5:1) — correct for non-text decorative/disabled
elements (WCAG doesn't apply the 4.5:1 text threshold to them),
matching shadcn's own real default border value exactly.

**2026-10-02 correction**: the original `muted-foreground` figure above
(4.74:1) checked it against `--background` (pure white) — but
`muted-foreground` is paired with `--muted` (97% L, not 100%) at every
real usage site (`Badge`'s `muted` variant, secondary page text), and
against the *right* backdrop it was really 4.34:1 — under WCAG AA,
not over. Caught for real by the Next.js 16 upgrade's full a11y-suite
run (ADR 0033), not by re-reading this doc. `muted-foreground` and
`destructive` were both re-measured against every real pairing they're
actually used with (not just one convenient backdrop) and set to the
darker values in the table above, each landing 5.5-7:1 — comfortable
margin, not another razor-thin pass. The methodology lesson, not just
the number: verify a text color against the specific background it's
actually painted on in the app, not whichever background is easiest to
check.

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

**Spacing scale.** No custom spacing scale is defined in `app/globals.css`
— every `p-*`/`gap-*`/`space-y-*` utility resolves against Tailwind v4's
own default scale (`--spacing: 0.25rem` base unit, so `p-2` = 0.5rem,
`gap-4` = 1rem, etc.), same as the color/radius tokens: adopted as-is,
not re-derived. Real usage across the console, from a grep of every
`components`/`app` file (most-used first): `gap-2` (0.5rem) and `px-2`/
`gap-1`/`px-3`/`py-2` for tight control-level spacing (button/input
padding, icon gaps); `space-y-3`/`space-y-4`/`gap-3`/`gap-4`/`gap-6` for
form-field and card-grid rhythm; `p-4`/`p-6` for card/dialog body
padding. Two extra semantic spacing tokens exist for one specific job —
list-row height, not general layout — `--spacing-row: 2.5rem` and
`--spacing-row-sm: 2rem` (`app/globals.css`), used by table/list rows
that need a fixed height independent of their content's own padding.
No other named spacing tokens exist; a new screen should reach for the
scale directly (`gap-4`, `p-6`, etc.) rather than inventing one-off
pixel values.

## Text styles

No custom type scale is defined either — same "adopt Tailwind's
default, don't re-derive" pattern as spacing. Real usage, most-to-least
common: `text-sm` (0.875rem, the workhorse — body copy, table cells,
form labels, button text), `text-xs` (0.75rem — helper/meta text,
badges, timestamps), `text-lg` (1.125rem — dialog/section titles), and
`text-base` (1rem, rare — the few places plain paragraph-scale copy is
needed outside a form control). One custom token exists for a size
smaller than Tailwind's own scale goes: `--text-micro: 0.625rem` /
`--text-micro--line-height: 1rem` (`app/globals.css`) — used sparingly
for the smallest UI chrome (e.g. a table's tiniest inline count/badge),
not general copy.

Weight: `font-medium` (500, the default for anything that needs to
stand out slightly — button labels, active nav items, table headers)
is the most common, followed by `font-semibold` (600 — headings, dialog
titles, emphasized inline text) and `font-normal` (400 — the default
body-copy weight, left implicit rather than written out in most places).
`font-bold` (700) is intentionally rare — reserved for the one or two
places a heading needs to out-rank a `font-semibold` one on the same
screen, not a general "make it stand out" tool.

There is no documented heading hierarchy (no `h1`/`h2`/`h3` size
convention) — each screen currently picks `text-lg font-semibold` for
its one page-level title and `text-sm font-medium` for section labels
by convention, not a named scale. Formalizing an actual `h1`–`h3` scale
is open work, not yet done.

## Breakpoints

Chatter's console is a **desktop-first web application, not a
responsive mobile product** — there is no deliberate mobile layout
strategy, and `docs/design/audit.md`'s "Checked <900px wide" column
this file used to reference has been retired for exactly that reason.
No custom breakpoints are defined in `app/globals.css`'s `@theme`
block, so Tailwind v4's own unconfigured defaults apply if a
breakpoint prefix is ever used: `sm` 40rem/640px, `md` 48rem/768px,
`lg` 64rem/1024px, `xl` 80rem/1280px, `2xl` 96rem/1536px. In practice
almost every `sm:`/`md:`/`lg:` prefix in the codebase today comes from
shadcn's own pulled component source (e.g. `Dialog`'s
`sm:flex-row` footer, `Sidebar`'s internal collapse mechanics) rather
than a deliberate app-level responsive rule — a handful of `max-w-sm`/
`max-w-md`/`max-w-lg` dialog-width utilities are the closest thing to
intentional breakpoint-driven sizing this app authors itself. New
screens should be designed and verified at a standard desktop viewport
(1280px+) and are not expected to adapt below it.

## Component inventory

**All 25 primitives in `components/ui/` are now verified shadcn/ui
sources (ADR 0014 + ADR 0017 + 2026-09-28's provenance closure)** — no
hand-rolled primitive exists anywhere in the product, and
`scripts/check-shadcn-only-primitives.mjs` (part of `check:all`)
enforces this mechanically: any new `components/ui/*.tsx` file must be
listed in `scripts/shadcn-manifest.json`, added only after actually
pulling and diffing the real source, never by assumption. The
CARE-derived source (ADR 0008) is fully retired; `@base-ui/react`
(CARE's underlying primitive library) has been removed from
`package.json` entirely — `radix-ui` is the only headless-primitive
dependency in the repo now.

**18 were migrated first** (ADR 0014 + ADR 0017's original pass). **7
more (Input, Textarea, Label, Checkbox, Card, Badge, Toaster) were
found 2026-09-28 to have been hand-authored from scratch in shadcn's
*style* — same `cn()` pattern, similar prop shapes — but never actually
pulled from shadcn's real upstream source**, a gap the header-sniffing
check (`@type registry:`, `scripts/lib/careExemption.mjs`) couldn't
catch since that header isn't present on every real shadcn source file
(confirmed by pulling `input`/`textarea`/`label`/`checkbox`/`badge`/
`card`/`sonner` for real — none of the 7 carry it). All 7 were rebased
onto shadcn's real source with deliberate customizations kept as
documented deltas (never a blind overwrite — see each file's own header
comment): `Card`'s Notion-register soft-fill/spacing/title-size tuning,
`Input`/`Textarea`/`Checkbox`'s `hover:border-strong-border` and
`ring-ring` focus treatment, `Badge`'s `default`/`muted`/`destructive`
variant names (kept, not shadcn's `secondary`/`outline`/`ghost`/`link`
— every call site already depends on them), `Toaster`'s hardcoded
`theme="light"` (no `next-themes` — this app has no theme provider).

`Checkbox` is a real behavior change, not just styling: it's now
radix-ui's `Checkbox` primitive instead of a styled native
`<input type="checkbox">`, which changed its event API
(`onChange`/`e.target.checked` → `onCheckedChange`) at both real call
sites (`ConversationFilters.tsx`, `AddActionDialog.tsx`). A real bug
was caught and fixed in the same pass, only visible in an actual
rendered screenshot: the generic `rounded` utility resolves to this
app's `--radius` (10px), which on a 16px checkbox reads as a full
circle, not a checkbox — shadcn's real source avoids this with an
explicit `rounded-[4px]`, which this file now matches. `Label` picked
up a real accessibility improvement from its real source too: radix-ui's
`Label` correctly forwards a click to an associated Radix control
(Switch/Checkbox/RadioGroup) the way a plain `<label htmlFor>` can't.

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
