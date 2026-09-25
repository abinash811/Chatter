# Research note: Design system standards for consistency across the tool

Date: 2026-09-23
Researcher: Claude (web search)
Status: grounds `docs/architecture.md` §7 (Design system)

## Why this research

User asked whether the tool's visual/UX design should be based on
international standards, and wanted simple, intuitive, text-consistent
design across the whole product — not per-screen improvisation.

## The practical bar: an interface that's actually usable for everyone

Good contrast, full keyboard navigation, visible focus states, and
screen-reader support — judged by whether the product is genuinely
usable, not by certification against a named standard. See
`docs/accessibility.md` for the concrete rules this becomes.

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
tested all 48 shadcn/ui components for real usability (axe-core,
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

## Update 2026-09-23: "international company standard" meant Linear/
Stripe/Notion-caliber UX, not formal compliance

Follow-up clarification: the user meant design *quality* on the bar set
by Linear, Stripe, and Notion — simple, intuitive, minimal — not formal
compliance certification. Researched what actually differentiates
each, since "clean and minimal" undersells how different their recipes
are.

**Linear** — precision/density for power users. Near-monochrome + one
purple accent; an unusually consistent spacing rhythm (list/table/form
rows share the same 32px-or-40px heights everywhere — fewer densities
than competitors, used more deliberately); keyboard-first, every action
has a shortcut, ⌘K command palette one keystroke away. Notable: the
command palette is a **performance** feature as much as a UX one — it
searches local data, not the server, which is why it feels instant. Speed
is treated as a first-class design principle, not just an engineering
concern, achieved through many small disciplined decisions rather than
one big architectural trick.

**Notion** — warmth/approachability. Generous whitespace, soft shadows, a
calm editing surface. Core stated principle: **"minimalism is not about
removing features, it's about removing distractions."** Doesn't force one
workflow — lets people build their own structure to match their needs.

**Stripe** — sophistication/trust. Cooler tones, layered depth, "calm
technology": powerful functionality that doesn't demand attention. Every
whitespace gap is described as a deliberate typographic choice, not
leftover space — relevant to anything handling money or sensitive data in
B2B contexts.

**Implication for Chatter — different surfaces borrow different
registers, not one aesthetic applied uniformly**:
- Console daily-driver screens (inbox, bot list, analytics) → Linear
  register: dense, fast, ⌘K command palette backed by local/cached data,
  monochrome + one accent, optimistic UI updates instead of spinners.
- Console configuration/creative surfaces (knowledge base editing,
  persona/prompt writing) → Notion register: calm, generous whitespace,
  unintimidating for a non-technical business owner. Notion's "remove
  distractions, not features" principle directly resolves the tension
  between our real configuration depth (verticals, tools, guardrails) and
  wanting the UI to feel simple — the answer is progressive disclosure
  (vertical-template defaults visible up front, advanced settings one
  click away), not cutting capability.
- Trust-critical surfaces (connecting a business's data/Shopify, billing,
  the healthcare vertical specifically) → Stripe register: restrained,
  sophisticated, inspires confidence rather than looking flashy.
- Widget's default (pre-branding) look → closer to Notion's approachable
  warmth, since it talks to end customers/patients/visitors, not power
  users.

This sits on top of, not instead of, the usability + design-token
foundation above — these are the aesthetic/interaction-quality principles
layered on an already-accessible technical base.

Additional sources for this update:
- https://raw.studio/blog/how-notion-ux-converts-100-million-users
- https://medium.com/think-senpai/fundamental-design-principles-using-stripe-as-a-case-study-33a0a635e2ca
- https://uwux.medium.com/behind-the-gradient-design-at-stripe-476dcf61a51a
- https://dev.to/0xgosu/why-linear-feels-fast-local-data-small-updates-and-product-discipline-1m53
- https://gunpowderlabs.com/2024/12/22/linear-delightful-patterns
- https://getdesign.md/linear.app/design-md

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
