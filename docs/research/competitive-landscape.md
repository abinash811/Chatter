# Research note: Competitive landscape — AI chat/support agents

Date: 2026-09-14, updated 2026-09-26
Researcher: Claude (web search)
Status: Zipchat AI, Gorgias, Intercom Fin, Drift, Tidio, Chatbase,
Voiceflow, and Alludium all covered; RAG-for-multi-tenant-SaaS still TODO

## Why this research

Grounding the product spec and vertical-template design in what the closest
existing product (Zipchat AI) actually does, so we generalize the right
shape rather than guessing.

## Zipchat AI + Claude Agent SDK best practices — archived 2026-09-28

The initial Zipchat AI research (primary reference point, "how Zipchat is
actually built" ground-truth update) and the Claude Agent SDK best-
practices note moved to `docs/research/competitive-landscape-archive.md`
when this file crossed the 500-line guardrail. Both are already fully
absorbed into `docs/adr/0001-generic-base-with-vertical-templates.md` and
`docs/adr/0019-drop-vertical-template-layer.md` — read the archive if you
need the original sourcing, not because either is still an open question.

## Update 2026-09-25: Gorgias, Intercom Fin, Drift vs. Tidio

Researched to inform `docs/roadmap.md` and `docs/features.md` — what
comparable products actually ship, not just Zipchat.

### Gorgias (ecommerce helpdesk + AI agent)

Two-mode agent split by funnel stage: a **Shopping Assistant** pre-purchase
(product recommendations, sizing/material questions, discount codes) and a
**Support Agent** post-purchase (WISMO, returns, shipping-address changes).
The support side does real **write actions inside the conversation** —
starts a return in Shopify admin, issues a refund, edits a subscription,
updates a shipping address — not just lookups. Also takes **image input**
(customer sends a photo of a damaged/wrong item). Reports ~60% of
repetitive tickets automated, 62% higher conversion. Deliberately
Shopify-only — no BigCommerce/Magento/WooCommerce — depth over breadth.

**Implication for us**: our two shipped tools (`search_knowledge_base`,
`check_order_status`) are both read-only. Gorgias validates that
**write-capable action tools** (issue refund, update shipping address,
edit/cancel a booking) are the natural next tier of value, not just more
read tools — and that they should execute inside the conversation, not
redirect the visitor elsewhere. Image input is a real, validated feature
gap, not a nice-to-have guess.

### Intercom Fin (enterprise support AI agent)

Resolution rate is the product's headline metric, publicly reported and
risen from ~25% at launch to 65-76% depending on source/cohort. Pricing is
**outcome-based**: $0.99 per resolved conversation (not per-seat), with a
minimum monthly outcome count. Supports voice and image input, and pulls
real-time data via connectors (Shopify, Salesforce, Stripe, Jira).

**Implication for us**: "resolution rate" (resolved without human handoff,
as a % of conversations) is the metric to build into analytics — we don't
track anything like it yet (see `docs/open-questions.md`'s analytics gap).
Outcome-based pricing is a real, proven model in this exact category —
worth a note for whenever the (currently deferred) pricing/billing
decision gets made, not something to decide now.

### Drift vs. Tidio (positioning contrast)

The two occupy opposite ends of the same market: **Tidio** targets SMB/
ecommerce, <5-minute setup with a script tag, no developer needed, crawls
the site/help-center automatically, and its AI (Lyro) auto-answers ~67% of
queries. **Drift** targets enterprise B2B sales — 60-90 day setup with CRM/
calendar integration, meeting-booking and lead-qualification playbooks,
enterprise-only pricing (~$2,500+/mo).

**Implication for us**: Tidio's positioning is the one that matches our
actual target (vertical-agnostic, but the pattern is SMB self-serve, not
enterprise sales-assisted). This is a real data point *for* v1 site
crawling (open question #4) — Tidio treats automatic crawl-based ingestion
as table stakes for a fast setup, not a deferred nice-to-have. Drift's
meeting-booking/lead-qualification niche is not a pattern to chase; it
belongs to a different buyer than ours.

Sources:
- https://www.eesel.ai/blog/gorgias-ai-agent
- https://www.ringly.io/blog/gorgias-ai-agent-ecommerce
- https://www.getmacha.com/blog/gorgias-ai-agent-explained
- https://www.gorgias.com/
- https://www.intercom.com/learning-center/ai-customer-service-agent-pricing-comparison
- https://enterprisedna.co/resources/ai-pulse/ai-pulse-2026-08-02-intercom-s-fin-ai-agent-is-nearing-100m-arr-roughly-half-of/
- https://www.getmacha.com/blog/intercom-fin-ai-agent-complete-guide
- https://crisp.chat/en/comparisons/drift-vs-tidio/
- https://www.eesel.ai/blog/drift-vs-tidio
- https://www.happyfox.com/compare/tidio-vs-drift/

## Update 2026-09-26: Chatbase, Voiceflow, Alludium

Resolves this file's own prior TODO on Chatbase/Voiceflow; Alludium added
at the user's explicit request.

### Chatbase (generic AI chatbot builder — closest analog to our "generic
base" half of the product)

No-code builder: train an agent on a website crawl, uploaded documents, or
a Q&A knowledge base, then embed it via script tag. Not vertical-specific —
the same builder serves any industry, closer to our "generic core, no
hardcoded vertical" design (ADR 0001) than Zipchat/Gorgias's ecommerce-only
framing. 2026 feature set: **AI Actions** (the same read/write tool-calling
shape as our own tool registry — book appointments, check order status,
collect leads), voice and telephony channels, multi-model routing (choice
of underlying LLM per agent), automatic re-training when a source document
changes plus flagging gaps/conflicting answers in the knowledge base, and
integrations into existing helpdesks (Zendesk, Freshdesk, Gorgias, Help
Scout, HubSpot, Intercom) rather than replacing them. Pricing is
**credit-based**, not seat-based: a free tier (50 msg credits/mo, 1 agent),
then Hobby $40/mo (1,500 credits), Standard $150/mo, Pro $500/mo —
real per-conversation cost varies by which model tier a message uses,
since premium models burn credits faster.

**Implication for us**: Chatbase is the single closest existing product to
what Chatter's "generic core" is trying to be — validates that a
vertical-agnostic builder is a real, viable category, not just our own
hypothesis. Two concrete features worth weighing against our own roadmap:
(1) automatic re-training/gap-flagging on knowledge sources — we have no
equivalent freshness/gap-detection today, worth a line in
`docs/ai-tech-radar.md` alongside the already-tracked ingestion-quality
upgrades; (2) credit-based, model-tier-aware pricing is a second real
precedent (alongside Intercom Fin's outcome-based model) for the still-open
billing/pricing question — relevant once that's revisited, not actionable
now.

### Voiceflow (visual conversation-design tooling)

A drag-and-drop visual flow builder for designing chat *and* voice agent
conversations, not a RAG-first Q&A tool first — the design surface is the
flow diagram (branches, conditions, API-call steps), with a vector-based
knowledge base and multi-LLM support (GPT, Claude, others) layered in
underneath. Supports running multiple agents from one workspace, and
recently added an in-app AI copilot ("Atlas," Aug 2026) that helps author
the flow itself. Pricing is hybrid: a base plan plus usage credits (Pro
tiers $60–120/mo for 10k–20k credits), billed per customer message
($0.005) and per phone-minute ($0.05) on self-serve, moving to large custom
enterprise contracts (reported median ~$258k/yr) at the high end.

**Implication for us**: confirms `docs/roadmap.md`'s Later-section framing
is right — a visual flow builder is real, validated tooling in this
category, but it's a fundamentally different design philosophy (author a
flow graph) from our current one (RAG retrieval + tool-calling, the model
decides what to do at each turn, per `docs/architecture.md` §2). Not a gap
to close for v1; our own prior research (this file's Claude Agent SDK
section) already concluded starting narrow with tool-calling over a
flow-builder is the right v1 call. Worth revisiting only if a customer
segment specifically wants deterministic, hand-authored flows (e.g. a
strict compliance script in a regulated vertical) rather than a model
deciding conversationally.

### Alludium — flagged as a different category, not a direct competitor

A London startup (backed by Sure Valley Ventures/Catenai) that opened its
"Agent Operating System" to public users in March 2026: teams build and
run networks of AI agents that automate internal work — connecting to
Google Workspace, Microsoft 365, Slack, Notion, Trello, HubSpot — via a
conversational, no-code interface. This is an **internal workplace
automation** product (employees delegating tasks to agents across their
own company's tools), not a customer-facing support/sales chat widget for
a business's *own customers* — a different buyer and use case than
Zipchat/Gorgias/Chatbase/us, despite the shared "AI agent" framing.

**Implication for us**: recorded per the user's request, but no direct
product-shape implication — Alludium doesn't compete for the same buyer
or solve the same problem as Chatter. Worth a re-check only if Chatter
ever considers an *internal* (non-customer-facing) agent surface, which
is out of scope for everything in `docs/product-spec.md` today.

Sources:
- https://sitegpt.ai/blog/chatbase-review
- https://www.lindy.ai/blog/chatbase-review
- https://chatimize.com/reviews/chatbase/
- https://checkthat.ai/brands/chatbase/pricing
- https://www.featurebase.app/blog/voiceflow-pricing
- https://www.getmacha.com/blog/voiceflow-complete-guide
- https://www.voiceflow.com/pricing
- https://www.ringly.io/blog/voiceflow-pricing
- https://itbrief.co.uk/story/alludium-launches-public-no-code-ai-agent-platform
- https://uk.finance.yahoo.com/news/catenai-backed-alludium-opens-ai-080036417.html
- https://www.alludium.ai/news/news-welcome

## Competitor vector search / hybrid search infrastructure (2026-09-27)

Researched to inform ADR 0021 (database/hybrid-search decision) — what
does the closest competition actually run, not just what's theoretically
best.

**Chatbase**: migrated *off* Pinecone *onto* Postgres+pgvector via
Supabase as they matured — the opposite of "start on Postgres, need a
real vector DB later." Chatbase's own description: chunks content,
generates embeddings, stores them in a managed vector index with no
separate vector database for the customer to run — consolidated
infrastructure, not a specialized-tool sprawl. Directly validates our
own Postgres+pgvector architecture (ADR 0002), not just a similar one.

Supabase (Chatbase's infra layer) publishes its own official hybrid
search pattern: plain `tsvector`/`ts_rank` (not BM25) combined with
pgvector cosine search via Reciprocal Rank Fusion. Their published
numbers: pure vector search ~62% retrieval precision; adding hybrid
search (still plain `tsvector`, no BM25) ~84% precision, with
near-perfect exact-match queries. The big quality jump is from combining
lexical + semantic search *at all* — which ranking algorithm (BM25 vs.
`ts_rank`) is a smaller, second-order refinement on top of that, not the
source of the gain.

**Gorgias**: uses Zilliz Cloud (managed Milvus), migrated there from an
unnamed competing vector DB — cited reason was Milvus's metadata/
filtering depth for Shopify's complex product variants (color/size/
gender combinations), not search-quality dissatisfaction. Milvus has
BM25 hybrid search built in natively, but this is a different
architectural choice (a dedicated vector database) from a
Postgres-extension decision — not directly comparable to our stack.

**Zipchat**: no public infrastructure/vector-database details found —
too small/closed to have published this.

**Implication for us**: this is the deciding evidence behind ADR 0021 —
build hybrid search as plain `tsvector` + pgvector + RRF (Supabase's
documented, measured pattern) rather than reaching for a BM25 extension
immediately. Real BM25 stays a deferred, evidence-gated upgrade behind
the RAG eval harness (`docs/ai-tech-radar.md`), not a day-one build.

Sources:
- https://zilliz.com/customers/gorgias
- https://supabase.com/customers/chatbase
- https://supabase.com/docs/guides/ai/hybrid-search
- https://www.tigerdata.com/newsroom/google-cloud-brings-native-bm25-full-text-search-to-alloydb-and-cloud-sql-via-tiger-datas-pg_textsearch
- https://neon.com/docs/extensions/pg_search

## Update 2026-09-27: Chatbase's real dashboard UI (primary source — user-provided screenshots)

Prompted by the user asking specifically whether Chatbase's "Actions"
page uses a card-gallery layout, not a checkbox list like our Tools tab
— `www.chatbase.co` was blocked by this environment's network egress
policy at the time (confirmed via two direct `WebFetch` attempts, both
denied), so WebSearch was tried first and came back with marketing blog
posts, not verified UI detail. The user then supplied 5 real
screenshots of their own live Chatbase workspace (an "Eka.Care EMR App"
project) — this section is grounded in those, not search-result
speculation, per this project's own standing rule to read primary
sources. **2026-09-28: `www.chatbase.co` access confirmed working now**
(re-tested directly, see the dated update below) — this section's
findings, grounded in real screenshots of an authenticated dashboard,
remain the stronger source for actual UI layout than a public docs
page fetch would be; the new access mainly unblocks reading their
*public docs/marketing content* directly instead of via search-result
summaries, not an authenticated dashboard view.

**Confirmed: yes, both Actions and Data sources are card galleries.**
- **Actions page**: a 2-column grid of cards, each with an icon, a bold
  title, a one-line description, and one or more pill-shaped quick-start
  buttons for that action's sub-modes — "Escalations" (create a ticket
  on a connected system), "Custom actions" (Call API / Run client-side
  code / Call API + show widget / Show widget), "Collect leads",
  "Collect data", plus per-integration cards (Stripe: retrieve/display
  invoices, change customer info, manage subscriptions; Shopify:
  retrieve/display products, update cart, create order). A "Create
  action" link sits above the grid, not a single "Add" button.
- **Data sources page**: the same card-grid pattern for ingestion
  entry points — Add files / Add website / Add text snippet / Add Q&A's
  / Add Notion pages / Add tickets (the last shown as a locked/premium
  card with a crown icon) — always visible upfront, not tucked behind a
  dropdown. Sources already added are listed below as rows (title,
  created date, link count, type badge, "..." menu), with search/filter/
  sort/bulk-select and pagination controls.

**Implication for us**: our bot editor's Tools tab (`BotEditorForm.tsx`)
is a plain list of `Checkbox` + tool name + description, one per row —
and Knowledge's "Add" entry point is a `DropdownMenu` (Add Q&A/Upload
file/Add URL), not a card grid. Both should become a card gallery to
match: each tool/source type gets a `Card` with an icon, title,
description, and its own action button(s), laid out in a responsive
grid. This is a presentation change to features we've already built
(the 4 action tools, the 3 ingestion methods), not new backend work —
scoped cleanly enough to build directly, matching `docs/design/
component-checklist.md`'s existing primitive rules (`Card`, `Button`,
`lucide-react` icons already in use elsewhere).

**Other real findings from the same screenshots, each with its own
implication:**
- **A live "test the bot" pane, confirmed real** — the Overview screen
  keeps a docked chat preview to the right of every config screen, with
  "Chat as user" and "Preview" as separate top-bar actions and "Deploy"
  as the (separately gated) publish action. This validates the "in-
  console chat playground" feature already recommended in this
  conversation (not yet built) — Chatbase's version is not a modal or a
  separate page, it's a persistent split-pane next to whatever you're
  editing.
- **Suggested-reply chip buttons** under the bot's first message (seen
  in the preview: "Create my ABHA", "Explore Eka.Care EMR", "Get
  started") — a quick-reply/starter-prompt feature we don't have
  anywhere (not in `lib/ai/appearanceOptions.ts` or the widget). Configured
  per-bot, shown before the visitor types anything.
- **Confidence score + "Revise answer" per logged reply** (seen in
  Activity → Conversations → Playground: a score badge like "0.613"
  next to each AI answer, with a "Revise answer" button) — this is
  analytics-adjacent (the user has explicitly put analytics/sentiment on
  hold) but distinct from a vanity metric: it's an actionable knowledge-
  correction workflow tied to a real logged conversation, not a
  dashboard number. Worth revisiting specifically when analytics comes
  off hold, not folded into the general "confidence scoring" idea
  without noting this UI detail.
- **Model configuration sidebar** (Model: "Auto" dropdown + a
  Temperature slider, Reserved↔Creative) shown alongside "Compare" and
  "Save changes" on the Instructions screen — a concrete UI reference
  for `docs/open-questions.md` #6 (LLM model picker + pricing
  visibility), which had no UI precedent to point to before this.
