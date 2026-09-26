# ADR 0017: Complete the shadcn migration now, drop @base-ui/react entirely

Status: accepted

Date: 2026-09-26

## Context

ADR 0014 decided to re-pull all 18 CARE-derived primitives from shadcn's
official registry, but deliberately phased it **new-screens-first** —
migrate a component only when the screen that uses it is next touched,
not in one blanket pass. By the time of this ADR, only 2 of 18
(`Sidebar`, `Table`) had actually moved; the remaining 16 were still on
CARE's fork, still depending on `@base-ui/react` (CARE's primitive
base), while the 2 migrated ones depend on shadcn's real dependency,
the unified `radix-ui` package. That left **two different underlying
primitive libraries in the same codebase** for an indefinite stretch —
the exact kind of drift the phased rollout accepted as a tradeoff for
lower risk per change.

The user has now explicitly asked to finish this: "Remove all design
dependencies and keep only Shadcn." This overrides ADR 0014's phasing
choice — instead of waiting for each of the remaining 16 screens to be
touched organically, do the full migration in one pass now, and remove
`@base-ui/react` from `package.json` once nothing depends on it. This
needed its own recorded decision because it reverses a previously
recorded, deliberate choice (phased rollout) rather than just being the
next increment of it.

## Decision

Migrate all 16 remaining CARE-derived primitives
(`Button`, `Dialog`, `AlertDialog`, `Tabs`, `DropdownMenu`, `Popover`,
`Tooltip`, `Select`, `Separator`, `Avatar`, `Skeleton`, `Alert`,
`Switch`, `RadioGroup`, `Sheet`, `ScrollArea`) to shadcn's official
registry source in one pass, using the same real-source-fetch mechanism
ADR 0014 already built (`scripts/pull-shadcn-component.mjs`, real
source from `raw.githubusercontent.com`, never recalled/guessed). Once
every `components/ui/*.tsx` file is on shadcn's real source, remove
`@base-ui/react` from `package.json` entirely — `radix-ui` becomes the
only headless-primitive dependency in the repo.

Components with real screen usage (`Button`, `Dialog`, `AlertDialog`,
`Tabs`, `DropdownMenu`, `Select`, and `Tooltip`/`Separator`/`Sheet`/
`Skeleton` via `Sidebar`'s internal dependency) get full verification:
`tsc`, a real browser check of the actual screen that renders them, and
the existing `tests/e2e/`/`tests/visual/` suites re-run and updated.
Components with **zero current usage anywhere in the app**
(`Popover`, `Avatar`, `Alert`, `Switch`, `RadioGroup`, `ScrollArea` —
pulled under ADR 0008 but never actually wired into a real screen) get
`tsc` + build verification only; there is no real behavior to verify in
a browser since nothing renders them, and that limitation is stated
plainly rather than claimed as full verification.

## Alternatives considered

- Keep the phased, new-screens-first rollout (ADR 0014's original
  plan) — rejected: the user explicitly asked to finish it now, and the
  stated goal ("remove all design dependencies, keep only shadcn")
  can't be reached incrementally without first deciding to finish the
  set, since `@base-ui/react` can't be dropped while even one file
  still imports it.
- Leave the 6 unused primitives on CARE's source since nothing renders
  them, only migrate the 10 that are actually load-bearing — rejected:
  this satisfies "no dead CARE-derived screens" but not the explicit
  literal ask ("remove all design dependencies... keep only shadcn"),
  and it would leave `@base-ui/react` in `package.json` regardless,
  since those unused files still import it.

## Consequences

Once complete, `@base-ui/react` is gone from the dependency tree and
every primitive in `components/ui/` traces to one real, current upstream
(shadcn's official registry) — closes the two-primitive-library drift
this ADR exists to fix, and removes the last reason ADR 0010's "hand-
author, don't verbatim-pull" caveat needs to distinguish "CARE-derived"
from "shadcn-derived" files by source at all. Hard to reverse only in
the unremarkable sense that re-adopting CARE's fork later would be a
full second migration, not a revert — there is no plausible reason to
want that. `docs/design/design-system.md`'s "still CARE-derived" list
in the component inventory is retired once this lands; the doc instead
just lists the 18 primitives with no source split needed anymore.
