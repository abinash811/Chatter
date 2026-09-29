# ADR 0028: In-chat interactive widgets (forms, cards, functions, states)

Status: proposed

Date: 2026-09-29

## Context

The user asked to research Chatbase's "Widgets" feature and understand
its use case. Read directly from Chatbase's own docs (not a search
summary): `docs/developer-guides/widgets/overview`,
`docs/developer-guides/javascript-embed`, and
`docs/user-guides/chatbot/channels`.

Chatbase actually ships two distinct things both loosely called
"widget," and conflating them was a real mistake caught mid-research:

1. **The chat bubble widget** — the floating embed on a business's
   website (`public/widget.js`'s direct equivalent). Already built.
2. **"Widgets"** — a separate, more advanced feature: interactive UI
   components the AI agent can render **inline inside a conversation**
   (forms, cards, tables, charts, buttons), not just plain text. This
   ADR is about #2 only.

Their real docs define a small declarative widget-builder with six
concrete building blocks, quoted verbatim:

- **Code** — "The visual layout of the widget, written using a
  built-in component library" (declarative, not raw/imperative JS).
- **Schema** — "Defines the data fields the widget expects from the AI
  agent and their types."
- **Default Example** / **Named Examples** — preview data for the
  builder (initial render values, saved scenario presets).
- **Functions** — "Actions attached to interactive elements that
  define what happens on interaction" (e.g. a button click calling an
  API, sending a chat message, or updating data).
- **States** — "Named wrappers whose visibility is controlled by
  conditions based on current values" — i.e. a widget can have
  multiple views that switch based on data (a "pending" vs. "confirmed"
  state, for example).
- **Components** — the actual building blocks (`Dropzone`, `FileInput`,
  buttons, dropdowns, etc.).

Widgets attach to either widget-only actions (no API call — pure data
collection, e.g. a booking form) or server actions with a real API call
(e.g. a live order-status card). Data flows in with a defined priority:
default values (lowest) → action inputs → live API responses (highest).

This needs a recorded decision because it's materially bigger than the
"add a form-rendering tool" framing it started from in chat: it's a
small state machine plus a function-dispatch layer plus a new
data-schema concept, with real security surface (functions triggering
live API calls from inside a chat turn) — not a UI tweak to scaffold
silently per CLAUDE.md's `docs/open-questions.md` rule.

## Decision

Build this as an extension of Chatter's **existing** tool-calling
infrastructure, not a parallel system:

- A tool's `handle()` gains an additional possible return shape —
  `renderWidget` — alongside its existing text/JSON result. The model
  decides when to trigger a widget exactly the way it decides to call
  any other tool today.
- The widget itself is described by a **schema** (the data fields +
  types the AI must supply) and rendered using **our own shadcn/ui
  primitives** (`components/ui/`) rather than a new component library —
  so a widget's buttons/inputs/cards automatically match a bot's
  existing design-token configuration (ADR 0025's shadcn-only rule
  extends naturally here) instead of needing a second styling system.
- **Functions** (interaction → behavior) reuse the existing custom-
  action request pipeline (`performActionRequest`,
  `lib/ai/tools/customAction.ts`) — including its SSRF guard and
  encrypted-header handling — rather than a new action-calling path.
  A function that performs a real external write reuses the existing
  `PendingAction` human-approval queue (ADR 0023) when the tool is
  marked write-capable, rather than executing immediately.
- **States** (conditional multi-view widgets) are the smallest useful
  slice for v1: a widget can declare named states and switch between
  them based on its current data, without a general-purpose scripting
  or expression-evaluation engine — conditions are limited to simple
  field comparisons, not arbitrary code, to keep the security surface
  bounded.
- Per-vertical starter widgets (a booking form, an order-status card)
  ship as templates through the existing template/config layer (ADR
  0001), not hardcoded into the core engine.

The widget schema format is **JSON Schema** — the user confirmed this
explicitly (2026-09-29), after weighing it against a custom shape
matching Chatbase's own internal structure more literally. Reasoning
discussed and agreed: JSON Schema is an actual international standard
(IETF standards track), already the format our tool-input schemas use
(`lib/ai/tools/registry.ts`) and what Claude's own tool-calling API is
built on, versus a custom shape that would be a private convention we'd
have to design, document, and maintain forever for no functional gain —
only cosmetic parity with Chatbase's internal builder. A custom shape
was explicitly *not* chosen to unlock "more options" for users (Code/
Functions/States/Components are separate layers from Schema and don't
depend on its format) — JSON Schema only ever owned the data-fields
job, and does that job fully (objects, arrays, enums, nested types,
validation constraints).

This ADR records the *shape* of the decision, the *reuse* strategy, and
the schema format. It does not yet resolve: how `renderWidget` results
are transported over the existing chat-turn response, or the state-
condition expression syntax — those are implementation-level
follow-ups, tracked in `docs/open-questions.md`, before any code is
scaffolded.

## Alternatives considered

- **A general-purpose scripting/expression engine for States and
  Functions** (matching more closely what "Code" might imply) — gives
  more power, but a sandboxed-code-execution surface inside a chat
  turn is a real security liability (arbitrary logic running per
  message) with no primary-source evidence Chatbase actually allows
  raw JS either ("declarative component usage rather than imperative
  code execution," confirmed from their own docs) — rejected.
- **A brand-new widget component library**, separate from
  `components/ui/`, to match Chatbase's "built-in component library"
  more literally — rejected: it would violate ADR 0025's shadcn-only
  rule and create a second design system to keep in sync with the
  console's.
- **A brand-new action-calling path for Functions**, separate from
  custom actions — rejected: duplicates the SSRF guard, encrypted-
  header handling, and approval-gating already built and verified for
  custom actions (ADR 0022/0023), for no real gain.
- **A custom schema shape mirroring Chatbase's own internal structure**
  — rejected: no functional benefit over JSON Schema (both can express
  the same field types/validation), only cosmetic parity with a
  competitor's internal implementation, at the cost of designing,
  documenting, and maintaining a private format forever. Reversing
  this later is possible but not free: every stored widget definition
  and every reader of the schema (builder UI, runtime renderer, tool-
  call handling) would need migrating — a deliberate, not casual, cost
  if it's ever revisited.
- **Ship nothing, keep text-only tool responses** — simplest, but
  concedes a real, documented Chatbase capability with a clear use
  case (structured data collection, live data display) that several of
  our own existing tools (`collect_lead`, `request_order_cancellation`)
  would benefit from directly.

## Consequences

This is a genuinely new capability, not a small addition — expect a
new response type in the chat loop (`lib/ai/chat.ts`), a new client-
side renderer in `public/widget.js` and the console's preview
(`PreviewSheet.tsx`), and a new schema concept in the tool registry.
Reusing the custom-action pipeline and shadcn/ui primitives keeps the
security and design surface bounded, but this is still hard to reverse
once bots start depending on it in production (a widget schema change
later could break a business's already-configured widget). Nothing is
scaffolded yet — the next step is resolving the transport and state-
condition sub-decisions (`docs/open-questions.md` #9) before any code
is written, per this project's standing rule against silently picking
a technical pattern with real tradeoffs.
