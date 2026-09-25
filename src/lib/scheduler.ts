// Background scheduler / cron job for collecting articles
// src/lib/scheduler.ts

import { db, queryAll, queryFirst, execute } from './db';
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

export async function runScheduler(): Promise<void> {
  console.log('[Scheduler] Starting feed collection run...');
  
  try {
    const now = new Date();
    // Get all enabled sources that are due for fetching
    const sources = await queryAll<SourceRow>(`
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
    `);
    
    if (!sources || sources.length === 0) {
      console.log('[Scheduler] No sources due for fetching');
      return;
    }
    
    console.log(`[Scheduler] Processing ${sources.length} sources`);
    
    // Process sources sequentially to avoid overloading
    for (const source of sources) {
      await processSource(source, now);
      // Small delay between sources
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('[Scheduler] Feed collection complete');
  } catch (err) {
    console.error('[Scheduler] Fatal error:', err);
  }
}

async function processSource(source: SourceRow, startTime: Date): Promise<void> {
  const logId = await createFetchLog(source.id);
  
  try {
    console.log(`[Scheduler] Fetching source: ${source.name} (${source.feed_url})`);
    
    await execute(`UPDATE sources SET last_fetched_at = ? WHERE id = ?`, [startTime.toISOString(), source.id]);
    
    const result = await fetchAndParseFeed(source.feed_url, {
      etag: source.etag || undefined,
      lastModified: source.last_modified || undefined,
      timeout: 25000,
    });
    
    let articlesAdded = 0;
    
    if (result.status === 304) {
      await finalizeFetchLog(logId, 'skipped', 0, 0);
      await execute(`UPDATE sources SET last_success_at = ?, last_error = NULL WHERE id = ?`, [startTime.toISOString(), source.id]);
      console.log(`[Scheduler] ${source.name}: Not modified, skipping`);
      return;
    }
    
    const { feed, etag, lastModified } = result;
    const items = feed.items;
    
    console.log(`[Scheduler] ${source.name}: Found ${items.length} items`);
    
    for (const item of items) {
      if (!item.title || !item.link) continue;
      
      const canonicalUrl = normalizeUrl(item.link);
      const externalId = item.guid || canonicalUrl;
      
      const existing = await queryFirst<{ id: number }>(`
        SELECT id FROM articles WHERE external_id = ? OR canonical_url = ? LIMIT 1
      `, [externalId, canonicalUrl]);
      
      if (existing) continue;
      
      const slug = generateSlug(item.title, item.pubDate);
      const duplicateGroupId = generateDuplicateGroupId(item.title);
      
      const safeExcerpt = sanitizeText(item.description);
      const safeContent = item.content ? sanitizeBasicHtml(item.content) : null;
      const contentType = safeContent && safeContent.length > 200 ? 'full' : 'excerpt';
      
      try {
        await execute(`
          INSERT OR IGNORE INTO articles (
            source_id, external_id, title, slug, url, canonical_url,
            excerpt, content, image_url, author, category, tags,
            language, published_at, fetched_at, content_type, duplicate_group_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
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
          duplicateGroupId
        ]);
        articlesAdded++;
      } catch (e) {
        // Ignore insert errors (like duplicates)
      }
    }
    
    await execute(`
      UPDATE sources SET 
        last_success_at = ?, last_error = NULL, etag = ?, last_modified = ?
      WHERE id = ?
    `, [startTime.toISOString(), etag || null, lastModified || null, source.id]);
    
    await finalizeFetchLog(logId, 'success', items.length, articlesAdded);
    console.log(`[Scheduler] ${source.name}: Added ${articlesAdded}/${items.length} articles`);
    
    // Clean up old articles
    await execute(`
      DELETE FROM articles WHERE source_id = ? AND id NOT IN (
        SELECT id FROM articles WHERE source_id = ? 
        ORDER BY COALESCE(published_at, fetched_at) DESC LIMIT 500
      )
    `, [source.id, source.id]);
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[Scheduler] Error processing ${source.name}:`, errorMessage);
    
    await execute(`UPDATE sources SET last_error = ? WHERE id = ?`, [errorMessage.substring(0, 500), source.id]);
    await finalizeFetchLog(logId, 'error', 0, 0, errorMessage);
  }
}

async function createFetchLog(sourceId: number): Promise<number> {
  const result = await execute(`
    INSERT INTO fetch_logs (source_id, started_at, status)
    VALUES (?, datetime('now'), 'running')
  `, [sourceId]);
  return Number(result.lastInsertRowid) || 0;
}

async function finalizeFetchLog(logId: number, status: string, articlesFound: number, articlesAdded: number, errorMessage?: string): Promise<void> {
  await execute(`
    UPDATE fetch_logs SET
      finished_at = datetime('now'), status = ?, articles_found = ?, articles_added = ?, error_message = ?
    WHERE id = ?
  `, [status, articlesFound, articlesAdded, errorMessage || null, logId]);
  
  if (logId > 0) {
    await execute(`
      DELETE FROM fetch_logs WHERE id NOT IN (
        SELECT id FROM fetch_logs ORDER BY started_at DESC LIMIT 200
      )
    `);
  }
}

function sanitizeText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function sanitizeBasicHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|form|input|button|object|embed|base|meta|link)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|form|input|button|object|embed|base|meta|link)[^>]*\/?>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '').replace(/\s+on\w+='[^']*'/gi, '')
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/src\s*=\s*["']data:[^"']*["']/gi, '').trim();
}
