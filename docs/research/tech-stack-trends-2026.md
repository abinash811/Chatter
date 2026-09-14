# Research note: Current tech stack trends for AI-native multi-tenant SaaS (2026)

Date: 2026-09-14
Researcher: Claude (web search)
Status: informs the still-open tech stack decision (docs/open-questions.md #1)

## Why this research

Follow-up to "Zipchat uses Ruby on Rails, isn't that old?" — needed two
separate answers: (1) is Rails actually a scaling liability (fact-check),
and (2) what does a new AI-native SaaS build typically use in 2026,
independent of what any one competitor picked.

## Is Rails a scaling risk? No — checked against real evidence

- Shopify's Rails monolith powered $14.6B in Black Friday 2025 merchant
  sales, peaking at 489M requests/minute at the edge and 53M DB queries/
  second. Shopify calls itself "the biggest Rails app in the world."
- GitHub deploys a 2-million-line Rails monolith 20x/day with 1,000+
  engineers working in it concurrently.
- Rails 8 (2024) modernized deployment (Kamal 2, sub-2-minute deploys, "no
  PaaS required") and supports API-only mode for microservice use.
- Conclusion: scaling is primarily a function of database design, caching,
  horizontal scaling, and queueing discipline — largely orthogonal to
  framework choice. Framework age/"hotness" and scalability are different
  axes; a mature framework means a well-known, battle-tested scaling
  playbook, not an inherent ceiling.

## Why Zipchat likely chose it anyway

Bootstrapped, small team, founders from an ecommerce-operator background
(not AI research) — Rails' productivity for CRUD-heavy apps plus Hotwire
(confirmed in their job postings) lets a small team ship a full product
fast without a separate SPA frontend team. They did **not** use Rails for
the AI-specific layer — a dedicated Python "AI RAG Engineer" role handles
that, where Python's ecosystem (embeddings, LLM SDKs, scraping) is
genuinely stronger. This is a deliberate polyglot split (boring/productive
framework for business logic + CRUD, best-fit language for AI), not
uniform "old tech everywhere." See
`docs/research/competitive-landscape.md` update for the full detail.

## What a new AI-native multi-tenant SaaS build typically uses in 2026

From current state-of-AI-engineering sources, independent of any one
competitor's choice:

- **Frontend**: Next.js (v16) + Tailwind CSS — the dominant recommended
  shell for a new build.
- **Backend**: FastAPI (Python) paired with a Next.js frontend is called
  out as strong "when backend engineers know Python and frontend
  engineers know React"; full-stack TypeScript with Next.js is the other
  common path. The split typically follows team strengths, not a hard
  technical requirement either way.
- **Database / vector store**: **Postgres + pgvector** is recommended as
  the strong default for AI features/memory — not a dedicated vector DB,
  unless scale later demands it. Directly relevant to open question #2
  (vector store choice).
- **LLM orchestration**: a model-gateway pattern (OpenRouter-style) for
  provider abstraction, combined with **"native tool calls plus MCP"** as
  the current default pattern — i.e. both together, not either/or. This
  independently validates the split already reasoned through and written
  into `docs/architecture.md` and
  `docs/research/tool-calling-architecture.md` (native for the live loop,
  MCP for external-system integration) — we arrived at the same place
  from first principles that the current field is converging on in
  practice.
- **RAG/memory architecture**: existing Postgres for structured facts +
  conversation summarization to stay inside context limits + file-based
  memory for durable notes. Practical, not over-engineered.
- **Multi-tenancy**: RAG retrieval strictly scoped to the current tenant —
  matches CLAUDE.md guardrail #1 already in place.
- **Strategic note on model-agnosticism**: general 2026 guidance treats
  single-provider lock-in as a real strategic risk and recommends routing
  tasks to different models by complexity/cost. This is somewhat in
  tension with the product brief's explicit "built completely using
  Claude" — noting the tension rather than resolving it; a softer version
  (routing across *Claude's own* model tiers — Haiku/Sonnet/Opus — by task
  complexity/cost) satisfies the spirit of the cost-optimization advice
  without abandoning the Claude-first choice, and is worth considering
  regardless of the vendor question.
- **Cost reality**: pre-revenue teams run their full AI stack on ~$35/
  month, traction-stage ~$325/month, scale-stage ~$1,150/month — this
  class of product is not expensive to start, relevant to "fast to market,
  needs to earn money."

## Implication for Chatter

Doesn't resolve open question #1 (tech stack) on its own — that's still
the user's call — but gives a concrete, current default to react to:
Next.js + Tailwind, Postgres + pgvector, native tool-calls + MCP hybrid
(already independently reasoned through), FastAPI or full-TS backend
depending on team fit. Also closes the loop on the Rails question: it was
a reasonable, deliberate choice for Zipchat's team and speed goals, not
evidence against Rails generally — whether it's right for us is a
separate, still-open decision.

Sources:
- https://robustdevs.co/reports/state-of-ai-engineering
- https://www.bitcot.com/building-ai-saas-product-tech-stack/
- https://projectsupply.in/blog/ai-stack-saas-startup-2026
- https://www.monterail.com/blog/companies-that-use-ruby-on-rails
- https://railsatscale.com/
- https://softices.com/blogs/how-to-scale-ruby-on-rails-app
- https://dev.to/flobsien/why-we-still-build-with-ruby-in-2026-2c8l
- https://dev.to/remybuilds/best-ai-agent-saas-tech-stack-in-2026-2h1p
- https://lushbinary.com/blog/ai-native-saas-architecture-patterns-developer-guide/
- https://viston.tech/whats-the-best-ai-chatbot-stack-for-enterprise-saas-in-2026/
