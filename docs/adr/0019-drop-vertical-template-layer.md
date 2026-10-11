# ADR 0019: Drop the vertical-template layer — verticals are code changes

Status: accepted

Date: 2026-09-27

## Context

ADR 0001 committed to a generic core plus a **vertical-template layer**: a
data/config layer that would pre-fill persona, tool subset, and compliance
notes per industry (ecommerce, healthcare, automotive, ...), picked at
setup and editable afterward. No part of that layer was ever actually
built — there is no `Template` model, no template picker UI, no
industry-scoped default set anywhere in the codebase today (confirmed
against `prisma/schema.prisma` and `docs/features.md`'s Built list). The
only concrete vertical touched at all is v1's own ecommerce defaults, which
live as ordinary bot config, not as a named "template."

The user's explicit call (2026-09-27): stop planning for a pluggable
template mechanism. When a genuinely new vertical is needed, build it as a
direct code/config change against the one real codebase at that time,
instead of maintaining a generic abstraction whose only consumer so far is
hypothetical. This needs recording because it reverses a decision ADR 0001
called "the whole point" of the generic-base design, and because it
changes what CLAUDE.md guardrail #2 ("no vertical-specific logic in the
core engine") is actually protecting against going forward.

## Decision

There is no vertical-template abstraction. The product is one codebase,
generic by default because that's what the ecommerce use case needs today,
not because a template mechanism enforces it. A second vertical, if and
when one is actually built, is implemented as a normal feature: new bot
config fields, new default copy, new guardrail prompts, new tools — added
directly to the engine/config as code, reviewed and shipped like any other
change, not authored as data against a generic template schema.

CLAUDE.md guardrail #2 and its `check:vertical` script stay in place
unchanged for now: avoiding `if industry == "healthcare"` branches in
shared request-handling code is still good hygiene on its own merits (it's
what keeps a second vertical's code changes contained and reviewable), not
because a template system requires it. If a real second vertical later
proves that guardrail actively wrong for how the code needs to branch,
that's a new decision to make then, with real code in front of us — not
pre-decided here.

## Alternatives considered

- **Keep ADR 0001's plan, build the template layer now** — rejected: it's
  speculative generality for a consumer (a second vertical) that doesn't
  exist yet; nothing about it has been validated by a real second use
  case, and building it first risks shaping the abstraction around guesses
  instead of a real requirement.
- **Keep the template *concept* but defer only the UI** (i.e. still model
  "vertical" as data, just without a picker) — rejected: a config
  distinction with no second value to distinguish from is not doing any
  work; it's the same speculative abstraction with extra steps.
- **Drop guardrail #2 entirely along with the template layer** — rejected:
  the guardrail's value (keeping vertical-specific behavior out of shared
  core paths) doesn't depend on a template system existing; it's a
  reviewability property worth keeping independent of this decision.

## Consequences

- Onboarding a new vertical is now "modify the engine" (code), the exact
  opposite of ADR 0001's stated goal — that reversal is the point of this
  ADR, not an accidental side effect.
- Removes a planning dependency: `docs/roadmap.md`'s "Later" item "Second
  vertical template: healthcare" and `docs/open-questions.md` #2
  (compliance posture for regulated verticals) are no longer blocked on a
  template mechanism being designed first — when healthcare work actually
  starts, it starts as a normal feature branch with its own guardrail
  prompts baked in per CLAUDE.md guardrail #3, not as "author a template."
- Hard to reverse in practice, not in principle: nothing built depends on
  the template layer existing (it was never implemented), so there's no
  migration cost today. The real cost of reversing this later is
  re-litigating the same generality-vs-speed tradeoff once a second
  vertical is actually being built, with less patience to slow down and
  design an abstraction at that point than there is now.
- Supersedes ADR 0001's "Decision" and "Consequences" sections on the
  template layer specifically; ADR 0001's other content (generic data
  model, no `if industry ==` branches in the engine) still holds and is
  restated here as guardrail #2, now justified on its own terms rather
  than as scaffolding for templates.
