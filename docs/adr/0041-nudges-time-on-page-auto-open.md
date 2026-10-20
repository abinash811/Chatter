# ADR 0041: Nudges — time-on-page auto-open, matching Chatbase's real shipped scope

Status: accepted

Date: 2026-10-20

## Context

`docs/open-questions.md` #5 had sat open since 2026-09-26: what should
"Nudges" actually be? The question as written speculated a broad set of
candidate triggers (exit-intent, time-on-page, scroll-depth, cart-
abandonment), generic-vs-ecommerce scope, and where the config would
live — explicitly flagged as needing "real scoping (and likely a small
competitor check: how Intercom/Drift/Tidio actually expose this) before
an ADR," i.e. not something to guess at from the product's own marketing
copy.

Rather than speculating further or reading a third-party summary of
competitor behavior, this was resolved by inspecting Chatbase's real,
live embeddable widget script directly — `https://www.chatbase.co/
embed.min.js`, pulled from chatbase.co's own homepage (they embed their
own product) — using the REA reverse-engineering MCP tool
(`morluto/rea`) for the static-analysis pass, cross-checked by manual
tracing of the same (deliberately obfuscated but single-file, ~53KB)
source. Per CLAUDE.md's "read the primary source" process rule, this is
that primary source, not a blog post about Chatbase.

**What the real script actually does**, confirmed two independent ways
(manual trace + REA's AST-level `analyze_javascript_application`, which
landed on the identical `sessionStorage.getItem`/`setItem` call sites
down to the same source byte-offsets):

- A single mechanism: **time-on-page auto-open**. Config surface is
  `autoOpenChatWindowAfter`/`auto_open_chat_window_after` (a number of
  seconds) plus a `showAutoOpen` boolean kill-switch. The trigger fires
  via `setTimeout(..., 1000*delaySeconds)`.
- **Session-guarded** — `sessionStorage` prevents it firing again within
  the same browser session once it's fired once.
- **No exit-intent trigger.** A `mouseleave` listener exists in the
  bundle, but scoped to the notification bubble's own hover state, not
  a page-level "cursor left the viewport" signal.
- **No scroll-depth trigger.** `window.scrollY` is read, but for UI
  positioning math, not as a nudge condition.

So the real, shipped scope is materially narrower than the open
question's own speculative list — no exit-intent, no scroll-depth, no
cart-abandonment in the live production script. Confirmed with the user
before building: match Chatbase's real narrower scope, not the broader
speculative one (explicit choice over building exit-intent or
scroll-depth triggers that have no real-world precedent to check
against).

## Decision

**Nudges, v1, is exactly one trigger: an optional per-bot "auto-open
after N seconds" delay**, matching Chatbase's real scope:

- `BotAppearance` (`lib/ai/botConfig.ts`) gains `autoOpenAfterSeconds:
  number | null` — `null` means disabled, reusing the same
  `appearance` JSON blob every other widget-theming field
  (greeting/accentColor/avatarEmoji/position/suggestedReplies) already
  lives in, not a new table or model. No separate boolean kill-switch
  like Chatbase's `showAutoOpen` — a blank field in the console *is*
  "disabled," one field instead of two, matching this app's existing
  "blank optional field" convention (Custom Actions' headers, widget
  fields) over introducing a second redundant toggle.
- Configured in the bot editor's **Appearance tab** (`AppearanceTabContent.tsx`),
  the existing Appearance Card — not a new page or a new "Nudges"
  section — since it's one number field, the same place
  greeting/accent-color/position already live, and per CLAUDE.md's
  self-serve-configurability bar ("a dumb person should be able to
  land on this, configure, and use it").
- `/api/widget/config` needs **no change** — it already returns the
  entire parsed `BotAppearance` object, so the new field reaches the
  widget automatically once `parseAppearance` knows about it.
- `public/widget.js` schedules the open on load if
  `appearance.autoOpenAfterSeconds` is a positive number, guarded by
  `sessionStorage` keyed per-`botKey` (`chatter_nudge_<botKey>`) — same
  "once per session" semantics as the real Chatbase script — and
  cancels itself if the visitor has already manually toggled the
  bubble before the timer fires (not present in Chatbase's script as
  observed, but a straightforward, low-risk improvement: never force
  the window back open on a visitor who already closed it themselves).

## Alternatives considered

- **Build the broader speculative scope** (exit-intent + scroll-depth +
  time-on-page) — rejected per the user's explicit choice: no real
  product precedent ships that combination in Chatbase's actual code,
  more surface to build/test/maintain for triggers that may not even
  be wanted, and nothing in this product's own usage data justifies it
  yet. Can be added later as a real, separately-scoped decision if a
  genuine need shows up — the `appearance` JSON shape isn't closed off
  from growing.
- **A new `Nudge` model / new console page** — rejected: one optional
  number field doesn't justify new infrastructure; it's exactly the
  shape `BotAppearance`'s existing fields already have, and
  `/api/widget/config` already ships the whole object.
- **Keep guessing from Chatbase's marketing copy / docs instead of their
  real code** — rejected per CLAUDE.md's "read the primary source"
  rule; their own docs describe the *concept* ("nudges") but not the
  exact trigger set actually shipped, which only the real script
  reveals.

## Consequences

Resolves `docs/open-questions.md` #5 — removed from that file. Easy to
extend later (a second trigger type is an additive field on the same
`appearance` object, not a schema rework) but intentionally not built
now. Matches a real, verifiable competitor precedent rather than an
invented one, which is the whole point of using REA for this instead of
assuming.
