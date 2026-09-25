# Design principles

The bar every screen is checked against — sharp and opinionated on
purpose, not a summary of the deeper docs. For the "why," see
`docs/architecture.md` §7 and `docs/research/design-system-standards.md`.
For the mechanical "how," see `docs/conventions.md` and
`docs/accessibility.md`.

1. **One component, one way.** Every button is `<Button>`, every text
   field `<Input>`/`<Textarea>`, every checkbox `<Checkbox>`. No raw
   HTML control, no inline one-off styling. Mechanically checked
   (`check-no-raw-buttons.mjs`, `check-component-imports.mjs`).

2. **Tokens, never raw values.** Every color, radius, and font size
   reads a token (`app/globals.css`, `tailwind.config.ts`). Never a hex
   code, never an arbitrary Tailwind color class. Mechanically checked
   (`check-design-tokens.mjs`). ADR 0007 is the record of *why* those
   specific tokens.

3. **Preview before code.** A `docs/design/preview/*.html` mockup is
   the visual ground truth for a new page or pattern, checked *before*
   writing JSX — not a description written after the fact to justify
   what got built.

4. **Match the register to the surface**, never one aesthetic applied
   uniformly:
   - Daily-driver screens (bot list, inbox) → **Linear**: dense, fast,
     minimal decoration.
   - Configuration/creative surfaces (persona editing) → **Notion**:
     calm, generous spacing, plain-language labels.
   - Anything touching real data or credentials (integrations, billing)
     → **Stripe**: restrained, trustworthy, no decoration for its own
     sake.

5. **Depth and polish are not optional.** A bordered box with plain
   text is a wireframe, not a finished screen. A real screen has
   deliberate shadow/elevation, a considered hover and active state on
   every interactive element, and transitions — not just a static
   default state. If a screen only has one visual state (the resting
   one), it isn't done.

6. **Plain language, always.** Labels, errors, and empty states speak
   like a person explaining something to a colleague, not a system
   logging an event. No jargon, no raw stack traces or error codes
   surfaced to a user — see `app/error.tsx`'s messages for the bar.

7. **Simple by default, powerful when needed.** Progressive disclosure:
   the common case is immediately visible, advanced options exist but
   stay out of the way. The 80% case never pays for the 20%'s
   complexity in extra clicks or visual noise.

8. **Every interactive element is keyboard-reachable with a visible
   focus state.** No exceptions, checked before shipping
   (`docs/accessibility.md`'s review-checklist item).

9. **If it wouldn't ship at Linear, Stripe, or Notion, it doesn't ship
   here.** The actual bar, not an aspiration — when a screen feels
   "basic," it's failing this principle specifically, usually principle
   5 (no depth/polish) or 6 (system-speak instead of plain language).

10. **One page-composition pattern for record-editing screens, applied
    everywhere, not decided fresh per page.** Any screen that edits one
    entity across multiple sections (a bot's persona/guardrails/tools/
    appearance today; anything else with 3+ config sections later) uses
    the same shape:
    - A **persistent top bar** — entity name, status, primary actions
      (Save/Publish) — always visible, never buried at the bottom of a
      scrolling form.
    - Real `<Tabs>` to switch between sections, not stacked `<Card>`s
      scrolled through top to bottom.
    - A `<Dialog>` confirmation before any action that changes what's
      live/visible to someone else (publishing, disconnecting an
      integration).
    Inspired by CARE's (`ohcnetwork/care_fe`/`careui`, ADR 0008) own
    record-editing screens — not their healthcare content, the
    *shape*. The reason this is its own principle, not just "match
    CARE": once a user learns this shape on one screen, every other
    screen that edits something behaves the same way — zero cognitive
    load from re-learning a layout per page, which is the actual goal,
    not visual sameness for its own sake.
