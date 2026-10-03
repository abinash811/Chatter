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

## Update 2026-09-27: component-completeness standards from Apple HIG,
Material Design 3, Ant Design, and Radix/shadcn

Follow-up: everything above is about *aesthetic register* (which of
Linear/Notion/Stripe to feel like). It never answered a narrower,
more mechanical question the user raised — has anyone checked what
established, written design systems consider a *structurally complete*
component (every required state/variant/motion/copy rule), independent
of visual style? No prior session had. This is that check, not a
style study — we're not adopting Apple's or Google's look, just the
shape of their completeness bar.

**States (Material Design 3)**: a component's full state set is
default, hover, focus, pressed/active, dragged, disabled, and loading —
hover/focus/pressed can combine (e.g. hovered *and* focused), and
disabled means genuinely inert (no focus, no drag, no press response),
not just dimmed. M3 implements these via a "state layer" — a
consistent opacity overlay applied uniformly across components, not a
bespoke color per component per state.

**Elevation (Ant Design)**: three layers only — Layer 0 (flush with
the page, no shadow — inputs), Layer 1 (a low hover-triggered float —
cards), Layer 2 (a stronger layer that expands and tracks its
reference element — menus/popovers). The lesson isn't the exact
numbers, it's that elevation is **finite and tied to interaction
state**, not an ad hoc `shadow-xs`/`shadow-sm` pick per component (our
own `docs/design/audit.md` "System coverage" table already flags this
exact gap: "`shadow-xs` etc. applied ad hoc, not from a documented
scale").

**Motion (Ant Design)**: animation exists only to reinforce hierarchy,
give feedback, or direct attention — never decoration. Concretely: low
transition times, must not cost perceived performance, and "avoid
animations that don't add value" is stated as a rule, not a suggestion.
We have zero documented motion policy today — transitions exist
per-component (`transition-shadow`, `transition-opacity`) with no
stated duration/easing standard or "when not to animate" rule.

**Color-independent state (Apple HIG)**: never communicate state
through color alone — an error or a status difference needs an icon or
text label too, not just a color swap. Directly relevant to the
Published/Draft badge bug this session: even after fixing contrast, a
colorblind user should ideally get more than color distinguishing the
two states (we currently rely on the word itself — "Published" vs.
"Draft only" — which already satisfies this, but it's copy doing the
work, not spelled out as a rule anywhere).

**Copy (Material/UX-writing consensus, not one single named spec)**:
an error message has three required parts — what happened, why, and
what to do next — in plain words, with nobody blamed. An empty state is
framed as an opportunity, not a dead end: always give a way forward
(a CTA), never just an explanation of absence. `docs/design/
principles.md` #6 ("plain language, always") already states the tone
rule; it doesn't yet state the *structural* rule (three parts, always a
next step) — that's the gap.

**Radix/shadcn (what we're actually built on)**: state is expressed
through `data-state`/`data-disabled` attributes plus real ARIA, and
visual styling hooks off those same attributes (`data-[state=open]:...`)
— state and accessibility are one mechanism, not two systems kept in
sync by hand. This is already how our components work (see e.g.
`dropdown-menu.tsx`'s `data-[state=open]:bg-accent`); the gap isn't the
mechanism, it's that we don't yet audit whether every component
*uses* the full state set Radix exposes (e.g. do we ever style
`data-disabled`? — not checked before this research).

## Implication for Chatter

None of this is a style change. It's a completeness checklist a
component or screen should be checked against, independent of which
register (Linear/Notion/Stripe) it uses. Proposed as
`docs/design/component-checklist.md` — see that file for the concrete
per-component checklist derived from the above, and
`docs/design/principles.md` for the pointer into it. `docs/design/
audit.md`'s per-screen rows should reference the same checklist,
not a separate ad hoc list of "did it have hover/focus/depth."

## TODO — still open

- Confirm the Next.js/Tailwind/shadcn stack decision (blocks locking this
  in formally) — tracked in `docs/open-questions.md` #1.
- Decide how strictly to enforce contrast on business-chosen widget
  colors (hard validation vs. auto-adjustment vs. a warning) — not yet
  designed.
- Direct fetches of m3.material.io and ant.design were blocked by this
  environment's egress proxy — the M3/Ant Design findings above come
  from search-result summaries, not the primary spec pages read
  directly. Worth a direct re-read once network access allows it,
  especially M3's exact state-layer opacity values if we ever adopt
  that mechanism literally.
- No single check was done for a *B2B admin console specifically*
  (Linear/Stripe/Notion cover this, Apple/Material/Ant Design skew
  consumer/mobile) — flagged, not filled, since the aesthetic-register
  research above already fills this role for Chatter's console.

Sources:
- https://m3.material.io/foundations/interaction/states/applying-states
- https://ant.design/docs/spec/motion
- https://ant.design/docs/spec/shadow/
- https://ant.design/docs/spec/values/
- https://usersnap.com/blog/error-messages-best-practices/
- https://cxl.com/blog/error-messages/
- https://vercel.com/academy/shadcn-ui/what-are-radix-primitives
- https://www.duskolicanin.com/blog/shadcn-ui-saas-admin-dashboards-2026
- https://thefrontkit.com/apps/saas-starter-kit
- https://uxdesign.cc/mastering-typography-in-design-systems-with-semantic-tokens-and-responsive-scaling-6ccd598d9f21
- https://timgraf.com/ui/design-token-architecture-2026-the-strategic-blueprint-for-scalable-design-systems/
- https://www.contentful.com/blog/design-token-system/
- https://uxpilot.ai/blogs/enterprise-design-system
