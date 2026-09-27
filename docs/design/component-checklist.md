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
   defined shadow levels, tied to an interaction (hover/open), not a
   `shadow-xs`/`shadow-sm` pick made ad hoc for this one component?
   **We don't have a defined scale yet — see "Known gaps" below.**
3. **Motion** — if it animates, does the motion serve hierarchy,
   feedback, or attention, with a short, bounded duration? Never
   decorative, never something a user would notice as "an animation"
   rather than just "the UI responding."
4. **Color-independent state** — if meaning is conveyed by color (a
   badge, a status dot), is there also a text label or icon carrying
   the same meaning, so it isn't lost for a colorblind user?
5. **Error copy** — three required parts: what happened, why, what to
   do next. Plain words, nobody blamed. (`principles.md` #6 sets the
   tone; this is the structure that tone applies to.)
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

- No documented elevation scale — `docs/design/audit.md`'s "System
  coverage" table already tracks this.
- No documented motion/duration policy — transitions exist per
  component (`transition-shadow`, `transition-opacity`) with no stated
  standard duration/easing or "when not to animate" rule.
- No documented copy-structure rule for errors/empty states — tone is
  covered (`principles.md` #6), structure (items 5-6 above) isn't yet
  written down anywhere else.
- Not audited: which components actually style Radix's `data-disabled`
  and other state attributes versus relying on the `disabled` prop
  alone with no visual follow-through.
