// Background scheduler / cron job for collecting articles
// src/lib/scheduler.ts

import { db, queryAll, queryFirst, execute } from './db';
import { fetchAndParseFeed } from './parsers/rss';
import { generateSlug, normalizeUrl } from './utils/url';
import { generateDuplicateGroupId } from './utils/dedup';
import { fetchFullContent } from './parsers/html';
import DOMPurify from 'isomorphic-dompurify';

export interface SourceRow {
  id: number;
  name: string;
  feed_url: string;
  category: string;
  language: string;
  fetch_interval: number;
  last_fetched_at: string | null;
  etag: string | null;
  last_modified: string | null;
  consecutive_errors: number;
}

interface SchedulerResult {
  sourcesProcessed: number;
  totalArticlesAdded: number;
  errors: string[];
  skipped: number;
  durationMs: number;
}

// DB-level lock: prevent concurrent scheduler runs across instances
async function acquireLock(): Promise<boolean> {
  try {
    // Create lock table if not exists
    await execute(`
      CREATE TABLE IF NOT EXISTS scheduler_lock (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        locked_at TEXT NOT NULL,
        locked_by TEXT
      )
    `);
    
    // Try to acquire lock - only if no lock exists or lock is stale (> 2 minutes old)
    const existing = await queryFirst<{ locked_at: string }>(`
      SELECT locked_at FROM scheduler_lock WHERE id = 1
    `);
    
    if (existing) {
      const lockedAt = new Date(existing.locked_at).getTime();
      const now = Date.now();
      // If lock is less than 2 minutes old, another instance is running
      if (now - lockedAt < 120_000) {
        console.log('[Scheduler] Lock held by another instance, skipping');
        return false;
      }
      // Stale lock, take over
      console.log('[Scheduler] Found stale lock, taking over');
    }
    
    await execute(`
      INSERT INTO scheduler_lock (id, locked_at, locked_by) 
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET locked_at = ?, locked_by = ?
    `, [
      new Date().toISOString(), 'scheduler-' + Date.now(),
      new Date().toISOString(), 'scheduler-' + Date.now()
    ]);
    
    return true;
  } catch (err) {
    console.error('[Scheduler] Failed to acquire lock:', err);
    return false;
  }
}

async function releaseLock(): Promise<void> {
  try {
    await execute(`DELETE FROM scheduler_lock WHERE id = 1`);
  } catch (err) {
    console.error('[Scheduler] Failed to release lock:', err);
  }
}

export async function runScheduler(): Promise<SchedulerResult> {
  console.log('[Scheduler] Starting feed collection run...');
  const globalStartTime = Date.now();
  const TIME_LIMIT = 8000; // 8 seconds — safe margin for Vercel Hobby 10s limit
  
  const result: SchedulerResult = {
    sourcesProcessed: 0,
    totalArticlesAdded: 0,
    errors: [],
    skipped: 0,
    durationMs: 0,
  };
  
  // Acquire DB-level lock to prevent concurrent runs
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    result.durationMs = Date.now() - globalStartTime;
    return result;
  }
  
  try {
    const now = new Date();
    
    // Get enabled sources that are due for fetching
    // - Skip sources with many consecutive errors (exponential backoff)
    // - Process fewer sources per run (LIMIT 5 instead of 20)
    const sources = await queryAll<SourceRow>(`
      SELECT id, name, feed_url, category, language, fetch_interval,
             last_fetched_at, etag, last_modified,
             COALESCE(consecutive_errors, 0) as consecutive_errors
      FROM sources
      WHERE enabled = 1
      AND (
        last_fetched_at IS NULL
        OR datetime(last_fetched_at, '+' || (
          fetch_interval * CASE 
            WHEN COALESCE(consecutive_errors, 0) = 0 THEN 1
            WHEN COALESCE(consecutive_errors, 0) = 1 THEN 2
            WHEN COALESCE(consecutive_errors, 0) = 2 THEN 4
            ELSE 8
          END
        ) || ' minutes') <= datetime('now')
      )
      ORDER BY last_fetched_at ASC NULLS FIRST
      LIMIT 5
    `);
    
    if (!sources || sources.length === 0) {
      console.log('[Scheduler] No sources due for fetching');
      return result;
    }
    
    console.log(`[Scheduler] Processing ${sources.length} sources`);
    
    // Process sources sequentially to avoid overloading
    for (const source of sources) {
      // Check time budget before processing each source
      const elapsed = Date.now() - globalStartTime;
      if (elapsed > TIME_LIMIT) {
        console.log(`[Scheduler] Time limit reached (${elapsed}ms), stopping`);
        break;
      }
      
      // Calculate remaining time budget for this source
      const remainingMs = TIME_LIMIT - elapsed;
      
      try {
        const articlesAdded = await processSource(source, now, globalStartTime, TIME_LIMIT, remainingMs);
        result.sourcesProcessed++;
        result.totalArticlesAdded += articlesAdded;
      } catch (err) {
        const msg = `${source.name}: ${err instanceof Error ? err.message : String(err)}`;
        result.errors.push(msg);
        console.error(`[Scheduler] Error: ${msg}`);
      }
      
      // Small delay between sources to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`[Scheduler] Complete: ${result.sourcesProcessed} sources, ${result.totalArticlesAdded} articles added`);
  } catch (err) {
    console.error('[Scheduler] Fatal error:', err);
    result.errors.push(err instanceof Error ? err.message : String(err));
  } finally {
    result.durationMs = Date.now() - globalStartTime;
    await releaseLock();
  }
  
  return result;
}

