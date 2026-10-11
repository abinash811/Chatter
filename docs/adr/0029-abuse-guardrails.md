# ADR 0029: Guardrails Phase 1 — rate limiting + spam detection (abuse protection)

Status: accepted

Date: 2026-09-30

## Context

Researching Chatbase's real, publicly documented features
(`docs/research/competitive-landscape.md`'s 2026-09-28 update) surfaced a
genuine, previously-unconsidered gap: Chatbase ships a "Guardrails"
feature with three mechanisms — **rate limiting** (a message cap per
visitor over a time window, customizable "limit reached" response),
**spam detection** (an automatic scan at set message-count checkpoints
that pauses a conversation it flags), and **country/IP blocking**. We
have none of this today: nothing stops a visitor (or a script) from
hammering a bot's chat endpoint and running up Claude API costs, and
nothing detects abusive/spam content mid-conversation.

This needed a recorded decision, not a silent build, for three reasons:

1. **Naming collision.** `BotConfigVersion.guardrails` (a `String`
   column) already exists — it's the persona-level content-guardrail
   prompt text described in this project's own CLAUDE.md guardrail #3
   ("refuse diagnosis/legal/financial advice"). Chatbase's "Guardrails"
   is a completely different concern (abuse protection, not content
   policy) that happens to share the name. A new column/field needs a
   distinct name to avoid confusing the two.
2. **No persistent visitor identity exists.** Chatbase's rate limiting
   is "per device." `public/widget.js` holds `conversationId` only in a
   JS closure variable (explicitly flagged in its own header comment as
   a known limitation — a page reload starts a fresh conversation), and
   no cookie/localStorage/fingerprint of any kind exists anywhere in
   this codebase. A literal "per device" implementation isn't buildable
   without first solving that separately-flagged persistence gap.
3. **Country/IP blocking needs a new external dependency** — a
   geolocation vendor or database (MaxMind, ipapi.co, a Cloudflare
   header, etc.) — a genuine build-vs-buy choice with real tradeoffs
   (cost, accuracy, another API to keep working), not something to pick
   silently per CLAUDE.md's process rule on new technical patterns.

## Decision

Build the two mechanisms that don't require a new external dependency
or a new visitor-identity system, and explicitly defer the one that does:

- **Rate limiting — per-conversation, not per-device.** Since no
  persistent visitor identity exists yet, this scopes to the unit we can
  actually and honestly enforce today: the number of visitor messages
  within a configurable time window, counted against the real
  `Message` table for that `conversationId` (no new in-memory or
  cross-request state — consistent with `lib/ai/chat.ts`'s existing
  "stateless by design" note). When the cap is hit, the configured
  custom message is returned as the reply (persisted like any other
  assistant message) instead of calling the model at all — the
  conversation itself isn't paused, so it self-resets once the window
  rolls forward. This is honestly narrower than Chatbase's per-device
  scope (a new conversation resets the counter) — extending it to true
  cross-conversation, per-visitor limiting is real follow-up work,
  blocked on `public/widget.js` actually persisting a visitor
  identifier (its own already-documented gap), not something to
  fabricate a fake "device id" to paper over now.
- **Spam detection — a real classification call, not a keyword list.**
  Matches `.claude/rules/bot-engine.md` rule #1 (implement the existing
  `ModelGateway` interface, don't bypass it): at the same message-count
  checkpoints Chatbase itself documents (the 2nd/4th/8th/16th visitor
  message — bounds the added cost to a handful of extra calls per
  conversation, not one per turn), a single cheap classification call
  (Haiku, no tools, a strict two-word response) checks the visitor's
  recent messages against the bot's configured guidance text. A
  flagged conversation is paused via the exact same
  `setConversationStatus` (`lib/conversations.ts`, ADR 0027) a human
  clicking "Pause" already calls — this is the first non-human caller
  of that function, a genuinely new code path worth naming explicitly,
  not an existing pattern being reused unchanged.
- **Config storage**: a new `BotConfigVersion.abuseProtection Json
  @default("{}")` column, following the exact same pattern as
  `appearance` (a JSON blob of a handful of related settings, parsed
  with defaults via a `parseAbuseProtection` function mirroring
  `parseAppearance`) — deliberately *not* reusing or renaming the
  existing `guardrails` column, to keep persona-level content rules and
  abuse protection as clearly separate concepts at the data layer, even
  though the console UI surfaces both under the same "Guardrails" tab
  (a business owner's mental model of "guardrails" reasonably spans
  both; the tab gets a second Card, "Abuse protection," rather than a
  second top-level tab with a colliding name).
- **Country/IP blocking — explicitly deferred, not built this pass.**
  Needs a real geolocation-vendor decision first; recorded as an open
  question (`docs/open-questions.md`) rather than picked silently.

## Alternatives considered

- **Per-device rate limiting via a new cookie/localStorage visitor ID**
  — closer to Chatbase's literal behavior, but bundles a second,
  unrelated new mechanism (visitor identity/persistence) into this
  decision. `public/widget.js` already flags this exact gap as its own
  follow-up; solving it as a side effect of Guardrails would hide that
  decision inside an unrelated feature instead of making it on its own
  terms.
- **A hardcoded keyword/regex spam filter** instead of a model call —
  cheaper and simpler, but far weaker (Chatbase's own real spam
  guidance covers "unsolicited commercial promotions, scams, repetitive
  gibberish," not just profanity) and contradicts this project's own
  guardrail #4 spirit of not faking a capability with a shortcut that
  looks like the real thing but isn't.
- **Renaming the existing `guardrails` column** to make room for the
  "Guardrails" name at the data layer too — rejected: a bigger, riskier
  migration (every reader of that column, plus its console field name)
  for a cosmetic naming match with no functional benefit; the UI-level
  grouping (same tab, a second Card) gets the discoverability without
  the data-model churn.
- **Picking a geolocation vendor now** (MaxMind, ipapi.co, a Cloudflare
  header) to ship country blocking in the same pass — rejected per
  CLAUDE.md's process rule: a new external dependency with real
  cost/accuracy tradeoffs needs to be explained and chosen deliberately,
  not bundled into an unrelated feature's scope.

## Consequences

Rate limiting and spam detection are both off by default (an empty
`abuseProtection` JSON parses to fully-disabled) — no behavior change
for an existing bot until a business owner opts in. Spam detection adds
a small, bounded Claude cost (Haiku, a handful of calls per
conversation) only when enabled. The per-conversation (not per-device)
scope of rate limiting is a real, documented limitation, not a silent
gap — revisiting it later means first solving `public/widget.js`'s own
flagged visitor-persistence gap, a separate, larger piece of work.
Country/IP blocking staying unbuilt means this project still has zero
geo-based abuse defense; `docs/open-questions.md` tracks the vendor
decision blocking it. The `abuseProtection` JSON shape is new stored
data — extending it later (e.g. adding country blocking once a vendor
is chosen) is additive and low-risk, but a business already relying on
the current shape's exact keys would need a compatible migration, same
as any other JSON-config column (`appearance`, `tools`).
