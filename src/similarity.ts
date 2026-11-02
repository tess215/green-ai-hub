/**
 * Similarity Utilities for Kolibri
 * Fault-tolerant text comparison using Levenshtein distance,
 * Trigram indexing, and Token Jaccard similarity.
 */

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'„“]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeFingerprint(text: string): string {
  const norm = normalizeText(text);
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    const char = norm.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(6, '0').slice(-6);
  return `#${hex}`;
}

export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion / deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

export function levenshteinSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  if (normA === normB) return 1.0;
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - dist / maxLen);
}

export function tokenJaccardSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).split(' ').filter(t => t.length > 1));
  const tokensB = new Set(normalizeText(b).split(' ').filter(t => t.length > 1));
  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersection = 0;
  tokensA.forEach(t => {
    if (tokensB.has(t)) intersection++;
  });

  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

export function trigramSimilarity(a: string, b: string): number {
  const normA = `  ${normalizeText(a)} `;
  const normB = `  ${normalizeText(b)} `;
  if (normA.length < 3 || normB.length < 3) return levenshteinSimilarity(a, b);

  const getTrigrams = (str: string) => {
    const set = new Set<string>();
    for (let i = 0; i < str.length - 2; i++) {
      set.add(str.slice(i, i + 3));
    }
    return set;
  };

  const triA = getTrigrams(normA);
  const triB = getTrigrams(normB);

  let intersection = 0;
  triA.forEach(tri => {
    if (triB.has(tri)) intersection++;
  });

  const total = triA.size + triB.size;
  return total > 0 ? (2 * intersection) / total : 0;
}

export function computeCombinedSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  if (normA === normB) return 1.0;

  // Weighted combo: 40% Token Jaccard, 40% Trigram, 20% Levenshtein
  const jaccard = tokenJaccardSimilarity(a, b);
  const trigram = trigramSimilarity(a, b);
  const lev = levenshteinSimilarity(a, b);

  const score = jaccard * 0.45 + trigram * 0.35 + lev * 0.20;
  return Math.min(1.0, Math.max(0, score));
}

export interface MatchResult<T> {
  item: T;
  similarity: number; // 0 to 1
  percentage: number; // 0 to 100
  type: 'exakt' | 'aehnlich' | 'variante';
}

export function findBestMatch<T>(
  query: string,
  candidates: T[],
  extractText: (item: T) => string | string[],
  threshold = 0.75
): MatchResult<T> | null {
  if (!query || candidates.length === 0) return null;

  let bestItem: T | null = null;
  let bestScore = 0;

  for (const item of candidates) {
    const rawTexts = extractText(item);
    const texts = Array.isArray(rawTexts) ? rawTexts : [rawTexts];

    for (const text of texts) {
      const score = computeCombinedSimilarity(query, text);
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }
  }

  if (bestItem && bestScore >= threshold) {
    return {
      item: bestItem,
      similarity: bestScore,
      percentage: Math.round(bestScore * 100),
      type: bestScore >= 0.96 ? 'exakt' : 'aehnlich',
    };
  }

  return null;
}
