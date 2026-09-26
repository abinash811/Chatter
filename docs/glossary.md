# Glossary

Terms used throughout this codebase and its docs, in plain language.
Add a term here in the same PR that introduces it, rather than letting
it stay implicit in code comments only.

**Org / tenant** — one business using Chatter. Every business's data
(bots, conversations, knowledge) is walled off from every other's — see
`docs/security.md`'s tenant isolation section. "Org" is the technical
name (`orgId` in the database); "tenant" and "business" mean the same
thing in conversation.

**Bot** — one configured AI assistant belonging to an org. A business
can have more than one (e.g. a support bot and a sales bot).

**Vertical / vertical template** — an industry (ecommerce, healthcare,
automotive). A template is a starting-point config for that industry
(default persona, guardrails, suggested tools) — see ADR 0001. The core
engine never has industry-specific code; only templates do.

**Draft / publish** — a bot has one draft version being edited and, once
published, an immutable published version that's actually live. Editing
never affects a visitor mid-conversation — see `docs/business-logic.md`.

**Guardrails** — the "never do this" rules a business writes for their
bot (e.g. "never quote a final price"). Becomes part of what the model
is told on every turn — see `docs/business-logic.md`.

**Tool / tool call** — an action the bot can take beyond just replying
with text — look something up (`search_knowledge_base`), check an order
(`check_order_status`). The model decides when to call one; see
`docs/business-logic.md`'s chat loop section.

**Tool registry** — the list of all tools that exist in the codebase.
A bot is only allowed to use the subset enabled in its published config.

**RAG (retrieval-augmented generation)** — looking up relevant
information before answering, instead of the model guessing from what
it was trained on. `search_knowledge_base` is Chatter's RAG tool.

**Knowledge base / knowledge chunk** — what a business feeds a bot to
answer from: manually-entered question-and-answer pairs (each one its
own chunk), an uploaded file (PDF/DOCX/`.txt`/`.md`), or a single URL's
article text — split into small pieces (chunks) so the RAG tool can
search and retrieve just the relevant parts. See ADR 0013.

**Handoff** — when the bot can't help, it says so and captures the
conversation for a human — never a guess dressed up as an answer
(guardrail #4).

**botKey** — the public, embeddable identifier in a business's widget
script tag. Same trust model as a Stripe publishable key: safe to be
public, resolves server-side to `{orgId, botId}`, grants nothing beyond
talking to that one bot.

**Widget** — the embeddable chat box a business puts on their own site.
Talks to Chatter's backend only, never holds any secret.

**Model gateway** — the one place in the code that talks to Claude's
API. Everything else calls the gateway, never the API directly — keeps
provider-specific details in one place.

**System prompt** — the instructions given to Claude before a
conversation starts (persona + guardrails, assembled per bot). Stays
byte-identical per published version so it can be cached — see
`docs/business-logic.md`.

**RLS (Row-Level Security)** — a Postgres feature that enforces tenant
isolation at the database level, not just in application code. See
`docs/security.md`.

**ADR (Architecture Decision Record)** — a written record of a
hard-to-reverse decision and why it was made. `docs/adr/`.

**Register** (design context only — Linear/Notion/Stripe register) —
which of three visual "voices" a screen borrows: Linear's dense/fast
feel, Notion's calm/spacious feel, or Stripe's restrained/trustworthy
feel. See `docs/design/principles.md`. Unrelated to any database or
DNS meaning of "register."

**Integration / connector** — a business's connected external platform
(Shopify today). "Connector" specifically means the code adapter for
one platform; "integration" is the general concept or the saved
connection itself.

**Nudge** — a proactive, rule-triggered message the widget shows without
the visitor asking first (e.g. "still deciding? I can help" after 30s
on a product page, or a cart-abandonment prompt). Distinct from a normal
reply, which only ever responds to something the visitor typed. Not yet
built — see `docs/roadmap.md`'s "Self-serve configurability" #6 and
`docs/open-questions.md` #6 for the still-open scope questions.

**BYOA (bring your own API key/account)** — a business plugs in their
own Anthropic API key (`/settings`) instead of using our managed one,
so their bots run on their own Claude account and billing. Optional,
off by default, per org — see ADR 0012.

**Onboarding** — the single combined screen (`/onboarding`) a brand-new
signup completes before reaching the console: name the workspace, name
the first bot. See ADR 0012.
