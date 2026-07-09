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

export function computeSemanticSimilarity(
  firstText: string,
  secondText: string,
): number {
  const firstVector = buildConceptVector(firstText);
  const secondVector = buildConceptVector(secondText);

  if (firstVector.size === 0 || secondVector.size === 0) return 0;

  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  for (const [concept, weight] of firstVector) {
    dotProduct += weight * (secondVector.get(concept) ?? 0);
    firstMagnitude += weight * weight;
  }

  for (const weight of secondVector.values()) {
    secondMagnitude += weight * weight;
  }

  if (firstMagnitude === 0 || secondMagnitude === 0) return 0;

  const cosine = dotProduct / Math.sqrt(firstMagnitude * secondMagnitude);
  const lexical = computeSimilarity(firstText, secondText);
  return roundSimilarityScore(Math.min(1, cosine * 0.8 + lexical * 0.2));
}

export function findBestSemanticSimilarityMatch(
  targetText: string,
  candidates: SimilarityCandidate[],
): SimilarityMatch {
  let bestMatch: SimilarityMatch = { candidate: null, score: 0 };

  for (const candidate of candidates) {
    const score = computeSemanticSimilarity(targetText, candidate.text);

    if (score > bestMatch.score) bestMatch = { candidate, score };
  }

  return bestMatch;
}

export function findBestHybridSimilarityMatch(
  targetText: string,
  targetTitle: string,
  candidates: SimilarityCandidate[],
): SimilarityMatch {
  let bestMatch: SimilarityMatch = { candidate: null, score: 0 };

  for (const candidate of candidates) {
    const score = Math.max(
      computeSemanticSimilarity(targetText, candidate.text),
      computeSimilarity(targetTitle, candidate.title),
    );

    if (score > bestMatch.score) {
      bestMatch = { candidate, score: roundSimilarityScore(score) };
    }
  }

  return bestMatch;
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
      .filter((token) => token.length >= 3 || token === "ia"),
  );
}

export function roundSimilarityScore(score: number): number {
  return Math.round(score * 100) / 100;
}

const CONCEPT_ALIASES: Record<string, string> = {
  ameliorer: "optimize",
  accelerer: "optimize",
  acquisition: "growth",
  croissance: "growth",
  conversion: "growth",
  prospect: "audience",
  client: "audience",
  audience: "audience",
  onboarding: "activation",
  activation: "activation",
  demarrage: "activation",
  retention: "loyalty",
  fidelisation: "loyalty",
  fidelite: "loyalty",
  contenu: "content",
  editorial: "content",
  redaction: "content",
  article: "longform",
  blog: "longform",
  newsletter: "email",
  courriel: "email",
  email: "email",
  automatisation: "automation",
  automatique: "automation",
  productivite: "efficiency",
  efficacite: "efficiency",
  ia: "ai",
  intelligence: "ai",
};

function buildConceptVector(value: string): Map<string, number> {
  const vector = new Map<string, number>();

  for (const token of tokenize(value)) {
    const stem = stemToken(token);
    const concept = CONCEPT_ALIASES[token] ?? CONCEPT_ALIASES[stem] ?? stem;
    vector.set(concept, (vector.get(concept) ?? 0) + 1);
  }

  return vector;
}

function stemToken(value: string): string {
  return value
    .replace(/(ements|ement|ations|ation|iques|ique|eurs|euses|euse)$/i, "")
    .replace(/(es|s)$/i, "");
}
