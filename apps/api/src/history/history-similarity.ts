export const DEFAULT_DUPLICATE_WARNING_THRESHOLD = 0.72;

export type SimilarityCandidate = {
  id: string;
  text: string;
  title: string;
  type: "IDEA" | "CONTENT";
};

export type SimilarityMatch = {
  candidate: SimilarityCandidate | null;
  score: number;
};

export function computeSimilarity(
  firstText: string,
  secondText: string,
): number {
  const firstTokens = tokenize(firstText);
  const secondTokens = tokenize(secondText);

  if (firstTokens.size === 0 || secondTokens.size === 0) {
    return 0;
  }

  let intersectionSize = 0;

  for (const token of firstTokens) {
    if (secondTokens.has(token)) {
      intersectionSize += 1;
    }
  }

  const unionSize = new Set([...firstTokens, ...secondTokens]).size;

  return unionSize > 0 ? intersectionSize / unionSize : 0;
}

export function findBestSimilarityMatch(
  targetText: string,
  candidates: SimilarityCandidate[],
): SimilarityMatch {
  let bestMatch: SimilarityMatch = {
    candidate: null,
    score: 0,
  };

  for (const candidate of candidates) {
    const score = computeSimilarity(targetText, candidate.text);

    if (score > bestMatch.score) {
      bestMatch = {
        candidate,
        score,
      };
    }
  }

  return {
    candidate: bestMatch.candidate,
    score: roundSimilarityScore(bestMatch.score),
  };
}

export function matchesSearchQuery(value: string, query: string): boolean {
  const queryTokens = tokenize(query);

  if (queryTokens.size === 0) {
    return true;
  }

  const valueTokens = tokenize(value);

  for (const token of queryTokens) {
    if (!valueTokens.has(token)) {
      return false;
    }
  }

  return true;
}

export function tokenize(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  );
}

export function roundSimilarityScore(score: number): number {
  return Math.round(score * 100) / 100;
}
