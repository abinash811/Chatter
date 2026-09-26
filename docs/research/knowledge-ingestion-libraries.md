# Research note: File/URL knowledge ingestion — libraries and chunking

Date: 2026-09-26
Researcher: Claude (WebSearch + `npm view`, via a research subagent)
Status: grounds the file/URL knowledge ingestion feature (extends manual
Q&A ingestion, `docs/business-logic.md`)

## Why this research

Manual Q&A ingestion shipped first (one Q&A pair = one chunk, no real
chunking needed). File/URL ingestion is the remaining MVP scope from
`docs/product-spec.md`'s "file upload and/or manual Q&A at minimum for
v1" — **not** site crawling (multi-page, link-following), which stays a
separate, deferred question (`docs/open-questions.md` #4). This needed
three real technical choices — a PDF text extractor, a URL→readable-text
approach, and a chunking strategy — none of which should be picked from
training-data recall per CLAUDE.md's "check current practice" rule.

## 1. PDF text extraction

**Pick: `pdf-parse` v2.4.5** (real version, checked via `npm view
pdf-parse version`).

Notable and worth recording for future maintainers: this package sat
dormant at v1.1.1 since 2018 (7 years, effectively abandoned), then in
October 2025 a new maintainer (`mehmet.kozan`) took it over and
published a full rewrite as the 2.x line (2.1.1 → 2.4.5), now described
as "Pure TypeScript, cross-platform module for extracting text, images,
and tabular data from PDFs. Run directly in your browser or in Node!"
It's genuinely actively maintained again under new ownership — not a
stale zombie package — but this is a very recent takeover, worth a
sanity check if revisited much later.

Alternatives considered:
- `unpdf` (v1.8.1, checked) — modern, no-native-deps, built for
  serverless/edge runtimes (Vercel, Cloudflare Workers), avoids
  `pdf-parse`'s old canvas-dependency crash issues in those
  environments. **Not chosen** because Chatter's ingestion runs in a
  normal Next.js server action, not an edge runtime — but this is the
  better pick if ingestion ever moves to edge.
- `pdfjs-dist` (v6.3.289, checked) — Mozilla's full PDF renderer,
  heavier, needed only if we want more than plain text (rendering,
  annotations). Not needed here.
- `pdf2json` (v4.1.0) — niche/older API, not chosen.

## 2. URL → readable article text

**Pick: `jsdom` + `@mozilla/readability`** — still the current standard
pairing, confirmed via multiple 2026 sources, no credible indication
it's been displaced.

- `@mozilla/readability` v0.6.0 (last published March 2025, but its
  GitHub repo shows active development through mid-2026 — a mature,
  low-churn library, not abandoned).
- `jsdom` v30.1.1 (checked, very actively maintained).
- Pattern: fetch the URL's HTML, build a `JSDOM` document from it, hand
  it to `new Readability(document).parse()` to get just the article
  content (not nav/ads/footer chrome).
- `linkedom` (v0.18.13) is a lighter/faster alternative for parse-only
  use, but isn't commonly documented as paired with Readability
  specifically — not chosen.

## 3. Chunking strategy (hand-rolled, no framework)

Deliberately not pulling in LangChain/LlamaIndex just for chunking.
Per multiple 2026 benchmark write-ups (firecrawl.dev's RAG chunking
benchmark, premai.io, a Databricks community blog, digitalapplied.com,
Azure's own chunking guidance, and a January 2026 SPLADE+Mistral-8B
systematic analysis):

- **Chunk size**: 256–512 tokens is the practical range; 512 tokens is
  repeatedly cited as the benchmark-validated default (NVIDIA and Azure
  benchmarks both cited). Larger analytical queries benefit from
  512–1024 tokens; simple factoid Q&A does fine at 256–512 — Chatter's
  knowledge base is mostly factoid/FAQ-style lookups via
  `search_knowledge_base`, so ~500 tokens is the right target.
- **Overlap**: commonly cited as 10–25% of chunk size (Azure's own
  guidance: 512 tokens with ~128-token/25% overlap) — but this is
  genuinely contested: a January 2026 systematic analysis found overlap
  gave no measurable benefit and only added indexing cost. Given the
  contested evidence, a modest ~10% overlap (not the more aggressive
  25%, not zero) is the reasonable middle ground.
- **Recursive/structural splitting** (paragraph → sentence → hard
  character-cutoff fallback) is still preferred over both naive
  fixed-character windows *and* embedding-similarity-based "semantic
  chunking." The firecrawl.dev 2026 benchmark found recursive character
  splitting at 512 tokens hit 69% end-to-end accuracy, outperforming
  both naive fixed windows and semantic chunking (54% accuracy, average
  43-token fragments — semantic chunking underperformed despite being
  the more complex approach).
- Also noted: a "context cliff" around ~2500 tokens where quality drops
  if chunks are ever concatenated for context — not immediately
  relevant since `search_knowledge_base` already caps results at 5
  chunks, but worth remembering if that cap ever changes.

## Implication for us

Implementation choices for Chatter's file/URL ingestion:
- Hand-roll a recursive text splitter: paragraph → sentence → hard
  character-cutoff fallback, ~500 tokens (~2000 characters, ~4
  chars/token) per chunk, ~10% (~200 character) overlap between
  consecutive chunks.
- `pdf-parse` for PDF file uploads; `.txt`/`.md` files need no library
  (read directly).
- `jsdom` + `@mozilla/readability` for URL ingestion.
- All three packages' versions must be re-verified with `npm view` at
  actual install time — this note's versions are current as of the
  research date and could drift before implementation lands.
- This is explicitly single-file / single-URL ingestion, not crawling —
  `docs/open-questions.md` #4 (site crawling) is unaffected by this
  research and remains a separate, deferred decision.

## Update (2026-09-26) — DOCX and processing model resolved in ADR 0013

Both open items below were resolved by explicit user choice (not by
further research) once presented plainly, and are recorded in
`docs/adr/0013-file-url-knowledge-ingestion.md`:

- **DOCX**: added to v1 scope. `mammoth` v1.12.3 (real version checked
  via `npm view`) is the library — confirmed via its own README, not
  just recalled, that `mammoth.extractRawText({ buffer })` (no file
  path needed) returns `{ value, messages }`, matching the same
  Buffer-in pattern `pdf-parse` uses. Verified for real against a
  bundled fixture (`node_modules/mammoth/test/test-data/simple-
  list.docx`) before being committed to a unit test.
- **Processing model**: synchronous, with hard limits (`MAX_FILE_BYTES`
  5MB before extraction, `MAX_CHUNKS` 200 after chunking) — no
  background job/queue, since none exists anywhere in this codebase yet
  and building one is a bigger scope increase than this feature alone
  justifies. Revisit if a real business hits these limits in practice.

## TODO — still need to research

- Other office formats beyond DOCX (e.g. `.pptx`, `.xlsx`), if ever
  added — not researched.
- A background job/queue, if the synchronous size limits above turn out
  to be too restrictive in practice — not researched (no candidate
  library evaluated; this codebase has no job queue of any kind yet, so
  this would also need an infra/architecture decision, not just a
  library pick).

## Sources

- npmjs.com package pages: `pdf-parse`, `unpdf`, `pdfjs-dist`,
  `pdf2json`, `@mozilla/readability`, `jsdom`, `linkedom`
- github.com/mehmet-kozan/pdf-parse
- github.com/mozilla/readability
- strapi.io's 2026 PDF-parsing-libraries roundup
- pkgpulse.com PDF library comparisons
- chudi.dev's unpdf-vs-pdf-parse writeup
- firecrawl.dev/blog/best-chunking-strategies-rag
- premai.io RAG chunking benchmark guide
- Databricks community chunking blog
- digitalapplied.com RAG chunking playbook
- oneuptime.com overlap-strategies post
