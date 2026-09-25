# ADR 0010: Use CARE as a reference, stop pulling component source verbatim

Status: accepted

Date: 2026-09-25

## Context

ADR 0008 committed Chatter to an exact copy of CARE's (`ohcnetwork/care_fe`
+ `ohcnetwork/careui`) design system — tokens, colors, radius, font. On top
of that, the actual build mechanism adopted (never itself recorded in an
ADR, only narrated in CLAUDE.md's "Done" list) was
`scripts/pull-care-component.mjs`: copy CARE's real component source (JSX
+ Tailwind classes) from the `careui` registry byte-for-byte, keeping it
untouched except for documented correctness patches. 18 primitives were
pulled this way.

That mechanism produced three real, silent bugs — none caught by `tsc`,
none caught by the build, all caught only by an actual browser screenshot:

1. **Sidebar** — CARE's Tailwind v4 arbitrary-value syntax
   (`w-(--sidebar-width)`) silently compiled to nothing under Chatter's
   then-v3.4.19 Tailwind (fixed by ADR 0009's v4 upgrade).
2. **Button** — CARE's classes reference both a numbered
   `primary-50..900` scale and a bare `primary`/`primary-foreground`
   DEFAULT pair; only the numbered scale had been added to
   `tailwind.config.ts`, so the fill silently broke.
3. **Tabs** — CARE's own source uses bare `data-horizontal:`/
   `data-vertical:` Tailwind shorthand (presence-only attribute
   matching), but Base UI's `Tabs` only ever sets a valued
   `data-orientation="horizontal"|"vertical"` attribute. This one is a
   genuine bug in CARE's own upstream source, not a version mismatch on
   our side — confirmed against their own pinned Base UI version too.

The common root cause across all three: Tailwind class names, CSS
variables, and `data-*` attribute selectors are just strings to `tsc`,
the build, and every guardrail check we run. A class that never matches
anything real simply no-ops — nothing in the pipeline can tell "this
class is dead" from "this class is doing its job." Verbatim-copying
CARE's source means inheriting every assumption its authors made about
*their* exact Base UI/Tailwind versions and token names, with nothing
automated checking whether those assumptions still hold on ours. Three
incidents against 18 pulled files is a real, recurring failure mode, not
a coincidence — it needed a recorded decision, not another one-off
patch.

## Decision

**Stop pulling CARE component source verbatim.** Use CARE's real screens
and components as a **visual and behavioral reference only** — look at
what it does, then hand-author the JSX/Tailwind ourselves against
Chatter's own already-verified token system (`app/globals.css`, per ADR
0008). We can still build on `@base-ui/react`'s headless primitives
directly for behavior (focus trap, keyboard nav, ARIA wiring on
Dialog/Tabs/Sidebar/etc.) — what stops happening is copying CARE's
specific `className` strings and assuming they're correct on our stack.

This does **not** reverse ADR 0008: the token/color/radius/font decision
stays accepted. CARE is still the exact visual target; only the
mechanism for reaching it changes — reference-and-rebuild instead of
copy-and-patch.

**Scope of this ADR**: it sets the policy for new primitives and for
screen rebuilds going forward. Whether the 18 already-pulled primitives
get retroactively rewritten, or stay as-is (already patched and
verified), is a separate, unresolved cost/benefit call — not decided
here. See `docs/open-questions.md`.

## Alternatives considered

- **Keep verbatim pulling, add a mandatory post-pull screenshot check** —
  narrows the *detection* gap (would have caught all three bugs sooner)
  but not the root cause: we'd still be silently inheriting whatever
  CARE's source assumes about versions/attributes we don't control, and
  paying for a new manual verification step on every future pull.
  Rejected as a fix for the underlying problem, though the "always
  screenshot a new UI pattern" discipline this ADR still relies on isn't
  new — it's the same real-verification practice already in place.
- **Keep verbatim pulling, add an automated linter for suspicious `data-`
  Tailwind shorthand** — would only catch the Tabs class of bug (bare
  `data-x:` vs. valued `data-[x=y]:`), not the token-surface-mismatch
  class (Sidebar, Button). A narrower fix for a narrower slice of the
  same problem.
- **Fork `careui` and maintain a patched copy** — rejected: still
  couples us to their upstream release cadence and Base UI version
  choices; more infrastructure than hand-authoring against tokens we
  already fully control.

## Consequences

- Removes the whole class of "inherited hidden version-drift bug"
  silently, by construction — we no longer copy assumptions we can't
  verify are still true.
- We now own re-implementing and re-verifying interaction behavior
  ourselves for anything new (still built on `@base-ui/react`'s real
  primitives, so accessibility/keyboard wiring isn't lost — just no
  longer inherited as a side effect of copying CARE's exact classes).
- `scripts/pull-care-component.mjs` stays in the repo (it may still be
  useful for one-off reference-reading — `--from <local-checkout>` to
  inspect CARE's actual source while hand-authoring) but is no longer
  the default path for new work. `docs/conventions.md`'s "Building a new
  feature" step 2 is updated in this same change to point at "use CARE
  as reference, hand-author against `app/globals.css` tokens" instead of
  the pull script.
- Hard to reverse only in the trivial sense that reverting means going
  back to copy-and-patch and re-accepting the version-drift risk this
  ADR closes — no data or irreversible migration is involved either way.
- Open, not decided here: whether to retroactively rewrite the 18
  already-pulled primitives. Tracked as an open question until the user
  decides the scope.
