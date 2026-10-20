# ADR 0026: Model tier + temperature picker — Claude-only, temperature locked per tier

Status: accepted

Date: 2026-09-28

## Context

Chatbase's "Build" section (`docs/research/competitive-landscape.md`'s
2026-09-28 update) has five sub-areas: Instructions (persona + a model
picker + a temperature slider), Data sources, Actions, Procedures,
Guardrails. Two of those five (Data sources, Actions) already exist in
Chatter under different names (Knowledge, Tools/Actions); Procedures and
Guardrails are real gaps flagged separately. The user chose to build these
one at a time, starting with the smallest: model + temperature.

Chatbase's own picker offers Claude/GPT/Gemini. ADR 0002 already scoped
Claude as the only real `ModelGateway` implementation — a multi-vendor
picker would mean building OpenAI/Gemini gateways first, a much larger
scope than "add a form field," so the user confirmed a same-vendor,
Claude-tier-only picker instead (Sonnet/Haiku/Opus).

Mid-implementation, checking the Anthropic SDK's own type definitions
(`node_modules/@anthropic-ai/sdk/resources/messages/messages.d.ts`) — not
recalling from memory, per CLAUDE.md's "check real version numbers" rule —
surfaced a real constraint: `temperature` is marked deprecated for every
model released after Claude Opus 4.6, with the API accepting only `1.0`
and rejecting any other value with a 400. Cross-referencing the SDK's own
model-ID ordering and `CHANGELOG.md` (both newest-first) shows
`claude-sonnet-5` and `claude-opus-5-5` are both newer than that cutoff;
`claude-haiku-4-5` predates it. So a temperature control that looks the
same for all three tiers would silently misbehave (or 400) for two of
them — this needed a real decision, not a cosmetic slider.

## Decision

1. **Model tier**: `BotConfigVersion.model` (String, default
   `"claude-sonnet-5"`) — one of three Claude tiers
   (`lib/ai/modelOptions.ts`'s `MODEL_TIER_OPTIONS`: Haiku/Sonnet/Opus).
   `lib/ai/gateway.ts`'s `GenerateReplyParams` gains an optional `model`
   field; `ClaudeGateway.generateReply` uses it, falling back to the
   previous hardcoded value when omitted.
2. **Temperature**: `BotConfigVersion.temperature` (Float, default `1`) —
   only genuinely adjustable for the Haiku tier. The UI
   (`ModelTabContent.tsx`) disables the slider and visually snaps it to
   `1.0` when a temperature-locked tier is selected, with a plain-language
   note why, rather than leaving a movable control that would silently
   no-op or 400 in production (guardrail #4: never fail silently). The
   server (`actions.ts`'s `saveDraftAction`) independently re-derives
   whether the submitted model supports temperature and forces `1` when it
   doesn't — never trusting the disabled-control convention alone, since a
   disabled HTML control's value still submits and a form can be driven
   directly.
3. Defaults (`claude-sonnet-5` / `1`) exactly match what
   `lib/ai/gateway.ts` already hardcoded before this change, so every
   existing published bot keeps its exact current behavior with no
   backfill needed.

## Alternatives considered

- **Multi-vendor picker (Claude/GPT/Gemini), matching Chatbase's own UI
  exactly** — rejected: would require building real OpenAI/Gemini
  `ModelGateway` implementations first (ADR 0002 explicitly deferred
  this), a far larger scope than this pass: confirmed with the user
  before starting.
- **A temperature slider with the same range for every tier, validated
  only client-side** — rejected once the SDK's deprecation was found: a
  business could still submit a locked model with a moved slider (a
  disabled control isn't a security boundary) and get a real 400 in
  production, or worse, silently have the value ignored with no
  indication why.
- **Drop temperature entirely, ship the model picker alone** — considered
  when the deprecation was first found, before checking whether it still
  applied to any of our three tiers. Rejected once verified that Haiku
  genuinely supports it: dropping a real, working control for two locked
  tiers' sake would have thrown away a feature that works correctly for
  a third.

## Consequences

- Reversible: nothing here is hard to undo — the schema fields have safe
  defaults, and the gateway's new `model`/`temperature` params are
  optional and backward-compatible.
- A future Claude model tier needs its `supportsTemperature` value
  re-verified against the SDK the same way (not assumed to inherit the
  tier it replaces') — the cutoff is model-release-date-based, not
  tier-name-based.
- Found and fixed a real, unrelated accessibility bug while building this:
  shadcn's default `Slider` source forwards a plain `aria-label` onto
  `SliderPrimitive.Root`, but the actual `role="slider"` element a screen
  reader needs a name for is each `Thumb` — caught by a genuine
  axe-core `aria-input-field-name` failure, not assumed. Fixed in
  `components/ui/slider.tsx`, documented as a deliberate delta from
  shadcn's real source per ADR 0025's pattern (any future multi-thumb use
  would need one label per thumb, not implemented since nothing in this
  app has more than one yet).
- Verified: `tsc` clean, all 10 `check:all` guardrails, full unit suite,
  the full `bot-editor.spec.ts`/`accessibility.spec.ts`/`demo-data.spec.ts`
  suites (a new permanent e2e test covers the save/reload/lock-switching
  round trip), and all 19 visual baselines (4 regenerated for the new
  Model card's real layout change, confirmed stable across two runs).
