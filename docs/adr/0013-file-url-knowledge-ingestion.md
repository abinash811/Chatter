# ADR 0013: File/URL knowledge ingestion — libraries, chunking, scope, processing model

Status: accepted

Date: 2026-09-26

## Context

Manual Q&A ingestion (`lib/ai/knowledgeBase.ts`, shipped separately)
closed the "nothing to retrieve" gap for `search_knowledge_base`, but
`docs/product-spec.md`'s MVP scope is "file upload and/or manual Q&A at
minimum for v1" — file/URL ingestion was still the remaining piece.
`KnowledgeSource.kind` already reserved `"file"`/`"url"` for this; no
schema change was needed.

This needed four real decisions, not one:
1. Which libraries extract text from a PDF, a DOCX, and a fetched URL's
   HTML — a "check current practice, don't recall it" call per
   CLAUDE.md, captured first in `docs/research/knowledge-ingestion-
   libraries.md`.
2. A chunking strategy — manual Q&A never needed one (one pair is
   already the right retrieval unit), but a whole document isn't.
3. File-type scope for v1: PDF + `.txt`/`.md` were the research-backed
   default; DOCX was explicitly flagged as unresearched. The user chose
   to add DOCX now rather than defer it.
4. Processing model: run ingestion synchronously in the server action
   (matching manual Q&A's existing shape, and Chatter's stack — no job
   queue exists anywhere in this codebase), or introduce a background
   job. The user chose synchronous with size limits — the research note
   had flagged this as unresearched and deferred it to this ADR.

Site crawling (multi-page, link-following) is explicitly **not** in
scope here — that stays `docs/open-questions.md` #4, a separate,
deferred decision. This ADR covers single-file-upload and
single-URL-fetch only.

## Decision

- **PDF**: `pdf-parse` v2.4.5 (`new PDFParse({ data: buffer }).getText()`,
  `.destroy()` after). Recently revived (Oct 2025 rewrite under new
  maintainership after 7 years dormant at v1.1.1) but genuinely active —
  worth a sanity check if revisited much later. `unpdf` was the
  alternative for edge/serverless runtimes, not needed since ingestion
  runs in a normal Next.js server action.
- **DOCX**: `mammoth` v1.12.3, `extractRawText({ buffer })`. Added in
  this pass at the user's explicit choice, extending the research note's
  original PDF/txt/md-only scope.
- **`.txt`/`.md`**: read directly (`buffer.toString("utf8")`), no
  library.
- **URL → readable text**: `jsdom` v30.1.1 + `@mozilla/readability`
  v0.6.0 — fetch the URL, build a `JSDOM` document, `new
  Readability(document).parse()`.
- **Chunking**: hand-rolled recursive splitter (`lib/ai/chunking.ts`) —
  paragraph → sentence → hard character-cutoff fallback, ~2000
  chars/~500 tokens per chunk, ~200 char/~10% overlap. Not LangChain/
  LlamaIndex. Grounded in 2026 RAG chunking benchmarks (firecrawl.dev:
  recursive splitting at 512 tokens hit 69% accuracy, beating both naive
  fixed windows and embedding-similarity "semantic chunking," which
  underperformed at 54%).
- **Processing model**: synchronous, inside the same server action
  pattern manual Q&A already uses, with hard limits instead of a
  background job: `MAX_FILE_BYTES` (5MB, `lib/ai/extraction.ts`) rejects
  an oversized upload before extraction even runs, and `MAX_CHUNKS` (200,
  `lib/ai/knowledgeBase.ts`) rejects a document that would still expand
  into too many sequential embeddings calls after chunking — a small
  file can still contain a lot of extractable text. `next.config.js`'s
  `experimental.serverActions.bodySizeLimit` raised to `6mb` (headroom
  over the app-level 5MB check, so our own plain-language error fires
  first).
- **Embeddings happen outside the DB transaction.** `withOrgContext`
  wraps its callback in `prisma.$transaction` — sequentially embedding
  every chunk *inside* that transaction would hold it open (and risk
  Prisma's default transaction timeout) for as long as the embeddings
  provider takes across every chunk. All chunks are embedded first, then
  a single transaction creates the source and writes every chunk +
  its raw-SQL vector update. `createQaEntry` already had this shape for
  its one chunk; this generalizes it.
- **Basic SSRF guard on URL ingestion** (`assertPublicHttpUrl` in
  `lib/ai/extraction.ts`): only `http`/`https`, and the literal hostname
  is checked against `localhost`/loopback/private/link-local ranges
  before ever fetching. This is a real security decision worth recording
  even though it's a small piece of this ADR — the console is behind
  auth, but a business owner pasting (or a compromised console session
  supplying) an internal URL should still not cause the server to fetch
  it.
- Table UI generalizes from Q&A-only to all three kinds: `Title | Type |
  Chunks | Created`, with an "Add" `DropdownMenu` (Add Q&A / Upload file
  / Add URL) instead of a single button, since there are now three entry
  points instead of one. `listQaEntries`/`deleteQaEntry` renamed to
  `listKnowledgeSources`/`deleteKnowledgeSource` to reflect that they're
  no longer qa-specific — `deleteQaEntry` was never actually qa-specific
  in its logic, only its name was.

## Alternatives considered

- **Background job/queue for ingestion** — rejected for v1: no job
  queue/worker exists anywhere in this codebase yet, and introducing one
  (plus a status-polling UI) is a materially bigger scope increase than
  this feature alone justifies. Revisit if a real business hits the size
  limits in practice.
- **`unpdf` over `pdf-parse`** — rejected: it's the better choice
  specifically for edge/serverless runtimes; Chatter's ingestion runs in
  a normal Next.js server action, not an edge runtime.
- **Semantic (embedding-similarity) chunking** — rejected per the
  research note's benchmark citation: it underperformed recursive
  splitting in 2026 RAG accuracy benchmarks despite being the more
  complex approach.
- **LangChain/LlamaIndex for chunking** — rejected: pulling a full
  framework in for one splitting function is the kind of premature
  abstraction the project's engineering rules already warn against.
- **DNS-resolution-based SSRF guard** (resolve the hostname, check the
  actual IP, pin it for the fetch) — rejected for v1 as more than this
  feature's scope justifies; the literal-hostname check catches the
  obvious cases (localhost, private ranges) but not DNS rebinding or a
  malicious redirect target. Documented as a known gap in
  `docs/security.md`, not silently assumed complete.

## Consequences

- A document needing more than ~200 chunks (~400K characters after
  extraction) must be split by the business owner into smaller
  uploads — there's no automatic splitting or background processing.
  Easy to revisit later (raise `MAX_CHUNKS`, or add a real job queue)
  without a breaking change, since the API shape (`createFileEntry`/
  `createUrlEntry`) doesn't change either way.
- The SSRF guard is a real but partial mitigation — it stops the naive
  cases, not a determined attacker abusing DNS rebinding or redirects.
  Acceptable for v1 given this is an authenticated console feature, not
  a public endpoint, but worth hardening before this ever becomes
  business-critical or the console's trust boundary changes.
- `mammoth` (DOCX) is a new dependency added specifically because the
  user chose to include DOCX in v1 rather than defer it — if that
  decision is ever revisited, removing DOCX support means dropping
  `mammoth` and `detectFileKind`'s docx branch, not a schema change
  (`KnowledgeSource.kind` stays `"file"` regardless of the underlying
  file type).
- Renaming `listQaEntries`/`deleteQaEntry` is a breaking change to
  `lib/ai/knowledgeBase.ts`'s exported API — both call sites (the
  knowledge page and its actions) are updated in the same change, so
  nothing is left half-migrated.
