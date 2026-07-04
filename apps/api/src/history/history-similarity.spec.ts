import {
  DEFAULT_DUPLICATE_WARNING_THRESHOLD,
  computeSimilarity,
  findBestSimilarityMatch,
  matchesSearchQuery,
  tokenize,
} from "./history-similarity";

describe("history similarity", () => {
  it("normalizes accents, casing and insignificant punctuation", () => {
    expect([...tokenize("Éditorial: IA, acquisition!")]).toEqual([
      "editorial",
      "acquisition",
    ]);
  });

  it("computes a stable token overlap score", () => {
    expect(
      computeSimilarity(
        "Production contenu IA pour acquisition",
        "Acquisition par contenu ia",
      ),
    ).toBe(0.4);
  });

  it("selects the closest candidate", () => {
    const match = findBestSimilarityMatch("activation produit onboarding", [
      {
        id: "low",
        text: "veille marche",
        title: "Veille",
        type: "CONTENT",
      },
      {
        id: "high",
        text: "activation onboarding produit",
        title: "Activation",
        type: "IDEA",
      },
    ]);

    expect(match).toMatchObject({
      candidate: expect.objectContaining({ id: "high" }),
      score: 1,
    });
  });

  it("matches search queries with normalized tokens", () => {
    expect(matchesSearchQuery("Idee d'activation produit", "activation")).toBe(
      true,
    );
    expect(matchesSearchQuery("Idee d'activation produit", "retention")).toBe(
      false,
    );
  });

  it("documents the default warning threshold", () => {
    expect(DEFAULT_DUPLICATE_WARNING_THRESHOLD).toBe(0.72);
  });
});
