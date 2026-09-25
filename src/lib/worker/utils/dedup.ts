// Duplicate detection utilities
// worker/utils/dedup.ts

/**
 * Normalize a title for comparison
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // remove punctuation, keep unicode letters
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple hash function for strings (djb2)
 */
export function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Generate a duplicate group ID based on normalized title
 * Used to group articles about the same topic from different sources
 */
export function generateDuplicateGroupId(title: string): string {
  const normalized = normalizeTitle(title);
  // Take first 60 chars of normalized title as the key
  const key = normalized.substring(0, 60);
  return hashString(key);
}

/**
 * Calculate similarity between two strings (simple Jaccard similarity on words)
 */
export function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeTitle(a).split(' ').filter(w => w.length > 2));
  const wordsB = new Set(normalizeTitle(b).split(' ').filter(w => w.length > 2));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  
  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union;
}

/**
 * Check if two articles are likely about the same event
 * Threshold: 0.7 = 70% word overlap
 */
export function areSimilarArticles(titleA: string, titleB: string, threshold = 0.7): boolean {
  return calculateSimilarity(titleA, titleB) >= threshold;
}

/**
 * SHA-256 hash for content deduplication (Web Crypto API)
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