- **"Compare" button** next to "Save changes" on Instructions — implies
  Chatbase supports diffing instruction versions before committing a
  change, a version-history UX we don't have (we only have draft vs.
  currently-published, no diff view).
- **"Sync with global instructions" toggle** — implies an org-level
  shared instruction set that individual bots can opt into or override.
  Only relevant once a business runs multiple bots that should share
  some base instructions — not urgent, no current open question covers
  it; flagged here so it isn't rediscovered from scratch later.

**Follow-up, same session — 4 more screenshots (Channels, Integrations,
Backstage, the Deploy dropdown):**

- **The card-gallery pattern is systemic, not a one-off.** Channels
  (Chat bubble / Help page / Center Stage / Email / Shopify / Phone,
  each "Manage" or "Start free trial to enable") and Integrations
  (Slack / Shopify / Twilio / Calendly / Stripe / Zendesk / Sunshine /
  Salesforce / Intercom) use the *exact same* card shape as Actions and
  Data sources — icon, title, one-line description, one action button.
  This raises the implication above from "redesign the Tools tab" to
  "build one reusable card-gallery layout and reuse it everywhere a
  screen lists a fixed set of typed options" — matches this project's
  own `components/ui/` barrel-reuse convention (`.claude/rules/
  console-frontend.md` item 2), not a per-screen one-off each time.
