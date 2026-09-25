// URL utilities - normalize and clean URLs
// worker/utils/url.ts

/**
 * Tracking parameters to remove from URLs
 */
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
  'msclkid', 'twclid', 'li_fat_id', 'igshid',
  '_ga', '_gl', 'mc_cid', 'mc_eid',
  'ref', 'source', 'via', // only remove known tracking ones
]);

/**
 * Normalize a URL: remove tracking params, normalize protocol/trailing slash
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Remove tracking parameters
    const paramsToDelete: string[] = [];
    for (const [key] of parsed.searchParams) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        paramsToDelete.push(key);
      }
    }
    paramsToDelete.forEach(p => parsed.searchParams.delete(p));
    
    // Normalize: remove trailing slash from path (except root)
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    
    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();
    
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Extract canonical URL from a URL (without tracking params)
 */
export function getCanonicalUrl(url: string): string {
  return normalizeUrl(url);
}

/**
 * Create a slug from a title
 */
export function slugify(text: string): string {
  // Vietnamese character map
  const viMap: Record<string, string> = {
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'đ': 'd',
    'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  };

  let slug = text.toLowerCase();
  
  // Replace Vietnamese characters
  for (const [vi, en] of Object.entries(viMap)) {
    slug = slug.replace(new RegExp(vi, 'g'), en);
  }
  
  // Replace non-alphanumeric with hyphens
  slug = slug
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Truncate to 100 chars
  if (slug.length > 100) {
    slug = slug.substring(0, 100).replace(/-[^-]*$/, '');
  }
  
  return slug || 'article';
}

/**
 * Generate a unique slug with timestamp
 */
export function generateSlug(title: string, timestamp?: string): string {
  const base = slugify(title);
  const ts = timestamp
    ? new Date(timestamp).getTime()
    : Date.now();
  return `${base}-${ts}`;
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
