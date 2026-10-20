# ADR index

One line per decision, current status only — read this before opening
individual ADRs to know which ones still matter. Status here must match
each file's own `Status:` line; if they ever disagree, the file is
correct and this table is stale (fix it in the same PR you notice it).
Added 2026-10-11 after a docs critique flagged that a third of the ADRs
were superseded with no way to tell except opening all 39 files.

| # | Title | Current status |
|---|---|---|
| 0001 | Generic knowledge/config base with vertical templates on top | Superseded by 0019 |
| 0002 | Tech stack for v1 | Accepted |
| 0003 | Auth & multi-tenancy — database-enforced isolation | Accepted |
| 0004 | Console auth — Google OAuth via Auth.js, JWT sessions | Superseded by 0006 |
| 0005 | Deploy to Render for a real, browsable environment | Superseded by 0020 |
| 0006 | Console auth — switch from Google OAuth to email + password | Accepted |
| 0007 | Finalized design tokens — color, typography, spacing | Superseded by 0008 |
| 0008 | Adopt CARE's exact design system | Superseded by 0014 |
| 0009 | Upgrade to Tailwind CSS v4 | Accepted |
| 0010 | Use CARE as a reference, stop pulling component source verbatim | Superseded by 0014 |
| 0011 | CARE's live product is unreachable — work from documented knowledge instead | Superseded by 0014 |
| 0012 | Onboarding wizard + optional BYOA, with real encryption at rest | Accepted |
| 0013 | File/URL knowledge ingestion — libraries, chunking, scope | Accepted |
| 0014 | shadcn/ui's official registry + Claude Console's real layout | Accepted (typography superseded by 0036; everything else stands) |
| 0015 | Conversation inbox — dashboard-only for v1 | Accepted |
| 0016 | Conversation inbox — plain-language tool call summaries | Accepted |
| 0017 | Complete the shadcn migration, drop @base-ui/react | Accepted |
| 0018 | Bot removal is archive, not hard delete | Accepted |
| 0019 | Drop the vertical-template layer — verticals are code changes | Accepted |
| 0020 | Drop Render as the deploy target — hosting undecided again | Accepted |
| 0021 | AWS RDS for PostgreSQL, native tsvector hybrid search | Accepted |
| 0022 | Custom webhook/API action tool | Accepted |
| 0023 | Write-capable action tools require human approval | Accepted |
| 0024 | TanStack Table + nuqs for console list screens | Accepted |
| 0025 | Every components/ui/ primitive must be a verified shadcn/ui source | Accepted |
| 0026 | Model tier + temperature picker | Accepted |
| 0027 | Conversations rebuilt as a split-pane Activity view | Accepted |
| 0028 | In-chat interactive widgets (forms, cards, functions, states) | Accepted (Phase 1+2 built; States/multi-view still open) |
| 0029 | Guardrails Phase 1 — rate limiting + spam detection | Accepted |
| 0030 | Real multi-page site crawling for Data sources | Accepted |
| 0031 | Self-hosted JS-rendering fallback for URL/crawl ingestion | Accepted |
| 0032 | Firecrawl as a last-resort fallback for URL/crawl ingestion | Accepted |
| 0033 | Upgrade to TypeScript 7 and Next.js 16 | Accepted |
| 0034 | Upgrade to Prisma 7 | Accepted |
| 0035 | Reranking via Voyage rerank-2 | Accepted |
| 0036 | Adopt Inter as the console's real typeface | Accepted (supersedes 0014's typography decision only) |
| 0037 | Bot-scoped page navigation moves into the sidebar | Accepted |
| 0038 | Leads, Approvals, and Integrations become org-wide | Accepted |
| 0039 | Hosted SaaS only — no self-hostable product option | Accepted |

**7 of 39 are superseded** (0001, 0004, 0005, 0007, 0008, 0010, 0011) —
read the ADR that replaced each one instead for current behavior.
