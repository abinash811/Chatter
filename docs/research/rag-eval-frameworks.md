# Research note: RAG eval frameworks (RAGAS, DeepEval, TruLens, LangSmith)

Date: 2026-09-27
Researcher: Claude (primary sources — each project's own GitHub repo
README fetched directly, not summarized from search results; LangSmith's
docs.langchain.com is blocked by this environment's egress proxy, so its
findings are from its GitHub repo + WebSearch on real, dated announcements)
Status: enough to decide the eval-harness build; a first-hand trial of
DeepEval or LangSmith is still TODO if either is revisited later.

## Why this research

`docs/ai-tech-radar.md`'s own note said "adopt an open-source framework
rather than hand-roll... re-check current practice before picking, per
CLAUDE.md." This is that check — done against each project's real repo,
per the standing rule added the same day (CLAUDE.md's "read the primary
source before writing implementation code for any RAG/AI work").

## Findings, by project (primary source: their own README)

**RAGAS** (`explodinggradients/ragas`) — Python only (`pip install
ragas`), quickstart examples default to OpenAI's client
(`AsyncOpenAI`) for the LLM judge. The fetched README excerpt didn't
enumerate its retrieval-specific metrics (context precision/recall are
real RAGAS metrics per its wider docs, just not in the fetched excerpt).

**DeepEval** (`confident-ai/deepeval`) — Python only (`Python>=3.9`,
`pip install -U deepeval`). Best fit of the three on paper: explicit,
documented Anthropic/Claude support (not just OpenAI-default), and
exactly the retrieval-quality metrics this project would want —
Contextual Precision, Contextual Recall, Contextual Relevancy — alongside
generation-quality ones (Answer Relevancy, Faithfulness). Pytest-like
API (`assert_test`, `LLMTestCase`).

**TruLens** (`truera/trulens`) — Python only, pip-installable. Claude
support via `trulens-providers-litellm` (an indirection layer, not
native). Strong maintenance signals (active CI, enterprise adopters
cited in its own README). RAG Triad metrics: Groundedness, Context
Relevance, Answer Relevance.

**LangSmith** (`langchain-ai/langsmith-sdk`, `js/` directory) — the one
project with a real TypeScript SDK (`langsmith` on npm). But it's not a
standalone library: it requires a LangSmith account, and evaluation runs
report to LangSmith's cloud service by default. True self-hosting exists
but is Enterprise-plan-only (Kubernetes/Docker) — not a fit for adding a
lightweight eval check to a small project.

## Implication for us

None of the four is a clean fit for "measure retrieval quality against
our own data, locally, without a new language or a new vendor account."
Also confirmed (via WebSearch on real practice, not the frameworks'
own docs) that real teams evaluate retrieval and generation *separately*
— which matches our actual situation exactly: generation can't be
evaluated yet at all (no real `ANTHROPIC_API_KEY`), but retrieval can be,
today.

Decision (recorded in `docs/ai-tech-radar.md` and ADR-less since it's a
reversible, low-stakes choice — not data model/vendor/auth/multi-tenancy
per CLAUDE.md's ADR criteria): hand-roll the retrieval-metrics harness in
TypeScript. Precision@K, Recall@K, and Mean Reciprocal Rank are
unambiguous, decades-old information-retrieval formulas — not something
a vendor's API surface can drift on the way library code can — so
"hand-rolled" here isn't a shortcut, it's the same call ADR 0013 already
made for chunking (hand-rolled beat LangChain/LlamaIndex after real
benchmarking). Revisit DeepEval specifically (native Claude support,
exact metrics) once a real `ANTHROPIC_API_KEY` makes end-to-end
answer-quality evaluation (faithfulness, answer relevancy) actually
buildable — that's the capability none of these four earn their
Python-toolchain cost for today.

## TODO — still need to research

- A first-hand trial of DeepEval against a real `ANTHROPIC_API_KEY`,
  once one exists, to see whether its Python toolchain cost is worth it
  once end-to-end evaluation is actually possible.
- LangSmith's actual pricing at low volume (the docs page describing
  this is blocked in this environment) — relevant only if self-hosting
  or a paid plan is reconsidered later.

## Sources

- https://raw.githubusercontent.com/explodinggradients/ragas/main/README.md
- https://raw.githubusercontent.com/confident-ai/deepeval/main/README.md
- https://raw.githubusercontent.com/truera/trulens/main/README.md
- https://github.com/langchain-ai/langsmith-sdk/blob/main/js/README.md
- https://docs.langchain.com/langsmith/self-hosted (via WebSearch summary only — direct fetch blocked)
