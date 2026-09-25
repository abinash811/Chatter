# ADR 0007: Finalized design tokens — color, typography, spacing

Status: superseded by ADR 0008 (color/radius/font only — typography step
sizes below are unaffected)

Date: 2026-09-25

## Context

`app/globals.css`'s color tokens were the unmodified shadcn/ui zinc
defaults, explicitly flagged in their own comment as "not independently
re-audited." Typography had no defined scale — three arbitrary one-off
values (`text-[19px]`, `text-[11px]`, `text-[10px]`) had already crept
into `components/auth/AuthShell.tsx`, the same kind of drift the 300-line
file-size guardrail exists to catch for code. The user asked directly:
what's the best primary color, and can design get the same kind of
concrete, checkable numbers code already has (file length, etc.)?

## Decision

**Primary color: keep violet** (`hsl(262 83% 58%)` light mode), not a
default-by-inertia choice but a deliberate one, for three reasons:
1. Differentiates from Anthropic/Claude's own warm orange brand — Chatter
   is Claude-*powered*, not a reskin of Claude itself, and using the
   underlying provider's own color would blur that line.
2. Differentiates from the competitive set researched so far — Intercom
   and Tidio are blue, Gorgias and Drift lean orange/red. Violet is
   distinct in this category and, per `docs/research/design-system-
   standards.md`, close to Linear's own accent — reinforcing the
   Linear-caliber quality bar already chosen for the console register.
3. Zero migration cost — already the accent everywhere.

**Contrast, actually verified** (target: 4.5:1 for text — genuinely
readable, not a compliance checkbox), not assumed:

| Pair | Ratio | Result |
|---|---|---|
| White text on light-mode accent (buttons) | 5.67:1 | pass |
| Accent as text on white bg (links) | 5.67:1 | pass |
| Foreground on background (body text) | 19.90:1 | pass |
| Muted-foreground on background | 4.83:1 | pass |
| White text on dark-mode accent (buttons) | **4.02:1 (was)** | **fail** |

The dark-mode accent (`66%` lightness) failed for button text. Fixed to
`62%` (4.80:1, passing) in `app/globals.css`. Dark mode isn't wired up
anywhere in the app yet (no toggle exists), so this fixes the case that
will matter first if it ever is. Note: no single accent value at this
hue/saturation passes *both* "white text on accent background" and
"accent as standalone text on the dark background" at ≥4.5:1 — confirmed
by exhaustive search across lightness and saturation. If dark mode ships
and needs accent-colored link text, that needs its own token (e.g.
`--accent-text-dark`), not a reuse of the button accent. Not built now
since nothing uses it yet — flagged here so it isn't silently wrong later.

**Typography — six named steps, nothing arbitrary between them:**

| Token | Size | Tailwind class | Use |
|---|---|---|---|
| micro | 10px | `text-micro` (added, `tailwind.config.ts`) | Uppercase eyebrow labels |
| xs | 12px | `text-xs` | Secondary/muted metadata, trust-list items |
| sm | 14px | `text-sm` | Default body/UI text — already ~90% of usage |
| base | 16px | `text-base` | Reserved; not yet used, standard web body size if ever needed |
| lg | 18px | `text-lg` | Section/page headings |
| xl | 20px | `text-xl` | Reserved for a page-title tier if one is ever needed above `lg` |

The three arbitrary values in `AuthShell.tsx` were snapped to the nearest
step (`19px`→`lg`, `11px`→`xs`) or promoted to a named token (`10px`→
`micro`, added to `tailwind.config.ts` since it's a deliberate recurring
role, not a one-off).

**Spacing — unchanged, already correct**: Tailwind's default 4px base
grid for everything, plus the two named row heights already in
`tailwind.config.ts` (`row` = 40px, `row-sm` = 32px) for anything list/
table/form-row-shaped. No new spacing tokens needed — this was already
following the same discipline the color/type tokens were missing.

## Alternatives considered

- **A different primary color entirely** (blue, green, a warm tone) —
  rejected: no research finding argues for one, and violet's
  differentiation-from-Claude-orange reasoning holds regardless.
- **A larger type scale** (8-10 steps, closer to a full type ramp) —
  rejected for now: six steps already cover every real value in the
  codebase with one step of headroom (`base`, `xl`) for near-term needs;
  matches Linear's own minimal scale per `docs/research/design-system-
  standards.md`.
- **Leave dark-mode contrast unfixed** since it's unused — rejected:
  cheap to fix now, and "known-broken but unused" tokens are exactly what
  causes a silent bug the moment a feature (a dark-mode toggle) gets
  built without re-checking foundations.

## Consequences

- Any new font size needs to be one of the six steps above or get added
  here first — not an arbitrary `text-[Npx]`. Nothing mechanically
  enforces this yet (unlike the raw-hex-color check); a reviewer catches
  it via `docs/conventions.md`'s checklist for now.
- Dark mode's accent-as-text gap (documented above) is real debt if dark
  mode is ever built without addressing it — tracked here, not silently
  inherited.
- `docs/accessibility.md` updated to remove the "not yet audited" TODO
  for these specific token pairs — replaced with the verified numbers
  above. Component-level contrast (e.g. inside shadcn's flagged Combobox/
  Data Table gaps) is still unaudited and remains a separate TODO.
