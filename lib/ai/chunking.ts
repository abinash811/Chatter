// Recursive text splitter for file/URL knowledge ingestion — manual Q&A
// (lib/ai/knowledgeBase.ts's createQaEntry) needs no chunking since one
// pair is already the right retrieval unit; a whole document isn't.
//
// ~500 tokens (~2000 chars, ~4 chars/token) per chunk, ~10% (~200 char)
// overlap between consecutive chunks. Paragraph -> sentence -> hard
// character cutoff fallback. Deliberately hand-rolled, not LangChain/
// LlamaIndex — see docs/research/knowledge-ingestion-libraries.md and
// ADR 0013 for the benchmarks this is grounded in (recursive splitting
// at ~512 tokens outperformed both naive fixed windows and embedding-
// similarity "semantic chunking" in 2026 RAG benchmarks).

const CHUNK_SIZE = 2000;
const OVERLAP = 200;

function splitIntoUnits(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const units: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= CHUNK_SIZE) {
      units.push(paragraph);
      continue;
    }
    // Paragraph alone exceeds the chunk size — split into sentences.
    const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(Boolean);
    for (const sentence of sentences) {
      if (sentence.length <= CHUNK_SIZE) {
        units.push(sentence);
        continue;
      }
      // Even a single sentence exceeds the chunk size (e.g. no
      // punctuation at all) — hard character cutoff, last resort.
      for (let i = 0; i < sentence.length; i += CHUNK_SIZE) {
        units.push(sentence.slice(i, i + CHUNK_SIZE));
      }
    }
  }
  return units;
}

function overlapTail(chunk: string): string {
  return chunk.length <= OVERLAP ? chunk : chunk.slice(chunk.length - OVERLAP);
}

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const units = splitIntoUnits(normalized);
  const chunks: string[] = [];
  let current = "";

  for (const unit of units) {
    const candidate = current ? `${current}\n\n${unit}` : unit;
    if (candidate.length <= CHUNK_SIZE) {
      current = candidate;
      continue;
    }
    chunks.push(current);
    const tail = overlapTail(current);
    const withTail = tail ? `${tail}\n\n${unit}` : unit;
    // Guard against overlap pushing the new chunk far past the target
    // size (only happens if `unit` itself is close to CHUNK_SIZE) —
    // drop the overlap rather than let chunks balloon.
    current = withTail.length <= CHUNK_SIZE + OVERLAP ? withTail : unit;
  }
  if (current) chunks.push(current);
  return chunks;
}
