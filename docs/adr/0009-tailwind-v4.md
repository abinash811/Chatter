# ADR 0009: Upgrade to Tailwind CSS v4

Status: accepted

Date: 2026-09-25

## Context

ADR 0008 committed Chatter to an exact copy of CARE's (`ohcnetwork/care_fe`
+ `ohcnetwork/careui`) design system. CARE runs Tailwind **v4**; Chatter
was still on **v3.4.19**. This surfaced as a real, user-visible bug: the
pulled `Sidebar` component's main content rendered *underneath* the fixed
sidebar panel, caught by a real-browser screenshot, not by `tsc` or the
build — Tailwind v3's compiler silently drops an unrecognized v4-only
utility (`w-(--sidebar-width)`, a CSS-variable shorthand v3 never
supported) instead of erroring, so every automated check stayed green
while the actual page was broken.

Checked, not recalled: npm's `latest` dist-tag for `tailwindcss` is
`4.3.3`; `3.4.19` is explicitly tagged `v3-lts` (maintenance only). Our
own Dependabot — configured earlier this session — had already opened
PR #9, "Bump tailwindcss from 3.4.19 to 4.3.3," the same day this gap
surfaced; it sat unreviewed rather than unfound. That's the real process
gap this ADR closes: nothing connects "we're adopting an upstream
project's design system" to "check what major version of its own tooling
that project runs," and no one was triaging open Dependabot major-bump
PRs. `docs/conventions.md`'s feature-build process now includes both.

## Decision

Upgrade to Tailwind v4.3.3 using the official codemod
(`npx @tailwindcss/upgrade@4.3.3`), not a hand migration and not a bare
`package.json` version bump (which is all Dependabot's PR did — it
doesn't migrate config, and v4 needs that). The codemod:

- Deleted `tailwind.config.ts` entirely — v4 is CSS-first. Every custom
  token (the full ADR 0008 set: background/card/popover/sidebar-*/
  primary numbered scale, radius steps, `micro` font size, `row`/
  `row-sm` spacing) migrated into `app/globals.css`'s `@theme` block,
  preserving the two-layer indirection (`@theme`'s `--color-accent:
  hsl(var(--accent))` still points at our own raw HSL custom properties
  in `:root`/`.dark`) rather than collapsing it.
- Replaced `@tailwind base/components/utilities` with `@import
  'tailwindcss'`.
- Swapped the PostCSS plugin (`tailwindcss` → `@tailwindcss/postcss`)
  and removed `autoprefixer` (v4's engine handles it internally) —
  both per Tailwind's own current migration guide, checked via
  WebSearch rather than recalled.
- Added the standard v3→v4 border-color compatibility shim (v4 changed
  the default from `gray-200` to `currentcolor`) — auto-inserted,
  matches official guidance.
- Rewrote 22 template files' arbitrary-value class syntax
  (`border-[40px]` → `border-40`, etc.) to v4 conventions.

## Alternatives considered

- **Hand-patch each pulled CARE file's v4 syntax to v3 equivalents,
  stay on v3** — rejected: whack-a-mole per component (already found
  two independent instances — `sidebar.tsx`'s width, `button.tsx`'s
  shadow utilities), has to be redone on every future pull, drifts
  from "exact copy," and doesn't fix the same failure mode (v3 silently
  dropping unrecognized classes) for whatever's found next.
- **Just merge Dependabot's PR #9** — rejected: it only bumps the
  `package.json` version, doesn't touch `tailwind.config.ts` or
  `postcss.config.js` — would have broken the build immediately rather
  than migrating anything.

## Consequences

- Every future CARE component pull (`scripts/pull-care-component.mjs`)
  now compiles correctly by construction instead of silently degrading
  — this was the actual point, not just fixing the one sidebar bug.
- Verified for real, not just by re-running `tsc`/build (which stayed
  green even when broken, per the Context section): a real headless
  browser confirmed `sidebar-container` now measures the full 256px
  (16rem) it's supposed to, `sidebar-inset` starts at the correct x=256
  offset with zero overlap, expand/collapse both work, and all 11
  `tests/e2e/` specs pass unchanged against the new build.
- `docs/conventions.md`'s "Building a new feature" process gains two
  checks: cross-reference an adopted upstream project's own tooling
  versions before pulling from it, and triage open Dependabot
  major-version PRs relevant to the work at hand rather than assuming
  "no one's raised this yet."
- PR #9 closed as superseded — it proposed the version bump alone,
  this migration is the real fix.
