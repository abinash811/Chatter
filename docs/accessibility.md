# Accessibility

Our own bar for what "usable for everyone" means, not an external
certification — the goal is a genuinely good, readable, operable product,
judged on that basis rather than compliance with a named standard.

## Rules

- **Contrast**: text and interactive elements are actually easy to read
  against their background — a minimum 4.5:1 contrast ratio for normal
  text, 3:1 for large text/UI components — including a business's chosen
  widget colors, not just the console's fixed token set. The core
  color-token pairs (accent/foreground/muted-foreground against
  background, both light and dark mode) are verified — see ADR 0007 for
  the actual computed ratios and one real bug it caught (dark-mode
  button text was too low-contrast, fixed). Component-level contrast is
  still unaudited.
- **Keyboard navigation**: every interactive element (buttons, form
  fields, links) reachable and operable via keyboard alone, in a
  sensible tab order. No custom interaction that only works with a
  mouse.
- **Focus states**: every focusable element has a visible focus
  indicator — `components/ui/button.tsx` and `input.tsx` use `focus-
  visible:ring-2 ring-accent`, a token, not a one-off style. Any new
  interactive component follows the same pattern.
- **Screen readers**: semantic HTML first (real `<button>`, `<label>`,
  heading levels in order) before reaching for ARIA attributes. Form
  fields have an associated `<label>`, not just a placeholder.
- **Color is never the only signal** — status (published/draft, error/
  success) pairs a color with text or an icon, not color alone.

## Known component gaps

An independent audit found 5 of shadcn/ui's 48 components have real
usability gaps for keyboard/screen-reader users: **Combobox, Data Table,
Context Menu, Chart (Recharts-based), Input OTP**. Two are directly
relevant to this product's planned surfaces — analytics (Chart) and
knowledge-base management (Data Table) — and need explicit review when
built, not an assumption that "shadcn is generally solid" covers them.
See `docs/research/design-system-standards.md` for the source audit.

## Where this applies

- **Admin console**: one fixed token set, so a contrast fix or focus-
  state fix made once (in `components/ui/`) fixes every screen — no
  per-page accessibility debt to track separately.
- **Embeddable widget**: a business can pick their own colors
  (guardrail-free branding), so contrast must be validated against
  *their* chosen colors, not assumed fine because our default palette
  passes. Not yet built — flag when the appearance editor (`docs/
  roadmap.md`) is implemented.

## Review checklist addition

Add to `docs/conventions.md`'s review checklist when reviewing a new
page: keyboard-only pass (can you reach and operate everything without
a mouse?), and a contrast check on any new color usage — including
widget-appearance defaults, not just console UI.
