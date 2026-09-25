// RSS/Atom Feed Parser
// worker/parsers/rss.ts

import type { ParsedFeed, RssItem } from '../../src/types';

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Extract text content from XML element
 */
function getText(el: Element | null): string {
  if (!el) return '';
  return el.textContent?.trim() || '';
}

/**
 * Get attribute value safely
 */
function getAttr(el: Element | null, attr: string): string {
  if (!el) return '';
  return el.getAttribute(attr) || '';
}

/**
 * Find element by tag name (first occurrence)
 */
function findEl(parent: Element | Document, tagName: string): Element | null {
  return parent.getElementsByTagName(tagName)[0] || null;
}

/**
 * Find all elements by tag name
 */
function findAll(parent: Element | Document, tagName: string): Element[] {
  return Array.from(parent.getElementsByTagName(tagName));
}

/**
 * Clean HTML from string (basic stripping)
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract image URL from content/description/enclosure
 */
function extractImageFromContent(content: string): string | undefined {
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

/**
 * Parse RSS 2.0 item
 */
function parseRssItem(item: Element): RssItem {
  const title = getText(findEl(item, 'title'));
  const link = getText(findEl(item, 'link')) || getAttr(findEl(item, 'link'), 'href');
  const description = getText(findEl(item, 'description'));
  const pubDate = parseDate(getText(findEl(item, 'pubDate')));
  const guid = getText(findEl(item, 'guid'));
  
  // Author
  const author = getText(findEl(item, 'author')) || 
    getText(findEl(item, 'dc:creator')) ||
    getText(findEl(item, 'creator'));
  
  // Category
  const categoryEl = findEl(item, 'category');
  const category = getText(categoryEl);
  
  // Content:encoded (full content)
  const contentEncoded = getText(findEl(item, 'content:encoded')) ||
    getText(findEl(item, 'encoded'));
  
  // Media thumbnail
  const mediaThumbnail = findEl(item, 'media:thumbnail') || 
    findEl(item, 'thumbnail');
  const thumbnailUrl = mediaThumbnail 
    ? (getAttr(mediaThumbnail, 'url') || getText(mediaThumbnail))
    : undefined;
  
  // Enclosure (podcast/media attachment)
  const enclosureEl = findEl(item, 'enclosure');
  const enclosure = enclosureEl ? {
    url: getAttr(enclosureEl, 'url'),
    type: getAttr(enclosureEl, 'type'),
  } : undefined;
  
  // Image: try thumbnail, then extract from content
  const imageSource = contentEncoded || description;
  const extractedImage = imageSource ? extractImageFromContent(imageSource) : undefined;
  const thumbnail = thumbnailUrl || 
    (enclosure?.type?.startsWith('image/') ? enclosure.url : undefined) || 
    extractedImage;
  
  // Clean description (excerpt)
  const excerpt = stripHtml(description || contentEncoded || '').substring(0, 500) || undefined;
  
  return {
    title: stripHtml(title),
    link: link.trim(),
    description: excerpt,
    content: contentEncoded || undefined,
    pubDate,
    guid: guid || link,
    author: author || undefined,
    category: category || undefined,
    enclosure,
    thumbnail,
  };
}

/**
 * Parse Atom feed item
 */
function parseAtomEntry(entry: Element): RssItem {
  const title = getText(findEl(entry, 'title'));
  
  // Link: prefer rel="alternate" or first link
  const links = findAll(entry, 'link');
  let link = '';
  for (const l of links) {
    const rel = getAttr(l, 'rel');
    if (rel === 'alternate' || rel === '' || !rel) {
      link = getAttr(l, 'href') || getText(l);
      if (link) break;
    }
  }
  if (!link && links.length > 0) {
    link = getAttr(links[0], 'href') || getText(links[0]);
  }
  
  const summary = getText(findEl(entry, 'summary'));
  const content = getText(findEl(entry, 'content'));
  const updated = parseDate(getText(findEl(entry, 'updated')));
  const published = parseDate(getText(findEl(entry, 'published')));
  const id = getText(findEl(entry, 'id'));
  
  const authorEl = findEl(entry, 'author');
  const author = authorEl ? getText(findEl(authorEl, 'name')) : undefined;
  
  const categoryEl = findEl(entry, 'category');
  const category = categoryEl ? (getAttr(categoryEl, 'term') || getText(categoryEl)) : undefined;
  
  const contentText = content || summary;
  const extractedImage = contentText ? extractImageFromContent(contentText) : undefined;
  const mediaThumbnail = findEl(entry, 'media:thumbnail') || findEl(entry, 'thumbnail');
  const thumbnail = mediaThumbnail 
    ? (getAttr(mediaThumbnail, 'url') || getText(mediaThumbnail))
    : extractedImage;
  
  const excerpt = stripHtml(summary || content || '').substring(0, 500) || undefined;
  
  return {
    title: stripHtml(title),
    link: link.trim(),
    description: excerpt,
    content: content || undefined,
    pubDate: published || updated,
    guid: id || link,
    author: author || undefined,
    category: category || undefined,
    thumbnail,
  };
}

/**
 * Main RSS/Atom parser
 * Uses native DOMParser available in Cloudflare Workers
 */
export function parseFeed(xmlText: string): ParsedFeed {
  let doc: Document;
  
  try {
    doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  } catch (err) {
    throw new Error(`Failed to parse XML: ${err}`);
  }
  
  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent}`);
  }
  
  const root = doc.documentElement;
  const rootName = root.tagName.toLowerCase();
  
  // Detect feed type
  if (rootName === 'feed' || root.namespaceURI?.includes('Atom')) {
    // Atom feed
    const title = getText(findEl(doc, 'title'));
    const linkEl = Array.from(doc.getElementsByTagName('link'))
      .find(l => getAttr(l, 'rel') === 'alternate' || !getAttr(l, 'rel'));
    const link = linkEl ? (getAttr(linkEl, 'href') || getText(linkEl)) : '';
    const description = getText(findEl(doc, 'subtitle'));
    
    const entries = findAll(doc, 'entry').map(parseAtomEntry);
    
    return { title: stripHtml(title), link, description: description || undefined, items: entries };
  } else if (rootName === 'rss' || rootName === 'rdf:rdf') {
    // RSS 2.0 / RSS 1.0
    const channel = findEl(doc, 'channel');
    const title = getText(findEl(doc, 'title'));
    const link = getText(findEl(doc, 'link'));
    const description = getText(findEl(doc, 'description'));
    
    // RSS 1.0 uses <item> directly in root, RSS 2.0 uses <item> in <channel>
    const itemParent = channel || doc;
    const items = findAll(itemParent, 'item').map(parseRssItem);
    
    return { title: stripHtml(title), link, description: description || undefined, items };
  }
  
  throw new Error(`Unknown feed format: ${rootName}`);
}

/**
 * Validate RSS URL and fetch feed
 */
export async function fetchAndParseFeed(
  feedUrl: string,
  options?: { etag?: string; lastModified?: string; timeout?: number }
): Promise<{ feed: ParsedFeed; etag?: string; lastModified?: string; status: number }> {
  const controller = new AbortController();
  const timeout = options?.timeout ?? 30000;
  const timer = setTimeout(() => controller.abort(), timeout);
  
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      'User-Agent': 'DailyRead/1.0 (+https://dailyread.app; RSS reader)',
    };
    
    // Conditional requests
    if (options?.etag) headers['If-None-Match'] = options.etag;
    if (options?.lastModified) headers['If-Modified-Since'] = options.lastModified;
    
    const response = await fetch(feedUrl, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });
    
    clearTimeout(timer);
    
    const etag = response.headers.get('ETag') || undefined;
    const lastModified = response.headers.get('Last-Modified') || undefined;
    
    if (response.status === 304) {
      return { feed: { title: '', link: '', items: [] }, etag, lastModified, status: 304 };
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Limit response size to 5MB
    const contentLength = response.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      throw new Error('Feed response too large (>5MB)');
    }
    
    const text = await response.text();
    
    if (text.length > 5 * 1024 * 1024) {
      throw new Error('Feed response too large (>5MB)');
    }
    
    const feed = parseFeed(text);
    return { feed, etag, lastModified, status: response.status };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Feed fetch timeout after ${timeout}ms`);
    }
    throw err;
  }
}
