# Research note: Design system standards for consistency across the tool

Date: 2026-09-23
Researcher: Claude (web search)
Status: grounds `docs/architecture.md` §7 (Design system)

## Why this research

User asked whether the tool's visual/UX design should be based on
international standards, and wanted simple, intuitive, text-consistent
design across the whole product — not per-screen improvisation.

## The actual international standard: WCAG 2.2 Level AA

W3C's Web Content Accessibility Guidelines, Level AA, is the globally
recognized bar for accessible, usable interfaces — minimum contrast
ratios, keyboard navigation, visible focus states, screen-reader support.
It's also the standard enterprise buyers audit against during procurement,
which matters directly for the healthcare vertical's buyer profile.

## Consistency mechanism: design tokens

Enterprise design systems achieve "consistent everywhere" via **design
tokens** — colors, typography, spacing, and radius defined once and
referenced throughout, rather than restyled per screen. Mature systems
split this into a fixed **structural layer** (component behavior/layout)
and a thin **theme layer** (the only thing that varies for branding) —
theming at the product or brand level then only requires changes at the
token layer, not the components themselves. Typography specifically is
increasingly tokenized as a ratio/scale (e.g. a "type curve" following a
mathematical progression) rather than a fixed list of sizes, so the scale
stays harmonious as it's extended.

This is the same generic-core-plus-thin-configurable-layer pattern already
used elsewhere in this project's architecture (vertical templates, the
tool interface/connector split in
`docs/research/tool-calling-architecture.md`) — applied to design instead
of code/product config.

## Foundation: shadcn/ui as the current default for a Next.js + Tailwind
stack

Given the stack direction from `docs/research/tech-stack-trends-2026.md`
(Next.js + Tailwind), **shadcn/ui** (built on Radix UI primitives) is the
current (2026) default pairing for SaaS admin dashboards on that stack —
accessible by default, ships with a design-token system, avoids building a
component library from scratch. Not yet a locked decision — tech stack is
still open per `docs/open-questions.md` — but the natural fit if that
direction is confirmed.

**Known accessibility gap to plan for**: an independent April 2026 audit
tested all 48 shadcn/ui components against WCAG 2.2 AA (axe-core,
Lighthouse, WAVE, and screen readers on VoiceOver and NVDA). Result: 34
passed out of the box, 9 needed minor fixes, and 5 had real gaps —
**Combobox, Data Table, Context Menu, the Recharts-based Chart, and Input
OTP**. Directly relevant to this product: the analytics dashboard uses
Chart, and knowledge-base management uses Data Table — both should get
explicit accessibility review rather than being assumed fine because the
library is generally solid.

## Implication for Chatter

Two design surfaces, two rules, both grounded above:

- **Admin console**: one fixed token set/brand throughout — no per-screen
  exceptions, enforced by building every screen from the same token
  system rather than ad hoc styles.
- **Embeddable widget**: businesses customize color/logo/greeting per
  business, so it can't have one fixed brand — but the underlying system
  (spacing, interaction patterns) stays consistent, and accessible
  contrast should be validated/enforced even against a business's chosen
  colors rather than left unchecked.

## TODO — still open

- Confirm the Next.js/Tailwind/shadcn stack decision (blocks locking this
  in formally) — tracked in `docs/open-questions.md` #1.
- Decide how strictly to enforce contrast on business-chosen widget
  colors (hard validation vs. auto-adjustment vs. a warning) — not yet
  designed.

Sources:
- https://www.duskolicanin.com/blog/shadcn-ui-saas-admin-dashboards-2026
- https://thefrontkit.com/apps/saas-starter-kit
- https://uxdesign.cc/mastering-typography-in-design-systems-with-semantic-tokens-and-responsive-scaling-6ccd598d9f21
- https://timgraf.com/ui/design-token-architecture-2026-the-strategic-blueprint-for-scalable-design-systems/
- https://www.contentful.com/blog/design-token-system/
- https://uxpilot.ai/blogs/enterprise-design-system
