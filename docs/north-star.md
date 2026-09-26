# Product North Star — Configurable AI Agent Platform

**Status:** long-term product direction, not a spec. Existing `docs/*.md`
remain the implementation source of truth; this file gives context without
requiring a full-repo read.

## Vision

A configurable, multi-channel AI Agent Platform: a business creates,
configures, deploys, and operates AI agents without understanding LLMs,
prompts, RAG, APIs, or orchestration. Healthcare is the first deeply
specialized vertical (complex workflows, multi-agent, voice, patient
journeys), but the platform underneath must be generic enough for other
verticals (Shopify/ecommerce, support, sales, financial services, ...) to
reuse without a rebuild.

**Core principle:** build a general Agent Platform, put vertical
intelligence on top of it. Never build a healthcare-specific system that
later needs rebuilding for other industries — this is the same discipline
CLAUDE.md guardrail #2 already enforces.

## Phasing (current)

**Phase 1 — chat-based, now.** Replicate Chatbase-level configurability
(agent creation, instructions, knowledge/RAG, actions/tools, testing,
website widget, analytics, human handoff, no-code config) as the baseline,
layered with our own product opinions — not a blind clone. This is where
active work is focused.

**Phase 2 — voice, later.** Voice as a first-class Agent Runtime
participant (not STT→chatbot→TTS), referencing Assort Health for the
patient-journey/multi-agent/handoff layer. Not started, not to be
scaffolded yet.

**Future — other verticals, other channels.** WhatsApp, SMS, email, other
industries — added as configuration/templates on the same core, once the
platform primitives are proven on Phase 1.

## Reference products (research on demand, not upfront)

- **Chatbase** — configurable AI-agent platform UX (agent builder, RAG,
  crawling, ingestion, actions, testing, widget, analytics, handoff).
  Primary reference for Phase 1.
- **Assort Health** — healthcare voice agents, patient journey, multi-agent
  triage/routing/handoff. Reference for Phase 2 and the healthcare
  vertical, not needed for Phase 1 chat work.

Per the North Star's own rule: research a competitor only when the task at
hand actually requires it (e.g. building the agent builder → research
Chatbase's agent-builder UX; building a DB migration → no competitor
research needed). Don't load both references for every task.

## Core platform vs. vertical (classification to apply going forward)

- **Core platform** (reusable): agent runtime, agent builder, orchestration,
  knowledge/RAG, memory/context, tools/actions, workflow engine, model
  routing, channels, analytics, human handoff, auth, orgs, permissions,
  configuration system.
- **Vertical capability** (industry-specific data/concepts): e.g. healthcare
  — patient, doctor, appointment, triage, referral, prescription, EHR;
  Shopify — customer, product, cart, order, shipment, return.
- **Vertical configuration** (same engine, different config): templates,
  workflows, tools, data models, rules, prompts, knowledge, UI fields,
  escalation rules.

This maps directly onto ADR 0001's existing generic-core + vertical-template
split — the North Star doesn't change that architecture, it gives it a
longer runway (agent orchestration, multi-channel, voice) to grow into.

## Agent runtime & orchestration (future shape, not yet built)

The LLM is one component, not the whole app: separate reasoning, state,
memory, knowledge, tools, workflows, rules, permissions, orchestration, and
human escalation. Agents must eventually support Agent→Agent, Agent→
Workflow, Agent→Tool, Agent→Human, Workflow→Agent, Human→Agent, and
Channel→Channel handoffs, preserving conversation context across the
transfer. Chatter's current single-agent + tool-registry design (ADR 0002)
is the deliberate starting point — multi-agent orchestration is future
scope, not something to build ahead of need.

## Configuration-first principle

Every UI surface should expose business concepts, not AI mechanics:
"What should your AI assistant do?" not "configure system prompt";
"Connect appointment booking" not "configure tool schema"; "Add your
website and documents" not "configure a RAG pipeline"; "When should the AI
transfer to your team?" not "configure routing rules." Complexity lives
underneath the product, never in the user's experience. This is the same
spirit as `docs/design/principles.md`'s plain-language rule, applied
platform-wide.

## What this does NOT authorize

Per the North Star's own implementation rules — do not, on the strength of
this document alone: rebuild the app, create a separate healthcare
platform, hard-code healthcare concepts into the core engine, implement
every competitor feature, implement future phases early, or replace
working architecture without a clear reason. Read this file, identify the
current phase, then read only the relevant existing project docs before
changing anything.
