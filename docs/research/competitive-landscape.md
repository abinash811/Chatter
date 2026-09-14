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

## TODO — still need to research

- **Chatbase** — generic (non-ecommerce) AI chatbot builder; likely closest
  analog to our "generic base" half of the product.
- **Intercom Fin** — enterprise support AI agent; relevant for handoff/
  analytics UX patterns and how they handle "I don't know, escalating."
- **Tidio / Crisp** — SMB live-chat-plus-AI tools; relevant for widget UX
  and ease of setup expectations.
- **Voiceflow / Botpress** — conversation-design tooling; relevant if we
  ever expose a visual flow builder beyond pure RAG+tools.
- RAG architecture best practices for multi-tenant SaaS specifically
  (retrieval scoping, embedding refresh strategies, hybrid search).
- Embeddable widget engineering patterns (shadow DOM vs. iframe trade-offs,
  script-tag loading performance).