- **Channels vs. Integrations is a real conceptual split we don't have.**
  Channels = *where the agent talks to people* (embed surface, email,
  phone). Integrations = *what systems it can read/write* (helpdesks,
  CRM, payments, scheduling). We currently conflate both into a single
  `/integrations` page holding just Shopify connect.
  Relevant to `docs/roadmap.md`'s "Design pass on `/bots/[botId]/
  integrations`" Next item and ADR 0015's deferred "no email/Slack push
  channel" decision — both were open before this; now there's a named
  pattern (a separate Channels concept) to weigh against just growing
  the existing Integrations page.
- **Deploy is a dropdown of embed targets, not one script tag.**
  Website widget (floating bubble), Website iframe (inline embed),
  plus one-click Shopify and WordPress plugin installs. We only offer
  the floating-bubble script tag today (`public/widget.js`). A WordPress/
  Shopify one-click install (vs. copy-pasting a script tag) is a real
  self-serve improvement for non-technical users specifically — same
  audience this whole demo-data/self-serve push has been targeting.
- **Backstage — an AI copilot for managing the agent itself**, separate
  from the Playground (which chats *as* the agent). Prompts like "Review
  and improve my agent's instructions" and "Audit my agent's
  configuration for improvements" — the AI helps configure the AI.
  Genuinely a different, bigger feature (meta-agent tooling) than
  anything else in this note — flagged for `docs/roadmap.md`'s Later
  section, not proposed as a near-term build.

## Update 2026-09-28: live docs fetch — Guardrails and Procedures confirmed real, publicly documented features

With `www.chatbase.co` access confirmed working (see the note at the top
of the "real dashboard UI" section above), fetched their public docs
directly (`/docs/llms-full.txt` for an index, then individual pages) to
follow up on this file's own TODO list of unexplored dashboard sidebar
items. Their public docs turn out to be mostly API/SDK reference, not a
page per dashboard feature — most guessed URLs 404'd — but two hit real,
substantial content:

- **Guardrails** (`/docs/user-guides/chatbot/guardrails`) — three
  mechanisms: **rate limiting** (a message cap per device over a time
  window, with a customizable "limit reached" response), **spam
  detection** (an automatic toggle that scans at the 2nd/4th/8th/16th
  user message and pauses conversations it flags — profanity and
  "unsolicited commercial promotions, scams, repetitive gibberish" by
  default, customizable up to 2,000 characters of guidance), and
  **country blocking** (IP-based, dropdown country picker, applies to
  the widget + API but not messaging integrations). We have none of
  this today — guardrail #3 in this project's own CLAUDE.md is about
  regulated-vertical *prompt* guardrails (refuse diagnosis/legal/
  financial advice), a completely different concern from *abuse*
  guardrails (rate limits, spam, geo-blocking). Worth a
  `docs/open-questions.md` entry: is abuse protection in scope for v1,
  or later — right now we have zero defense against someone hammering
  a bot's API or running up Claude API costs via spam.
- **Procedures** (`/docs/user-guides/chatbot/procedures`) — a named
  workflow: a **trigger** ("when to use" — the situation that engages
  it) paired with an ordered list of **steps** the agent works through,
  used for high-stakes multi-step interactions (refunds, escalations,
  onboarding) where consistent handling matters more than free-form
  improvisation. Steps can reference existing actions via `@` notation,
  use `{{token}}` variables for personalization, and branch
  conditionally (up to 5 branches per decision point, max 15 steps).
  This sits in a real, previously-unconsidered middle ground between
  what we have (a flat tool registry, no ordering/sequencing) and this
  roadmap's "Later"-deferred visual flow builder (a full graph editor) —
  a Procedure is much narrower: one trigger, one linear-with-branches
  script, not a general-purpose flow canvas. Worth flagging as a
  distinct option from the flow-builder idea already on record, not the
  same thing at a smaller scale.
- **Revise (confirmed via public docs, not just the screenshot)** —
  `best-practices` names "Revise" alongside Q&A correction as a real,
  documented way to fix a bad logged answer after the fact, strengthening
  (not just repeating) the "Confidence score + Revise answer" finding
  already recorded above from screenshots — this is a real, named
  product feature, not a one-off UI element caught in a screenshot.
- **Not found as dedicated public docs pages**: Suggestions, Outbound,
  Helpdesk inbox (as an interface — "Helpdesk" exists only as an API
  ticketing reference, not a user-guide page), Contacts, Backstage's
  full capability set. These may simply not have public docs pages
  (dashboard-only features), not that they don't exist — the original
  screenshot-based Backstage finding above stands on its own regardless.

## TODO — still need to research

- RAG architecture best practices for multi-tenant SaaS specifically
  (retrieval scoping, embedding refresh strategies) — hybrid search
  itself is now covered above.
- Embeddable widget engineering patterns (shadow DOM vs. iframe trade-offs,
  script-tag loading performance).
- Suggestions, Outbound, Helpdesk inbox, Contacts, Backstage's full
  capability set — no public docs page found for any of these; still
  needs either a live account or user-supplied screenshots, `chatbase.co`
  access alone doesn't reach an authenticated dashboard view.