export async function processSource(
  source: SourceRow, 
  startTime: Date, 
  globalStartTime: number = 0, 
  timeLimit: number = 25000,
  remainingMs: number = 25000
): Promise<number> {
  const logId = await createFetchLog(source.id);
  
  try {
    console.log(`[Scheduler] Fetching: ${source.name} (errors: ${source.consecutive_errors || 0})`);
    
    // Update last_fetched_at immediately to prevent re-processing
    await execute(`UPDATE sources SET last_fetched_at = ? WHERE id = ?`, [startTime.toISOString(), source.id]);
    
    // Use shorter timeout for fetch — proportional to remaining time budget
    const fetchTimeout = Math.min(15000, Math.max(5000, remainingMs - 2000));
    
    const result = await fetchAndParseFeed(source.feed_url, {
      etag: source.etag || undefined,
      lastModified: source.last_modified || undefined,
      timeout: fetchTimeout,
    });
    
    let articlesAdded = 0;
    
    if (result.status === 304) {
      await finalizeFetchLog(logId, 'skipped', 0, 0);
      // Reset error counter on successful check
      await execute(`UPDATE sources SET last_success_at = ?, last_error = NULL, consecutive_errors = 0 WHERE id = ?`, 
        [startTime.toISOString(), source.id]);
      console.log(`[Scheduler] ${source.name}: Not modified, skipping`);
      return 0;
    }
    
    const { feed, etag, lastModified } = result;
    // Limit to 5 items per fetch (down from 10) to stay within time budget
    const items = feed.items.slice(0, 5);
    
    console.log(`[Scheduler] ${source.name}: Processing ${items.length} items (total: ${feed.items.length})`);
    
    for (const item of items) {
      // Check time budget before each item
      if (globalStartTime > 0 && Date.now() - globalStartTime > timeLimit) {
        console.log(`[Scheduler] Time limit reached during items for ${source.name}`);
        break;
      }
      
      if (!item.title || !item.link) continue;
      
      const canonicalUrl = normalizeUrl(item.link);
      const externalId = item.guid || canonicalUrl;
      
      const existing = await queryFirst<{ id: number }>(`
        SELECT id FROM articles WHERE external_id = ? OR canonical_url = ? LIMIT 1
      `, [externalId, canonicalUrl]);
      
      if (existing) continue;
      
      const slug = generateSlug(item.title, item.pubDate);
      const duplicateGroupId = generateDuplicateGroupId(item.title);
      
      const safeExcerptOriginal = sanitizeText(item.description);
      let safeContent = item.content ? sanitizeBasicHtml(item.content) : null;
      let safeExcerpt = safeExcerptOriginal;
      
      // Only fetch full content if we have enough time budget remaining (at least 3s)
      const timeRemaining = globalStartTime > 0 ? timeLimit - (Date.now() - globalStartTime) : Infinity;
      
      if ((!safeContent || safeContent.length < 300) && timeRemaining > 3000) {
        try {
          console.log(`[Scheduler] Fetching full text: ${item.title?.substring(0, 50)}...`);
          const fullArticle = await fetchFullContent(item.link);
          if (fullArticle && fullArticle.content) {
            safeContent = DOMPurify.sanitize(fullArticle.content, { USE_PROFILES: { html: true } });
            if (!safeExcerpt || safeExcerpt.length < 50) {
              safeExcerpt = sanitizeText(fullArticle.excerpt);
            }
          }
        } catch (err) {
          // Don't fail the whole article just because full content fetch failed
          console.warn(`[Scheduler] Full content fetch failed for ${item.link}: ${err}`);
        }
      } else if (timeRemaining <= 3000) {
        console.log(`[Scheduler] Skipping full content fetch (only ${Math.round(timeRemaining / 1000)}s left)`);
      }
      
      const contentType = safeContent && safeContent.length > 300 ? 'full' : 'excerpt';
      
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
    
    // Success: reset error counter
    await execute(`
      UPDATE sources SET 
        last_success_at = ?, last_error = NULL, etag = ?, last_modified = ?,
        consecutive_errors = 0
      WHERE id = ?
    `, [startTime.toISOString(), etag || null, lastModified || null, source.id]);
    
    await finalizeFetchLog(logId, 'success', items.length, articlesAdded);
    console.log(`[Scheduler] ${source.name}: Added ${articlesAdded}/${items.length} articles`);
    
    // Clean up old articles (only if we have time)
    if (globalStartTime === 0 || Date.now() - globalStartTime < timeLimit - 1000) {
      await execute(`
        DELETE FROM articles WHERE source_id = ? AND id NOT IN (
          SELECT id FROM articles WHERE source_id = ? 
          ORDER BY COALESCE(published_at, fetched_at) DESC LIMIT 500
        )
      `, [source.id, source.id]);
    }
    
    return articlesAdded;
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[Scheduler] Error processing ${source.name}:`, errorMessage);
    
    // Increment consecutive error counter for exponential backoff
    await execute(`
      UPDATE sources SET 
        last_error = ?,
        consecutive_errors = COALESCE(consecutive_errors, 0) + 1
      WHERE id = ?
    `, [errorMessage.substring(0, 500), source.id]);
    await finalizeFetchLog(logId, 'error', 0, 0, errorMessage);
    
    return 0;
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
