# ADR 0001: Generic knowledge/config base with vertical templates on top

Status: accepted

Date: 2026-09-14

## Context

The product must serve multiple industries (ecommerce, healthcare,
automotive, and others not yet named) without becoming N separate products.
We need a way to give each vertical sensible defaults (persona, action
tools, compliance guardrails) without hardcoding industry-specific branches
into the core engine, which would make the system harder to extend to the
next industry and easier to get subtly wrong (e.g. leaking ecommerce
assumptions into a healthcare bot).

## Decision

Every business gets the same generic data model: a flexible knowledge base
(documents, URLs, Q&A pairs, structured records) and the same generic bot
configuration shape (persona, guardrails, enabled tools). **Vertical
templates** are a config/data layer on top that pre-fill sensible defaults
for a given industry — default persona and tone, a curated subset of action
tools, suggested knowledge base structure, and compliance notes. A business
picks a template as a starting point at setup and can diverge from it
freely afterward. The core engine has no concept of "industry" in its code
— it only ever sees a resolved bot config.

## Alternatives considered

- **Vertical-specific product forks/schemas** (a separate ecommerce app, a
  separate healthcare app) — rejected: multiplies engineering effort per
  vertical, defeats the point of a shared platform, and was explicitly
  ruled out by the product brief ("we will not restrict it to ecommerce").
- **Fully generic with no templates at all** — rejected: leaves every
  business to configure persona/guardrails/tools from a blank slate, which
  is slow to onboard and easy to get wrong for regulated verticals
  (a healthcare business might not think to add a "no diagnosis" guardrail
  unless we hand it to them by default).

## Consequences

- Onboarding a new vertical becomes "author a template" (data), not "modify
  the engine" (code) — this is the whole point and should stay true as the
  system grows.
- Any code review or implementation that hardcodes vertical logic into the
  core engine (e.g. `if industry == "healthcare"`) violates this decision;
  see CLAUDE.md guardrail #2.
- Templates need a home in the data model and a way to be edited/versioned
  independently of business-level overrides — this is a downstream
  implementation detail to resolve once the DB/stack is chosen (see
  `docs/open-questions.md`), not re-litigated here.
