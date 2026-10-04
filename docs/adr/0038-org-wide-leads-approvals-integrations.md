# ADR 0038: Leads, Approvals, and Integrations become org-wide

Status: accepted

Date: 2026-10-04

## Context

ADR 0037 moved the 7 bot-scoped page links into a contextual sidebar
sub-nav. Reviewing that result, the user flagged 3 of those 7 — Leads,
Approvals, and Integrations — as not actually belonging nested under
one bot. Asked to confirm what "global" meant for each, since the
three are not the same kind of change:

- **Leads** and **Approvals** are naturally cross-bot concepts — a
  lead is a lead, a review queue is a review queue, regardless of
  which bot produced it. Both models already carry `orgId` with an
  index (`prisma/schema.prisma`), so an org-wide list is a query-scope
  and page-placement change, not a schema change — the same pattern
  `/conversations` already uses (global nav item, optional `?botId=`
  filter, a "Bot" column per row).
- **Integrations** is a real data-model question, not just a nav one:
  does each bot keep its own separate Shopify connection (an org-wide
  *view* listing every bot's own integration), or does an org connect
  Shopify once and every bot shares it? Asked directly — the user
  confirmed the latter: one shared connection per org.

## Decision

1. **Leads** (`/leads`) and **Approvals** (`/approvals`) move to
   top-level global console pages, listing across every bot in the org
   with a "Bot" column and an optional bot filter (`ConversationFilters`'
   established URL-param pattern) — no schema change, `Lead.botId`/
   `PendingAction.botId` stay exactly as they are.
2. **Integration** becomes a real org-level row: `botId` is removed
   from the model entirely, `@@unique([botId, provider])` becomes
   `@@unique([orgId, provider])`. One Shopify connection per org,
   shared by every bot. `IntegrationProvider`'s interface
   (`lib/integrations/provider.ts`) drops `botId` from
   `getAuthorizeUrl`/`handleCallback`/`disconnect` to match.
   `check_order_status`/`request_order_cancellation`
   (`lib/ai/tools/checkOrderStatus.ts`/`cancelOrder.ts`) look up the
   org's integration directly (`orgId_provider`) instead of resolving
   through the calling bot — each tool's `handle(orgId, botId, ...)`
   signature is unchanged (`botId` is still needed to create a
   `PendingAction`/log the call against the right bot), only the
   Integration *lookup* itself stops being bot-scoped.

## Alternatives considered

- **Leads/Approvals stay bot-scoped, just add a cross-bot summary
  view elsewhere** — rejected: that's two places to look for the same
  data, and `/conversations` already proves the single-global-list
  pattern works well for exactly this shape of data in this app.
- **Integrations: keep per-bot connections, just add a combined
  list page** — the lower-risk, non-schema-changing option, offered
  explicitly before building anything. The user chose the shared-
  connection model instead, accepting the larger migration because
  reconnecting Shopify separately for every bot in an org doesn't
  match how a single Shopify store actually works (one store, not one
  per bot) — the per-bot model was the wrong fit from the start, not a
  tradeoff worth keeping for convenience.

## Consequences

Leads/Approvals: low-risk, fully reversible — moving a page and
widening a query's scope back to one `botId` is a small diff either
way.

Integrations: genuinely hard to reverse. A business with multiple bots
each connected to a *different* Shopify store today (the only
pre-ADR-0038 shape the schema allowed) cannot be represented after
this migration — the schema can no longer hold more than one Shopify
connection per org. No production data exists yet, so this is a clean
cut, not a lossy migration against real businesses; a future "multiple
stores per org" need would require re-introducing a bot (or a new
explicit) scope, not just reverting this ADR.
`request_order_cancellation`'s approval step and `check_order_status`
both now resolve "which Shopify store" purely from the org, which also
means a visitor talking to *any* bot in an org can look up or cancel
*any* order connected to that org's one store — correct once a store
is genuinely org-level, but worth remembering if a future vertical
wants per-bot data isolation within one org (not needed today, no
business currently spans multiple physically separate stores under one
org in this product).
