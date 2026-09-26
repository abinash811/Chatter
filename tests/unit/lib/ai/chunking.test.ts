import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/ai/chunking";

describe("chunkText", () => {
  it("returns an empty array for empty/whitespace-only input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("returns a single chunk for short text — no splitting needed", () => {
    const text = "This is a short knowledge base document.";
    expect(chunkText(text)).toEqual([text]);
  });

  it("splits long text into multiple chunks, each within the size bound", () => {
    const paragraph = "Sentence number goes here. ".repeat(100); // ~2800 chars
    const longText = Array.from({ length: 6 }, (_, i) => `Paragraph ${i}: ${paragraph}`).join("\n\n");

    const chunks = chunkText(longText);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // Soft cap is CHUNK_SIZE + OVERLAP (2200) — never wildly exceeded.
      expect(chunk.length).toBeLessThanOrEqual(2200);
    }
  });

  it("carries a real overlap between consecutive chunks", () => {
    const paragraph = "Alpha bravo charlie delta echo foxtrot golf hotel. ".repeat(80);
    const longText = Array.from({ length: 4 }, (_, i) => `P${i}: ${paragraph}`).join("\n\n");

    const chunks = chunkText(longText);
    expect(chunks.length).toBeGreaterThan(1);

    for (let i = 1; i < chunks.length; i++) {
      const prevTail = chunks[i - 1].slice(-100);
      expect(chunks[i]).toContain(prevTail.slice(-50));
    }
  });

  it("hard-cuts a single run-on sentence with no punctuation that alone exceeds the chunk size", () => {
    const noPunctuation = "word ".repeat(1000); // ~5000 chars, one giant "sentence"
    const chunks = chunkText(noPunctuation);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toContain("word");
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(2200);
    }
  });

  it("preserves paragraph boundaries when a paragraph fits within the chunk size", () => {
    const text = "First paragraph, short.\n\nSecond paragraph, also short.";
    expect(chunkText(text)).toEqual([text]);
  });
});
