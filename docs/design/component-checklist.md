# Component completeness checklist

What makes a component or screen *structurally* finished — independent
of which register (Linear/Notion/Stripe, `principles.md` #4) it uses.
Derived from `docs/research/design-system-standards.md`'s 2026-09-27
research into Apple HIG, Material Design 3, Ant Design, and Radix/
shadcn's own conventions — not their visual style, their completeness
bar. Check every item below before adding a new `components/ui/`
primitive, and for every interactive component a touched screen
actually uses as part of the design-bar self-check
(`.claude/rules/console-frontend.md` item 8).

1. **States** — does it have real, working `default`/`hover`/`focus`/
   `pressed`/`disabled`/`loading` behavior, not just a resting-state
   screenshot? `disabled` means genuinely inert (no focus, no keyboard
   activation), not just dimmed text.
2. **Elevation** — if it has depth, does it use one of the system's
   defined shadow levels (`docs/design/design-system.md`'s Elevation
   section, documented 2026-10-02: surface `shadow-xs` / floating
   `shadow-md` / modal `shadow-lg`), tied to an interaction (hover/
   open), not a pick made ad hoc for this one component?
3. **Motion** — if it animates, does it use one of the system's
   defined tiers (`docs/design/design-system.md`'s Motion section,
   documented 2026-10-02: micro `150ms` / overlay `200ms` / panel
   `300-500ms`), serving hierarchy, feedback, or attention? Never
   decorative, never something a user would notice as "an animation"
   rather than just "the UI responding."
4. **Color-independent state** — if meaning is conveyed by color (a
   badge, a status dot), is there also a text label or icon carrying
   the same meaning, so it isn't lost for a colorblind user?
5. **Error copy** — three required parts: what happened, why, what to
   do next. Plain words, nobody blamed. (`principles.md` #6 sets the
   tone; this is the structure that tone applies to.) Mechanically
   checked for the one recurring generic-failure template this app
   actually uses ("Couldn't X — reason. Please try again.") by
   `scripts/check-error-copy-structure.mjs`, added 2026-10-08 after a
   grep found the "why" clause missing from 21 of 23 real messages —
   only rename/archive (2026-09-27) had it. A specific, non-generic
   reason is still better where one's available (a validation message
   like "That URL isn't allowed..." already names it directly and
   isn't required to match this template at all); the check only
   blocks the "what happened. [nothing]. try again" gap, not prose
   quality.
6. **Empty-state copy** — always a way forward (a real CTA), never just
   an explanation of absence.
7. **Keyboard + ARIA** — every state reachable without a mouse
   (`principles.md` #8), and expressed through the same `data-state`/
   `aria-*` attributes driving the visual style, not a second system
   kept in sync by hand.

## How to use it

- **New `components/ui/` primitive**: check all 7 before it ships.
- **Touching an existing screen**: check the 7 for each interactive
  component that screen actually uses, as part of the design-bar
  self-check — not a separate whole-page pass.
- **Found a system-level gap** (no elevation scale, no motion policy):
  log it in `docs/design/audit.md`'s "System coverage" table, don't
  invent a one-off answer for just the component in front of you.

## Known system-level gaps against this checklist (2026-09-27)

- ~~No documented elevation scale~~ — fixed 2026-10-02, see item 2 above.
- ~~No documented motion/duration policy~~ — fixed 2026-10-02, see
  item 3 above. Still no "when not to animate" rule specifically.
- No documented copy-structure rule for errors/empty states — tone is
  covered (`principles.md` #6), structure (items 5-6 above) isn't yet
  written down anywhere else.
- Not audited: which components actually style Radix's `data-disabled`
  and other state attributes versus relying on the `disabled` prop
  alone with no visual follow-through.
