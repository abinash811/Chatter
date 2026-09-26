# Roadmap

Now / Next / Later, not dated quarters — priorities shift faster than
dates hold at this stage. When something here ships, move it to
`docs/features.md`'s "Built" list and delete it from here. Update this
file whenever priorities genuinely change, not on a schedule.

Each entry says what it is and, where relevant, what research grounds
it — see `docs/research/competitive-landscape.md` for the full findings.

## Now (v1 / MVP)

The generic core plus one concrete vertical template — see
`docs/product-spec.md` for the full MVP scope and phasing rationale.

- Embeddable chat widget (shadow-DOM isolated, per-business theming)
- Admin console: bot list, bot editor (persona/guardrails/tools/
  appearance, draft/publish), Shopify connect flow
- Knowledge ingestion: manual Q&A, file upload (PDF/DOCX/txt/md), and
  single-URL ingestion all done (`docs/features.md`, ADR 0013) — MVP
  scope complete. Site crawling is separate, still open
  (`docs/open-questions.md` #4).
- RAG retrieval as a tool call, not a hardcoded prompt prepend
- Two action tools: `search_knowledge_base`, `check_order_status`
  (both read-only — see Next)
- Email + password auth (ADR 0006), tenant isolation via RLS (ADR 0003)
- Conversation history + human handoff (dashboard inbox only for v1,
  per `docs/open-questions.md` #2)

## Next

Validated by competitor research, not yet built:

- **Write-capable action tools** — issue a refund, update a shipping
  address, edit/cancel a booking — not just lookups. Gorgias treats
  these as core, not advanced; our tool registry (ADR 0002) already
  supports adding them without engine changes.
- **Resolution-rate analytics** — % of conversations resolved without
  human handoff. Intercom Fin's headline metric; we track nothing like
  it yet. Needs a definition of "resolved" first (closed by visitor
  leaving satisfied? no handoff triggered? — an open question to
  resolve before building, not a UI task).
- **Image input** — a visitor sends a photo (damaged item, wrong item).
  Validated by both Gorgias and Intercom Fin shipping it.
- **Design pass on `/bots/[botId]/integrations`** — bot list and bot
  editor got theirs (`docs/design/preview/bots-list.html`,
  `bot-editor.html`); integrations is the one console page left.
- **Site crawling for ingestion** — `docs/open-questions.md` #4.
  Tidio's positioning (the closest match to our own SMB/self-serve
  target, per the research) treats this as table stakes for a fast
  setup, which is a real point in favor of prioritizing it, not proof
  it must ship in v1 — still the user's call.

## Later

Explicitly deferred — see `docs/product-spec.md`'s "Explicitly out of
scope for v1" for the full list. Notable additions from research:

- Voice input (Intercom Fin ships it; not validated as needed for our
  target yet)
- Multi-channel beyond the website widget (WhatsApp, etc.)
- Outcome-based pricing (Intercom Fin's $0.99/resolution model) — a
  real, proven pattern in this category, worth revisiting whenever the
  currently-deferred billing/pricing decision gets made
- Multi-agent architecture (Zipchat's sales/support/marketing
  sub-agents) — our own research already concluded a single agent +
  tool registry should be tried first (see competitive-landscape.md's
  Claude Agent SDK section)
- Proactive triggers (exit intent, time-on-page)
- Visual flow builder (Voiceflow/Botpress-style) — not yet researched,
  see competitive-landscape.md's TODO
