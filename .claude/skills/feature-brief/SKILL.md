---
name: feature-brief
description: Scope a feature before writing any code, and get the user's explicit sign-off before implementation starts. Use before starting any medium-or-larger build (a new feature, a new console page/section, a schema change, a multi-file change, anything pulled from docs/roadmap.md) — not for small fixes (a single bug fix, a copy/doc-only edit, a dependency bump, a one-file change with no new user-facing behavior or schema).
---

# Feature brief

1. **Decide small vs. medium-or-larger first.** Small — skip this skill
   entirely and build directly: a single bug fix, a doc-only edit, a
   copy/text change, a dependency bump, a test-only addition, or a
   one-file/one-function change that adds no new schema, API surface,
   or user-facing behavior. Medium-or-larger — everything else: a new
   feature or console page/section, a Prisma schema change, a new tool/
   integration, a multi-file change, anything pulled from
   `docs/roadmap.md`'s Next/Later lists, or any request phrased as
   "build X" / "implement X" where X isn't already a fully-specified,
   single-file change. When genuinely unsure which bucket a task falls
   in, treat it as medium — the cost of a short brief is low, the cost
   of building the wrong thing is not.

2. **Ground the brief in real investigation, not assumption**, per
   CLAUDE.md's "read the primary source" rule: check
   `docs/roadmap.md`/`docs/open-questions.md` for existing scoping
   notes, `docs/design/preview/` for any existing mockup, and real
   competitor behavior (via REA, a live product, or their actual docs)
   when the feature matches a competitor concept — never a summary or a
   guess. A 10-minute check that replaces speculation with a verified
   fact is worth it every time — see ADR 0041's Nudges scoping (REA
   against Chatbase's real `embed.min.js`) as the model to follow.

3. **Write the brief and present it in chat** — not a new file, this is
   a short-lived scoping artifact, not a durable record. (A resulting
   hard-to-reverse decision still gets its own ADR via the `new-adr`
   skill once sign-off happens — that's a separate, permanent record of
   *why*, not a replacement for this.) Cover:
   - **Problem** — what's actually broken or missing, in plain terms.
   - **Scope, this pass** — the smallest real version that's actually
     useful, not the maximal one.
   - **Explicitly out of scope** — named, not implied by omission.
   - **Acceptance criteria** — the concrete, checkable things that mean
     it's done (these become the tests to write).
   - **Open questions / assumptions** — anything about to be decided on
     the user's behalf; flag it instead of deciding silently.
   - **Real tradeoffs**, if more than one reasonable approach exists —
     explained in plain terms before any question is asked, per
     CLAUDE.md's "explain, then ask" process rule.

4. **Stop and get explicit sign-off before writing any code.** Use
   `AskUserQuestion` when there's a real choice to make (scope options,
   which approach), or a direct yes/no confirmation when there's one
   proposed scope. A reaction to the original request ("let's build X")
   is not sign-off on a brief that hasn't been shown yet — the brief
   itself needs its own explicit go-ahead. Do not start implementation,
   create a migration, or write a line of application code before this
   lands.

5. **After sign-off**, proceed with the project's normal build
   discipline — `new-adr` for any hard-to-reverse decision inside the
   now-approved scope, real verification before committing (CLAUDE.md's
   "never commit code that hasn't actually been run"), and
   `ship-checklist` before calling it done.

Skipping this for something that turns out to be medium-or-larger is
itself a real miss — if partway through a "small" task it grows into a
new page, a schema change, or new user-facing behavior, stop and run
this skill before continuing, rather than finishing it uncovered.
