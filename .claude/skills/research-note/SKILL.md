---
name: research-note
description: Capture non-trivial research (competitor analysis, library/vendor evaluation, architecture pattern comparison) into docs/research/ for the Chatter project, instead of leaving it only in chat scrollback. Use whenever research is done to inform a product or architecture decision.
---

# Research note

1. Check `docs/research/` for an existing note on the same topic — extend
   it (add a dated section, update the TODO list) rather than creating a
   near-duplicate file.
2. If it's a new topic, create `docs/research/<short-topic-slug>.md` with:
   - Date and what prompted the research
   - Findings, organized by source/subject, written so a future session
     with no memory of this conversation can use them
   - An explicit "Implication for us" note connecting findings back to a
     product or architecture decision — research without a stated
     implication is not useful here
   - Sources as a plain list of URLs at the bottom (or per-section, for
     longer notes)
   - A "TODO — still need to research" section for anything left uncovered,
     so gaps are visible rather than silently dropped
3. Use WebSearch/WebFetch for anything beyond training-data knowledge —
   this product space (competitors, pricing, feature sets) moves fast
   enough that recall alone isn't trustworthy.
4. If a finding resolves or informs an entry in `docs/open-questions.md`,
   reference it there rather than letting the two documents disagree.
