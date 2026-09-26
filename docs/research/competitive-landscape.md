# Research note: Competitive landscape — AI chat/support agents

Date: 2026-09-14, updated 2026-09-26
Researcher: Claude (web search)
Status: Zipchat AI, Gorgias, Intercom Fin, Drift, Tidio, Chatbase,
Voiceflow, and Alludium all covered; RAG-for-multi-tenant-SaaS still TODO

## Why this research

Grounding the product spec and vertical-template design in what the closest
existing product (Zipchat AI) actually does, so we generalize the right
shape rather than guessing.

## Zipchat AI (primary reference point)

Zipchat is an AI customer-engagement platform for ecommerce that answers
support questions and sells at the same time.

**Sales & support functions**: greets visitors, asks what they're looking
for, recommends products, handles objections, recovers abandoned carts,
generates personalized discount codes, pushes toward checkout. Answers
FAQs, looks up order status, handles return requests, collects reviews,
verifies cash-on-delivery orders.

**Agent architecture**: one central AI agent coordinates specialized
sub-agents for sales, support, and marketing across channels — relevant
precedent for our "bot engine + tool registry" design, though we don't need
a multi-agent architecture for v1 (Claude Agent SDK guidance below argues
for starting narrow).

**Channels**: website + WhatsApp today; email/Instagram/TikTok planned.

**Language**: 95+ languages.

**Integrations**: Shopify, ActiveCampaign, BigCommerce, Klaviyo, Mailchimp,
WooCommerce, Webflow, Wix, WordPress, PrestaShop, Magento, Zapier.

**Reported performance**: ~16.3% chat conversion rate, 90%+ inquiry
resolution without human involvement.

**Implication for us**: our v1 doesn't need to match this integration
breadth. What matters is the *shape* — support + light sales/action-taking,
grounded in the business's own data, extensible via integrations — and that
shape generalizes past ecommerce fine (support + light "sales" reads as
"support + conversion-toward-the-business's-goal" for any vertical: booking
an appointment, scheduling a test drive, etc.).

Sources:
- https://www.zipchat.ai/blog/best-ai-chatbot-for-ecommerce
- https://www.capterra.com/p/10014211/Zipchat/
- https://coldiq.com/tools/zipchat-ai
- https://myaskai.com/blog/zipchat-complete-guide-2026
- https://craftshift.com/zipchat-ai-review/

## Update 2026-09-14: how Zipchat is actually built (ground truth, not marketing)

Checked their own engineering job postings and Shopify App Store listing —
more reliable than review sites for actual implementation details.

**Stack (from job postings)**: Ruby on Rails backend + Hotwire/ViewComponent
frontend; Python for "useful libraries" plus web scraping and data storage
(almost certainly the site-crawl/ingestion pipeline behind their 5-10
minute auto-indexing); a dedicated "AI RAG Engineer" role building RAG
agents against OpenAI *or* Anthropic (not single-vendor), retrieval via
embeddings + vector databases, and prompt engineering. Conventional, proven
web stack — not novel infrastructure. No mention of MCP anywhere in their
hiring needs, consistent with the earlier finding that production
customer-facing agent loops stay off MCP.

**Shopify integration mechanics (from their App Store listing)**: installed
from the Shopify App Store requesting exactly two scopes — **read
products** (builds the product knowledge base) and **read orders** (WISMO/
order status/tracking/return-eligibility). Install → approve permissions →
account auto-linked → products/policies/FAQ pages indexed within 5-10
minutes, fully automatic. Order status resolved by calling Shopify's order
API directly with the stored token. This is a direct real-world validation
of the self-serve OAuth "Connect X" design already written into
`docs/architecture.md` — minimal scopes, zero developer effort per
merchant, automatic ingestion on connect.

**Who built it**: founders with deep ecommerce operating backgrounds (one
built a $20M ecom brand, another built CheckoutX, processing close to $1B
in ecommerce GMV/year) rather than an AI-research background. No public
engineering blog or architecture deep-dive exists. Reads as a competently
executed, conventional stack rather than novel infrastructure — their
differentiation is product/conversion instinct (persona tuned to sell,
proactive discount codes, fast accurate answers), not architectural
sophistication. Worth remembering when designing the ecommerce template's
*behavior*, not just its plumbing.

**Unverified loose thread**: their site also has content about AI search
across Notion/Confluence/Slack/GitHub/Jira for engineering teams under the
same domain — possibly a second product line, possibly a search artifact.
Not confirmed, not chased further.

Additional sources for this update:
- https://apps.shopify.com/partners/fbh-technologies-pte-ltd
- https://www.zipchat.ai/post/best-shopify-ai-app
- https://jobs.weekday.works/zipchat-ai-rag-engineer,-ruby-on-rails-%7C-earn-equity
- https://jobs.weekday.works/zipchat-remote-full-stack-ruby-on-rails-engineer-earn-equity
- https://www.zipchat.ai/about
- https://blog.leteyski.com/p/my-first-acquisition-zipchat-ai-the

## Claude Agent SDK / agent-building best practices (Sept 2026)

- Start with a narrow workflow, clear tool boundaries, and a simple agent
  loop before adding memory, retrieval, MCP, or multi-agent collaboration.
- Tool definitions are the most important part of an agent — write them
  precisely. Start with a single agent and 3-5 tools; add complexity only
  when needed.
- Reliable agents need harness design (tools, approvals, logs, hooks,
  tests, context management, escalation), not a prompt-only setup.
- Use an agent only for open-ended problems where steps are unpredictable;
  if the workflow can be hardcoded, a linear script is faster and cheaper.

**Implication for us**: our bot engine should start with a small, precise
tool set (RAG retrieval + a handful of vertical action tools) rather than a
Zipchat-style multi-agent architecture. We can grow toward specialized
sub-agents later if a single agent + tool registry proves insufficient —
don't build the multi-agent version on day one.

Source: https://bertomill.medium.com/claude-agents-sdk-best-practices-from-the-team-that-built-it-63580d1a0c3b

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

## TODO — still need to research

- RAG architecture best practices for multi-tenant SaaS specifically
  (retrieval scoping, embedding refresh strategies, hybrid search).
- Embeddable widget engineering patterns (shadow DOM vs. iframe trade-offs,
  script-tag loading performance).
