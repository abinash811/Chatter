# Product North Star — Configurable AI Agent Platform

**Status:** long-term product direction, not a spec. Existing `docs/*.md`
remain the implementation source of truth; this file gives context without
requiring a full-repo read.

## Vision

A configurable, multi-channel AI Agent Platform: a business creates,
configures, deploys, and operates AI agents without understanding LLMs,
prompts, RAG, APIs, or orchestration. The platform must be generic enough
for any vertical (ecommerce, support, sales, healthcare, financial
services, automotive, ...) to reuse without a rebuild — that genericness
is the whole point, not a side effect.

**Core principle:** build a general Agent Platform, put vertical
intelligence on top of it. Never build a vertical-specific system that
later needs rebuilding for other industries — this is the same discipline
CLAUDE.md guardrail #2 already enforces.

**Corrected 2026-10-11** (real contradiction, flagged by the user): this
file previously named healthcare "the first deeply specialized vertical"
and referenced Assort Health as an active Phase 2 input. That directly
conflicted with the sequencing every other doc actually commits to —
`docs/product-spec.md`, `docs/roadmap.md`, and ADR 0019 all say
**ecommerce ships first**, as the one concrete v1 vertical, with
healthcare explicitly deferred (sequencing decision, `docs/roadmap.md`'s
"Later" section: prove the generic core solid on ecommerce before
starting a second vertical; blocked on `docs/open-questions.md` #2,
compliance posture for regulated verticals, being answered first). This
file is corrected below to match that — it was stale, not a real pivot
the rest of the docs had missed.

## Phasing (current)

**Phase 1 — chat-based, now, ecommerce first.** Replicate Chatbase-level
configurability (agent creation, instructions, knowledge/RAG, actions/
tools, testing, website widget, analytics, human handoff, no-code config)
as the baseline, layered with our own product opinions — not a blind
clone. **Ecommerce is the one concrete vertical built for this phase**
(`docs/product-spec.md`'s Phasing section) — the proven playbook (Zipchat
AI), the clearest action-tool set, and the vertical this project already
has real research on. This is where active work is focused.

**Phase 2 — voice + a second vertical, later, explicitly not started.**
Healthcare is the planned second vertical once the generic core is
proven on ecommerce (`docs/roadmap.md`'s sequencing decision) — not
started, not to be scaffolded yet, blocked on `docs/open-questions.md`
#2. Voice as a first-class Agent Runtime participant (not
STT→chatbot→TTS) is the other Phase 2 track; Assort Health (healthcare
voice agents, patient journey, multi-agent triage/routing/handoff) is a
reference for *that future phase only* — not a current input, not
needed for any Phase 1 chat work.

**Future — other verticals, other channels.** WhatsApp, SMS, email, other
industries — each built as a direct code/config change against the
engine when actually needed (ADR 0019 — see below), once the platform
primitives are proven on Phase 1.

## Reference products (research on demand, not upfront)

- **Chatbase** — configurable AI-agent platform UX (agent builder, RAG,
  crawling, ingestion, actions, testing, widget, analytics, handoff).
  Primary reference for Phase 1.
- **Assort Health** — healthcare voice agents, patient journey, multi-agent
  triage/routing/handoff. Reference for the future healthcare/voice
  phase only (above) — not needed for any Phase 1 chat work, and not to
  be read as healthcare being next in line.

Per the North Star's own rule: research a competitor only when the task at
hand actually requires it (e.g. building the agent builder → research
Chatbase's agent-builder UX; building a DB migration → no competitor
research needed). Don't load both references for every task.

## Core platform vs. vertical (a reasoning lens, not a data layer)

Useful for judging whether something belongs in shared engine code or
per-bot config — **not** a model to build against. ADR 0019 (2026-09-27)
dropped the vertical-template layer entirely: there is no `Template`
model, no per-industry picker, no config abstraction standing between
"core engine" and "one bot's own config." A future vertical is a direct
code/config change to the engine when it's actually needed, reviewed
like any other change — not authored against a generic template schema.
The categories below are a mental checklist for that review, nothing
more:

- **Core platform** (reusable, belongs in shared engine code): agent
  runtime, orchestration, knowledge/RAG, memory/context, tools/actions,
  model routing, channels, analytics, human handoff, auth, orgs,
  permissions, configuration system.
- **Vertical capability** (industry-specific data/concepts — belongs in
  that bot's own config, never a shared-code branch): e.g. healthcare —
  patient, doctor, appointment, triage, referral, prescription, EHR;
  ecommerce — customer, product, cart, order, shipment, return.

If a change needs a `Template` model, a per-industry picker, or any new
abstraction layer to express this split, that's re-litigating ADR 0019 —
flag it and ask, don't build it on the strength of this section alone.
Today's actual mechanism for "configurability per vertical" is the
existing persona-template picker (3 hardcoded ecommerce personas,
`docs/features.md`) plus each bot's own ordinary config — that's the
real, current answer to "how do templates work here," not a future
layer to build.

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
this document alone: rebuild the app, create a separate vertical-specific
platform for any industry, hard-code any vertical's concepts into the
core engine, build or revive a vertical-template/`Template` data layer
(ADR 0019 stays in force — see above), start healthcare work before
`docs/open-questions.md` #2 is answered, implement every competitor
feature, implement future phases early, or replace working architecture
without a clear reason. Read this file, identify the current phase, then
read only the relevant existing project docs before changing anything.
