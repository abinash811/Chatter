import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getEmbeddingsProvider } from "@/lib/ai/embeddings";

// Real bug this pass fixed: ingestion used to call embed() once per
// chunk in a loop (N HTTP round trips for an N-chunk document). Voyage's
// embeddings endpoint accepts up to 128 texts per request (confirmed via
// WebSearch, not recalled) — these tests exist to prove embedBatch()
// actually uses that, including the split at the 128 boundary, not just
// that it compiles.

function mockFetchOnce(embeddings: number[][]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: embeddings.map((embedding) => ({ embedding })) }),
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetchOnce([]));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VoyageEmbeddingsProvider.embedBatch", () => {
  it("returns an empty array without calling fetch for an empty input", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getEmbeddingsProvider().embedBatch([]);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends every text in one request when under the 128 limit", async () => {
    const fetchMock = mockFetchOnce([[0.1], [0.2], [0.3]]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await getEmbeddingsProvider().embedBatch(["a", "b", "c"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.input).toEqual(["a", "b", "c"]);
    expect(result).toEqual([[0.1], [0.2], [0.3]]);
  });

  it("splits into multiple requests at the 128-text boundary, preserving order", async () => {
    const texts = Array.from({ length: 150 }, (_, i) => `chunk-${i}`);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: texts.slice(0, 128).map((_, i) => ({ embedding: [i] })) }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: texts.slice(128).map((_, i) => ({ embedding: [128 + i] })) }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getEmbeddingsProvider().embedBatch(texts);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).input).toHaveLength(128);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).input).toHaveLength(22);
    expect(result).toHaveLength(150);
    expect(result[0]).toEqual([0]);
    expect(result[149]).toEqual([149]);
  });

  it("throws with the response status when a request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(getEmbeddingsProvider().embedBatch(["a"])).rejects.toThrow(/500/);
  });
});

describe("VoyageEmbeddingsProvider.embed", () => {
  it("returns the single embedding for one text (implemented via embedBatch)", async () => {
    const fetchMock = mockFetchOnce([[0.5, 0.6]]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await getEmbeddingsProvider().embed("hello");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).input).toEqual(["hello"]);
    expect(result).toEqual([0.5, 0.6]);
  });
});
