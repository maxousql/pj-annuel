import {
  DEFAULT_DUPLICATE_WARNING_THRESHOLD,
  computeSimilarity,
  computeSemanticSimilarity,
  findBestHybridSimilarityMatch,
  findBestSimilarityMatch,
  matchesSearchQuery,
  tokenize,
} from "./history-similarity";

describe("history similarity", () => {
  it("normalizes accents, casing and insignificant punctuation", () => {
    expect([...tokenize("Éditorial: IA, acquisition!")]).toEqual([
      "editorial",
      "ia",
      "acquisition",
    ]);
  });

  it("computes a stable token overlap score", () => {
    expect(
      computeSimilarity(
        "Production contenu IA pour acquisition",
        "Acquisition par contenu ia",
      ),
    ).toBe(0.5);
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

  it("recognizes marketing concepts expressed with different vocabulary", () => {
    expect(
      computeSemanticSimilarity(
        "Ameliorer l'acquisition et la fidelisation client",
        "Accelerer la croissance et la retention de l'audience",
      ),
    ).toBeGreaterThan(0.7);
  });

  it("keeps the short IA token in semantic comparisons", () => {
    expect([...tokenize("IA pour les ventes")]).toContain("ia");
    expect(
      computeSemanticSimilarity("IA marketing", "intelligence marketing"),
    ).toBeGreaterThan(0.5);
  });

  it("computes the hybrid score per candidate before choosing the maximum", () => {
    const match = findBestHybridSimilarityMatch(
      "activation onboarding produit croissance acquisition",
      "Guide de lancement",
      [
        {
          id: "semantic",
          text: "activation onboarding produit",
          title: "Activation",
          type: "CONTENT",
        },
        {
          id: "title",
          text: "veille concurrentielle",
          title: "Guide de lancement",
          type: "IDEA",
        },
      ],
    );

    expect(match.candidate?.id).toBe("title");
    expect(match.score).toBe(1);
  });
});
