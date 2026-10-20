import { describe, it, expect } from "vitest";
import { precisionAtK, recallAtK, reciprocalRank, mean } from "@/lib/eval/retrievalMetrics";

describe("precisionAtK", () => {
  it("is the fraction of the top-k results that are relevant", () => {
    expect(precisionAtK(["a", "b", "c"], ["a", "c"], 3)).toBeCloseTo(2 / 3);
  });

  it("only looks at the top k, not the whole retrieved list", () => {
    expect(precisionAtK(["a", "b", "c", "d"], ["d"], 2)).toBe(0);
  });

  it("is 0 for an empty retrieved list, not NaN", () => {
    expect(precisionAtK([], ["a"], 5)).toBe(0);
  });
});

describe("recallAtK", () => {
  it("is the fraction of all relevant items found within the top k", () => {
    expect(recallAtK(["a", "x", "y"], ["a", "b"], 3)).toBeCloseTo(0.5);
  });

  it("is 0 when there are no relevant items for a query, not NaN", () => {
    expect(recallAtK(["a", "b"], [], 5)).toBe(0);
  });

  it("only credits relevant items that appear within the top k", () => {
    expect(recallAtK(["x", "y", "a"], ["a"], 2)).toBe(0);
  });
});

describe("reciprocalRank", () => {
  it("is 1 when the first result is relevant", () => {
    expect(reciprocalRank(["a", "b"], ["a"])).toBe(1);
  });

  it("is 1/rank for the first relevant result found further down the list", () => {
    expect(reciprocalRank(["x", "y", "a"], ["a"])).toBeCloseTo(1 / 3);
  });

  it("is 0 when no relevant result appears anywhere in the list", () => {
    expect(reciprocalRank(["x", "y"], ["a"])).toBe(0);
  });
});

describe("mean", () => {
  it("averages a list of scores", () => {
    expect(mean([1, 0, 0.5])).toBeCloseTo(0.5);
  });

  it("is 0 for an empty list, not NaN", () => {
    expect(mean([])).toBe(0);
  });
});
