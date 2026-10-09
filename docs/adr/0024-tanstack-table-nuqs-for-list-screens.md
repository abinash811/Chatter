# ADR 0024: TanStack Table + nuqs for console list screens

Status: accepted

Date: 2026-09-28

## Context

The console has five hand-rolled list screens now (bots, leads,
conversations, actions, approvals), each with its own copy of
search/sort/filter state management. The bots list — the most complex
of them — has ~40 lines of bespoke `useState` + `.filter()`/`.sort()`
logic for exactly the kind of thing a table library exists to solve,
and that logic doesn't survive a page reload or a shared link (search
and sort both reset to nothing).

The user asked for a review of several popular Next.js/shadcn starter
templates to find patterns worth adopting for speed and polish. Two
matched a real gap here: `@tanstack/react-table` (the engine behind
shadcn's own documented "Data Table" pattern) for the table logic, and
`nuqs` (paired with it in the dashboard-starter template reviewed) for
persisting that state to the URL instead of plain component state.

This needed a recorded decision because it's the kind of choice that
becomes the standard for every future list screen once adopted, not a
one-off — reversing it later means touching every screen that copied
the pattern.

## Decision

Adopt `@tanstack/react-table` for filter/sort row-model logic and
`nuqs` for URL-persisted search/sort state on console list screens,
piloted on the bots list (`components/console/BotsTable.tsx`) before
any wider rollout. Row *rendering* stays bespoke per screen
(`BotTableRow.tsx`'s whole-row click navigation, stopPropagation'd
actions menu, custom cells) — TanStack Table only owns computing the
filtered/sorted row order, not the JSX. Client-side filtering/sorting
stays the right call (unchanged from before): per-org list sizes don't
justify a server round trip.

**Pinned to `@tanstack/react-table@8.21.3`, not the npm `latest` tag
(`9.2.4`).** TanStack shipped a genuinely different v9 API
(`ReactTable`/`createCoreRowModel` instead of
`useReactTable`/`getCoreRowModel`) as their new `latest` — but shadcn's
own documented Data Table pattern, and every mainstream tutorial/
starter (including the one this decision was sourced from), are still
written against v8. The whole rationale for this adoption is "match a
proven, widely-documented pattern," so building against the
unfamiliar, barely-documented v9 would work against that rationale.
Revisit the v9 pin once shadcn's own docs and the wider ecosystem catch
up.

## Alternatives considered

- **Keep the hand-rolled `useState` + `.filter()`/`.sort()` pattern** —
  works today, but every new list screen re-derives the same logic,
  and none of them get URL-persisted state without hand-building it
  per screen.
- **TanStack Table v9 (npm's `latest`)** — newer, but its API isn't
  what shadcn's docs or the researched starter template actually use;
  adopting it now means building against undocumented ground, not the
  "proven pattern" this decision is supposed to buy.
- **Also adopt Clerk or Supabase** (from the same starter-template
  research) for auth/multi-tenancy — explicitly rejected. Chatter
  already has a deliberate, ADR-backed foundation here (ADR 0003's
  Postgres RLS, ADR 0006's custom email+password auth) that's stronger
  than either vendor's default (RLS enforces isolation at the database
  layer, not just app code) — swapping it would be a costly reversal
  of a verified, load-bearing decision for no real gain.

## Consequences

- Every future list screen (leads, conversations, actions, and any new
  one) should follow this same pattern rather than reinventing
  search/sort state — not a mandate to migrate the existing four
  immediately, but the default going forward.
- Real, measured cost: the `/bots` page's client bundle grew from
  ~4.9kB to ~23.6kB First Load JS (confirmed via a real production
  build, not assumed) — the honest price of a general-purpose table
  engine. Acceptable for a console tool, not something to pay on the
  embeddable widget.
- The v8 pin is a real, disclosed constraint, not a permanent one —
  moving to v9 later means learning and porting to its different API,
  same cost as adopting any other major-version bump.
- Verified end-to-end: `tsc` clean, all 9 `check:all` guardrails pass,
  full unit suite (166 tests) green, a new real e2e test proving sort
  order changes and survives a page reload (the actual new behavior,
  not just that it compiles), the existing 8 `bots-list.spec.ts` specs
  all pass unmodified, the a11y scan is clean, and all 18
  `tests/visual/` baselines are pixel-identical to before this change
  — confirming the migration changed no rendered output, only the
  state-management layer underneath it.
