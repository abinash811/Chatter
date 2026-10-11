# ADR 0036: Adopt Inter as the console's real typeface

Status: accepted (supersedes ADR 0014's typography decision specifically — ADR 0014's other decisions, component/layout provenance, stand)

Date: 2026-10-02

## Context

The user flagged the console's visual design as reading like "a college
project" despite the monochrome token system (ADR 0014/0017) being
internally consistent (verified the same day — `docs/design/audit.md`'s
2026-10-02 consistency-audit entry). The consistency audit was the wrong
tool for this feedback: it checks whether the system agrees with itself,
not whether it looks crafted. A plain, internally-consistent design can
still look generic.

Root-caused, not guessed: `app/globals.css` defined zero `font-family`
override anywhere — confirmed via grep — so every screen ran on
Tailwind's own default system-font stack (`-apple-system`,
`BlinkMacSystemFont`, `Segoe UI`, etc., `node_modules/tailwindcss/
theme.css`). `docs/design/design-system.md` had already documented this
as "no custom font — plain system sans-serif stack," correctly, but it
had never been treated as a gap to close. Every reference product this
project has studied via real screenshots (Linear, Stripe, Notion,
Claude Console, Chatbase) runs a real typeface with a genuine type
scale — this is one of the most reliable signals separating a crafted
product from an unstyled one, independent of color/token work.

Separately, a grep of actual heading sizes in use found the entire app
caps out at `text-lg` (18px) for every page title, with `text-sm`/
`text-xs` used almost everywhere else (97 and 50 real occurrences,
zero use of `text-xl`/`text-2xl`/etc. anywhere) — confirming a real,
measurable lack of typographic hierarchy, not just an impression.

**This explicitly reverses part of ADR 0014**, which removed a custom
typeface (Figtree, via `next/font/google`, inherited from CARE/ADR
0008) specifically to avoid a Google Fonts network dependency, and
recorded "don't chase a custom typeface — Claude Console is a layout
reference, not a typeface to replicate" as a deliberate user call. That
network-dependency concern is still respected here (see the
self-hosted-vs-`next/font/google` choice below) — what changed is the
user's own judgment on the visual-quality tradeoff, made explicitly
today after reviewing the shipped product and calling it "a college
project," not a silent reversal of ADR 0014's reasoning.

## Decision

**Inter**, self-hosted via `@fontsource-variable/inter` (the
`wght.css` weight-axis file only — this app doesn't use `opsz`), not
`next/font/google`. Reasoning, explained to the user before building:
Inter is the real typeface most 2026 SaaS dashboards (including
Linear's reference register this project already targets per
`docs/design/principles.md` #4) actually run, it's free and
self-hostable, and it's a sharper version of the register already being
built toward — not a new look. `next/font/google` would fetch font
files from Google's font CDN at build time; this environment has a
long, confirmed history of specific-domain network blocks (`shopify.
dev`, `ui.shadcn.com`, etc.), so a self-hosted npm package (verified
real via `npm view`, zero runtime/build-time network dependency) is the
safer, more consistent choice — matching this project's established
pattern of preferring self-hosted/vendored solutions over
network-fragile ones (e.g. the self-hosted Playwright Chromium
fallback, ADR 0031).

Wired via `--font-sans` in `app/globals.css`'s `@theme` block (Tailwind
v4's own mechanism — its preflight applies `--font-sans` to `html`
automatically, no per-element class needed), with Tailwind's original
default stack kept as the fallback chain if the font file fails to
load for any reason.

**Also fixed in the same pass** (the type-scale foundation, not just
the font): the 9 genuine page-title headings (`<h1>`/`<h2>` at the top
of Bots, Bot editor's tabs pages, Leads, Actions, Widgets, Approvals,
Data sources, Integrations, Settings, Conversations) bumped from
`text-lg font-semibold` (18px) to `text-xl font-semibold tracking-tight`
(20px) — a real, deliberate tier above dialog/card titles (which stay
at the existing `text-lg`, e.g. shadcn's own `AlertDialogTitle`
default), giving the app its first real heading-vs-subheading
hierarchy. `app/global-error.tsx`'s inline-styled `h1` and
`BotTopBar.tsx`'s editable bot-name input (a different structural
role — an `<Input>` acting as a title, not a static heading) were
deliberately left alone, not touched by this sweep.

## Alternatives considered

- **`next/font/google`** — Next's own documented, most common path for
  Google Fonts. Rejected for the network-dependency reason above, not
  because it's a worse API.
- **A more distinctive, less common typeface** — would give Chatter a
  more unique identity than the extremely common Inter look, but needs
  real comparison against reference screenshots before committing and
  carries more risk of clashing with shadcn's own spacing assumptions
  (shadcn's official components are designed and tested against
  Inter-like metrics). Explained to the user as a real option; they
  chose Inter.
- **A full per-screen typography sweep** (every `text-sm`/`text-xs`
  decision across all ~15 screens, not just page titles) — explicitly
  deferred as separate, larger scope (the user chose to sequence
  "typography + type scale first," with empty-state/depth-hierarchy
  and motion work still ahead as separate passes). Doing everything in
  one pass would have produced a much harder-to-review diff for no
  added benefit — the font swap alone already touches every screen.

## Consequences

Not hard to reverse: one new dependency (`@fontsource-variable/inter`,
~5.3.0), one `@theme` token, one new `import` line in `app/layout.tsx`,
and 9 className edits. Swapping fonts again later touches the same
small surface.

Every visual baseline needed regenerating (expected — the font change
touches every rendered pixel of text) — regenerated and confirmed
stable across two runs, with a manual spot-check of several screens
confirming no layout breakage (clipping, overflow, misalignment) from
Inter's slightly different metrics vs. the system stack.

Still open, by design, as separate future passes (not silently
dropped): a full per-element typography sweep beyond page titles,
`docs/design/audit.md`'s already-tracked elevation-scale and
motion-policy gaps, and the empty-state/depth-hierarchy pass the user
chose to sequence after this one.
