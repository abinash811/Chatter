# ADR 0028: In-chat interactive widgets (forms, cards, functions, states)

Status: accepted (Phase 1 — Schema-driven forms — built 2026-09-29;
Functions/States/rich Components are explicitly deferred, see
Consequences)

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

**Transport, resolved by the Phase 1 implementation** (2026-09-29): a
widget tool's `handle()` returns a tagged JSON string —
`{"type":"render_widget", widgetId, name, submitLabel, schema}` — the
exact same pattern every other tool already uses for structured
signaling (`handoff_required`, `ok`/`result`). `lib/ai/chat.ts`'s tool
loop needed **no early-exit branching**: after a widget tool call, the
model's own next turn naturally produces the accompanying text ("Sure,
please fill this out:") since from its perspective the tool call
"succeeded" like any other. The loop just scans each turn's tool
results for the tag and attaches the last one found to
`SendMessageResult.widget`, alongside `reply`. The `Tool` interface
itself (`handle(): Promise<string>`) is completely unchanged — per
`.claude/rules/bot-engine.md` rule #1 ("implement the existing
interface, don't add a new way of calling the model"), this was
deliberately checked before writing code, since a widget's UI-rendering
result could easily have tempted a new return shape on the interface
itself. The visitor's filled-in answers come back as their own next
chat message (client-side formatted as plain text), reusing the exact
same `/api/chat` endpoint — no new endpoint, no new transport.

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

**Built (Phase 1, 2026-09-29)** — the "smallest useful slice" this ADR
originally scoped: a `Widget` model (per-bot, not draft/publish-gated,
same precedent as `CustomAction`), a console CRUD page
(`/bots/[botId]/widgets` — up to 4 typed fields per widget: text/
number/boolean/select, matching the fixed-rows precedent from
`AddActionDialog.tsx`), a dynamic tool factory
(`lib/ai/tools/widget.ts`) merged into every chat turn the same way
custom actions are, and real inline rendering in both
`public/widget.js` (vanilla JS, matching the widget's shadow-DOM
styling) and `PreviewSheet.tsx` (React + `components/ui/` primitives).

**Deliberately deferred, not built** — real scope, not oversights:
- **Functions that call a live API** — today a widget is "widget-only"
  in Chatbase's own terms (pure data collection, no API call); wiring a
  submit to `performActionRequest` is the natural next step but wasn't
  built this pass.
- **States (multi-view widgets)** and the **Code/Components** layer
  (a real component library beyond text/number/boolean/select fields)
  — no state-condition syntax was designed or built.
- **Runtime rendering has no automated e2e coverage** — same class of
  gap as `conversations.spec.ts`/`knowledge.spec.ts`: triggering a
  widget needs a real model tool call, which needs a real
  `ANTHROPIC_API_KEY` (a placeholder in this environment).
  `tests/e2e/widgets.spec.ts` covers the console CRUD surface;
  `tests/unit/lib/ai/chat.test.ts` covers the chat-loop wiring with a
  mocked tool call.

Reusing the custom-action pipeline and shadcn/ui primitives keeps the
security and design surface bounded, but this is still hard to reverse
once bots start depending on it in production (a widget schema change
later could break a business's already-configured widget).
