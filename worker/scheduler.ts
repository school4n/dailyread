// Background scheduler / cron job for collecting articles
// worker/scheduler.ts

import type { Env } from './types';
import { fetchAndParseFeed } from './parsers/rss';
import { generateSlug, normalizeUrl } from './utils/url';
import { generateDuplicateGroupId } from './utils/dedup';

interface SourceRow {
  id: number;
  name: string;
  feed_url: string;
  category: string;
  language: string;
  fetch_interval: number;
  last_fetched_at: string | null;
  etag: string | null;
  last_modified: string | null;
}

/**
 * Main scheduler function called by Cron Trigger
 */
export async function runScheduler(env: Env): Promise<void> {
  console.log('[Scheduler] Starting feed collection run...');
  
  try {
    // Get all enabled sources that are due for fetching
    const now = new Date();
    const sources = await env.DB.prepare(`
      SELECT id, name, feed_url, category, language, fetch_interval,
             last_fetched_at, etag, last_modified
      FROM sources
      WHERE enabled = 1
      AND (
        last_fetched_at IS NULL
        OR datetime(last_fetched_at, '+' || fetch_interval || ' minutes') <= datetime('now')
      )
      ORDER BY last_fetched_at ASC NULLS FIRST
      LIMIT 20
    `).all<SourceRow>();
    
    if (!sources.results || sources.results.length === 0) {
      console.log('[Scheduler] No sources due for fetching');
      return;
    }
    
    console.log(`[Scheduler] Processing ${sources.results.length} sources`);
    
    // Process sources sequentially to avoid overloading
    for (const source of sources.results) {
      await processSource(env, source, now);
      // Small delay between sources
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('[Scheduler] Feed collection complete');
  } catch (err) {
    console.error('[Scheduler] Fatal error:', err);
  }
}

/**
 * Process a single source
 */
async function processSource(env: Env, source: SourceRow, startTime: Date): Promise<void> {
  const logId = await createFetchLog(env, source.id);
  
  try {
    console.log(`[Scheduler] Fetching source: ${source.name} (${source.feed_url})`);
    
    // Update last_fetched_at immediately to prevent duplicate concurrent fetches
    await env.DB.prepare(`
      UPDATE sources SET last_fetched_at = ? WHERE id = ?
    `).bind(startTime.toISOString(), source.id).run();
    
    // Fetch the feed
    const result = await fetchAndParseFeed(source.feed_url, {
      etag: source.etag || undefined,
      lastModified: source.last_modified || undefined,
      timeout: 25000,
    });
    
    let articlesAdded = 0;
    
    // Handle 304 Not Modified
    if (result.status === 304) {
      await finalizeFetchLog(env, logId, 'skipped', 0, 0);
      await env.DB.prepare(`
        UPDATE sources SET last_success_at = ?, last_error = NULL WHERE id = ?
      `).bind(startTime.toISOString(), source.id).run();
      console.log(`[Scheduler] ${source.name}: Not modified, skipping`);
      return;
    }
    
    const { feed, etag, lastModified } = result;
    const items = feed.items;
    
    console.log(`[Scheduler] ${source.name}: Found ${items.length} items`);
    
    // Process items
    const insertStatements = [];
    
    for (const item of items) {
      if (!item.title || !item.link) continue;
      
      const canonicalUrl = normalizeUrl(item.link);
      const externalId = item.guid || canonicalUrl;
      
      // Check for duplicates: external_id or canonical_url
      const existing = await env.DB.prepare(`
        SELECT id FROM articles 
        WHERE external_id = ? OR canonical_url = ?
        LIMIT 1
      `).bind(externalId, canonicalUrl).first<{ id: number }>();
      
      if (existing) continue;
      
      // Generate unique slug
      const slug = generateSlug(item.title, item.pubDate);
      const duplicateGroupId = generateDuplicateGroupId(item.title);
      
      // Sanitize content (basic - DOMParser not available in workers)
      const safeExcerpt = sanitizeText(item.description);
      const safeContent = item.content ? sanitizeBasicHtml(item.content) : null;
      
      // Determine content type
      const contentType = safeContent && safeContent.length > 200 ? 'full' : 'excerpt';
      
      insertStatements.push(
        env.DB.prepare(`
          INSERT OR IGNORE INTO articles (
            source_id, external_id, title, slug, url, canonical_url,
            excerpt, content, image_url, author, category, tags,
            language, published_at, fetched_at, content_type, duplicate_group_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          source.id,
          externalId,
          item.title.substring(0, 500),
          slug,
          item.link.substring(0, 2000),
          canonicalUrl.substring(0, 2000),
          safeExcerpt ? safeExcerpt.substring(0, 1000) : null,
          safeContent,
          item.thumbnail ? item.thumbnail.substring(0, 2000) : null,
          item.author ? item.author.substring(0, 200) : null,
          source.category,
          item.category ? JSON.stringify([item.category]) : null,
          source.language,
          item.pubDate || null,
          startTime.toISOString(),
          contentType,
          duplicateGroupId,
        )
      );
    }
    
    // Batch insert (max 50 at a time)
    const batchSize = 50;
    for (let i = 0; i < insertStatements.length; i += batchSize) {
      const batch = insertStatements.slice(i, i + batchSize);
      const results = await env.DB.batch(batch);
      articlesAdded += results.filter(r => r.meta.changes && r.meta.changes > 0).length;
    }
    
    // Update source metadata
    await env.DB.prepare(`
      UPDATE sources SET 
        last_success_at = ?,
        last_error = NULL,
        etag = ?,
        last_modified = ?
      WHERE id = ?
    `).bind(
      startTime.toISOString(),
      etag || null,
      lastModified || null,
      source.id
    ).run();
    
    await finalizeFetchLog(env, logId, 'success', items.length, articlesAdded);
    console.log(`[Scheduler] ${source.name}: Added ${articlesAdded}/${items.length} articles`);
    
    // Clean up old articles (keep last 500 per source)
    await env.DB.prepare(`
      DELETE FROM articles WHERE source_id = ? AND id NOT IN (
        SELECT id FROM articles WHERE source_id = ? 
        ORDER BY COALESCE(published_at, fetched_at) DESC LIMIT 500
      )
    `).bind(source.id, source.id).run();
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[Scheduler] Error processing ${source.name}:`, errorMessage);
    
    await env.DB.prepare(`
      UPDATE sources SET last_error = ? WHERE id = ?
    `).bind(errorMessage.substring(0, 500), source.id).run();
    
    await finalizeFetchLog(env, logId, 'error', 0, 0, errorMessage);
  }
}

/**
 * Create fetch log entry
 */
async function createFetchLog(env: Env, sourceId: number): Promise<number> {
  const result = await env.DB.prepare(`
    INSERT INTO fetch_logs (source_id, started_at, status)
    VALUES (?, datetime('now'), 'running')
  `).bind(sourceId).run();
  
  return result.meta.last_row_id || 0;
}

/**
 * Finalize fetch log
 */
async function finalizeFetchLog(
  env: Env,
  logId: number,
  status: string,
  articlesFound: number,
  articlesAdded: number,
  errorMessage?: string
): Promise<void> {
  await env.DB.prepare(`
    UPDATE fetch_logs SET
      finished_at = datetime('now'),
      status = ?,
      articles_found = ?,
      articles_added = ?,
      error_message = ?
    WHERE id = ?
  `).bind(status, articlesFound, articlesAdded, errorMessage || null, logId).run();
  
  // Clean up old logs (keep last 100 per source)
  if (logId > 0) {
    await env.DB.prepare(`
      DELETE FROM fetch_logs WHERE id NOT IN (
        SELECT id FROM fetch_logs ORDER BY started_at DESC LIMIT 200
      )
    `).run();
  }
}

/**
 * Basic text sanitization
 */
function sanitizeText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return text
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
 * Basic HTML sanitization - keep safe tags only
 */
function sanitizeBasicHtml(html: string): string {
  const SAFE_TAGS = /^(p|br|strong|b|em|i|u|h[1-6]|ul|ol|li|blockquote|a|img|figure|figcaption|pre|code|span|div|article)$/i;
  const SAFE_ATTRS = /^(href|src|alt|title|class|width|height|loading)$/i;
  
  // Simple allowlist approach - replace unsafe tags
  return html
    // Remove script, style, iframe, etc.
    .replace(/<(script|style|iframe|form|input|button|object|embed|base|meta|link)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|form|input|button|object|embed|base|meta|link)[^>]*\/?>/gi, '')
    // Remove event handlers
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    // Remove javascript: URLs
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    // Remove data: URLs in src
    .replace(/src\s*=\s*["']data:[^"']*["']/gi, '')
    .trim();
}
