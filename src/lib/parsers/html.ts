import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export async function fetchFullContent(url: string, timeoutMs: number = 3000): Promise<{ content?: string; excerpt?: string; title?: string; textContent?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36 DailyRead/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) return null;
    
    // Limit response size to 2MB to avoid memory/time issues
    const contentLength = response.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) {
      console.warn(`[HTML Parser] Response too large for ${url}: ${contentLength} bytes`);
      return null;
    }
    
    let html = await response.text();
    
    // Truncate if too large
    if (html.length > 2 * 1024 * 1024) {
      html = html.substring(0, 2 * 1024 * 1024);
    }
    
    const doc = new JSDOM(html, { url });
    
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    if (!article) return null;
    
    return {
      content: article.content || undefined, // HTML string
      excerpt: article.excerpt || undefined,
      title: article.title || undefined,
      textContent: article.textContent || undefined
    };
  } catch (err) {
    console.error(`[HTML Parser] Failed to fetch full content for ${url}`);
    return null;
  }
}

