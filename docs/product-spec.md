# Product Spec — v1 (MVP)

Status: draft, informed by decisions made so far. Update as things firm up.

## Vision

An embeddable AI chat agent that any business — not just ecommerce — can
train on its own knowledge and deploy on its site to answer visitors, act on
their behalf (look things up, book things, collect leads), and hand off to a
human when it can't. Inspired by Zipchat AI's ecommerce playbook, generalized
across industries via a template layer instead of hardcoded vertical logic.

## Core loop

1. **Ingest** — business feeds in its knowledge (docs, site content, catalog/
   service data, policies, FAQs).
2. **Configure** — business defines the bot's persona, tone, guardrails, and
   which action tools it's allowed to use, starting from a vertical template.
3. **Embed** — a widget goes on the business's site and talks to visitors,
   grounded in that business's knowledge only.
4. **Act** — beyond answering questions, the bot performs actions via tool
   calls (order status, appointment booking, inventory check, etc.), scoped
   to what the template + business config allow.
5. **Escalate** — when the bot can't handle something, it hands off to a
   human and captures the lead/context so nothing is lost.
6. **Learn** — the business reviews analytics, spots knowledge gaps, and
   improves the knowledge base.

## MVP scope (decided)

- **Embeddable chat widget** — single script tag, shadow-DOM isolated so
  host-site CSS can't clobber it, per-business theming (colors, avatar,
  greeting, position), streamed responses.
- **Admin dashboard** — setup wizard (pick template → configure knowledge →
  customize appearance → get embed snippet), knowledge base management,
  live conversation inbox for handoff, basic analytics.
- **Knowledge ingestion + RAG** — file upload and/or manual Q&A at minimum
  for v1 (see `docs/open-questions.md` for whether site-crawling is in v1);
  embeddings-backed retrieval used as a tool the bot calls when it needs to
  look something up, not a hardcoded prompt prepend.
- **Conversation analytics & handoff** — chat history, basic volume/topic
  analytics, human handoff flow, lead/contact capture.

## Multi-vertical model (decided — see ADR 0001)

Every business has the same generic knowledge base (documents, URLs, Q&A
pairs, structured records) and the same generic bot configuration shape. On
top of that, **vertical templates** provide sane defaults for a given
industry:

- Default persona/tone and system-prompt guardrails
- A curated subset of action tools relevant to that vertical
- Suggested knowledge base structure (e.g. product catalog fields vs.
  service listings vs. vehicle inventory)
- Compliance notes where relevant (e.g. healthcare's "no diagnosis" rule)

A business picks a template as a starting point and can diverge from it
freely — the template is not a locked schema, and the core engine has no
knowledge of "verticals" as a concept baked into its code.

## Phasing: one vertical first, generic core always

We build the core (knowledge base, bot engine, tool-calling framework,
widget, dashboard) fully generic from the start — that's not deferred work,
it's just not allowed to contain vertical-specific shortcuts (CLAUDE.md
guardrail #2). On top of that generic core, **only one vertical template
ships concretely for v1: ecommerce.** It's the proven playbook (see Zipchat
reference below), has the clearest action-tool set, and we already have
research on it.

Healthcare, automotive, and any other vertical are template additions for
later phases — they should require writing a new template (config/data),
not modifying the engine. Before finalizing the KB schema and action-tool
registry interface, we sketch (on paper, not in code) what a second
template like healthcare or automotive would need from them, specifically
to catch a schema that's secretly ecommerce-shaped — without actually
building that second vertical before it's needed.

## Reference: what Zipchat AI actually does (ecommerce-specific inspiration)

From research (Sept 2026) — see `docs/research/competitive-landscape.md` for
full notes and sources:

- Greets visitors, recommends products, handles objections, recovers
  abandoned carts, generates discount codes, pushes toward checkout
- Answers FAQs, looks up order status, handles returns, verifies COD orders
- One coordinating agent with specialized sub-agents for sales/support/
  marketing
- Multi-channel: website + WhatsApp today, more channels planned
- 95+ languages
- Integrates with Shopify, BigCommerce, WooCommerce, Klaviyo, Mailchimp,
  Zapier, etc.

Our v1 doesn't need to match this breadth — it needs the same *shape*
(support + light sales/action-taking, grounded in the business's data,
integrable) generalized past ecommerce.

## Explicitly out of scope for v1

- Proactive triggers (exit intent, time-on-page) — nice-to-have, phase 2
- WhatsApp/other channels beyond the website widget
- Billing/subscription management
- Pre-built third-party integrations (Shopify, Calendly, etc.) beyond a
  generic webhook mechanism — see `docs/open-questions.md`
