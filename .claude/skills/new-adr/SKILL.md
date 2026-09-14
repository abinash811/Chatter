---
name: new-adr
description: Record a hard-to-reverse architecture decision for the Chatter project as an ADR. Use whenever a decision is made about data model shape, storage/vendor choice, auth model, multi-tenancy strategy, or any other decision that would be expensive to reverse later — per CLAUDE.md's process rules.
---

# New ADR

1. Read `docs/adr/template.md` and the most recent ADR in `docs/adr/` to
   match numbering (next sequential 4-digit number) and tone.
2. Write the new ADR to `docs/adr/NNNN-short-kebab-title.md` following the
   template sections: Context, Decision, Alternatives considered,
   Consequences.
   - Context should explain *why this needed a recorded decision*, not just
     restate the decision.
   - Alternatives considered must include real options that were on the
     table, with a one-line reason each was passed over — not a strawman.
   - Consequences must say plainly if this is hard to reverse.
3. If the decision resolves an entry in `docs/open-questions.md`, remove
   that entry from the file.
4. If the decision changes or extends the system design, update
   `docs/architecture.md` to reflect it — the architecture doc should never
   drift from what the ADRs actually say.
5. Do not mark an ADR "accepted" on behalf of the user if the decision was
   proposed by Claude rather than confirmed by the user — use status
   "proposed" and ask, unless the user's message already constitutes clear
   approval.
