# Research note: Competitive landscape — AI chat/support agents

Date: 2026-09-14
Researcher: Claude (web search)
Status: partial — Zipchat AI covered in depth, others are TODO

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

## TODO — still need to research

- **Chatbase** — generic (non-ecommerce) AI chatbot builder; likely closest
  analog to our "generic base" half of the product.
- **Voiceflow / Botpress** — conversation-design tooling; relevant if we
  ever expose a visual flow builder beyond pure RAG+tools.
- RAG architecture best practices for multi-tenant SaaS specifically
  (retrieval scoping, embedding refresh strategies, hybrid search).
- Embeddable widget engineering patterns (shadow DOM vs. iframe trade-offs,
  script-tag loading performance).
