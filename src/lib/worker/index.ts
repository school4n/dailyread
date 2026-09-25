// Cloudflare Worker entry point
// worker/index.ts

import type { Env } from './types';
import { runScheduler } from './scheduler';

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Secret',
  'Access-Control-Max-Age': '86400',
};

// JSON response helper
function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

// Success response
function success<T>(data: T, meta?: Record<string, unknown>): Response {
  return json({ success: true, data, meta: meta || null, error: null });
}

// Error response
function error(message: string, status = 400): Response {
  return json({ success: false, data: null, error: message }, status);
}

// Check admin auth
function isAdmin(request: Request, env: Env): boolean {
  const secret = request.headers.get('X-Admin-Secret') ||
    new URL(request.url).searchParams.get('secret');
  return secret === env.ADMIN_SECRET;
}

// Parse pagination params
function parsePagination(url: URL): { limit: number; offset: number } {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  return { limit: isNaN(limit) ? 20 : limit, offset: isNaN(offset) ? 0 : offset };
}

export default {
  // HTTP request handler
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route matching
      if (path === '/api/articles' && request.method === 'GET') {
        return handleGetArticles(request, env, url);
      }
      if (path.match(/^\/api\/articles\/[^/]+$/) && request.method === 'GET') {
        const slug = path.split('/').pop()!;
        return handleGetArticle(env, slug);
      }
      if (path === '/api/categories' && request.method === 'GET') {
        return handleGetCategories(env);
      }
      if (path === '/api/sources' && request.method === 'GET') {
        return handleGetSources(env);
      }
      if (path === '/api/search' && request.method === 'GET') {
        return handleSearch(env, url);
      }
      if (path === '/api/stats' && request.method === 'GET') {
        return handleGetStats(env);
      }

      // Admin routes
      if (path.startsWith('/api/admin')) {
        if (!isAdmin(request, env)) {
          return error('Unauthorized', 401);
        }
        return handleAdminRoutes(request, env, url, path);
      }

      return error('Not found', 404);
    } catch (err) {
      console.error('Worker error:', err);
      return error('Internal server error', 500);
    }
  },

  // Scheduled cron handler
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log('[Cron] Triggered at:', new Date(event.scheduledTime).toISOString());
    await runScheduler(env);
  },
};

// ─── Article Handlers ──────────────────────────────────────────────────────

async function handleGetArticles(request: Request, env: Env, url: URL): Promise<Response> {
  const { limit, offset } = parsePagination(url);
  const category = url.searchParams.get('category');
  const sourceId = url.searchParams.get('source_id');
  const period = url.searchParams.get('period'); // 24h, 7d
  const sort = url.searchParams.get('sort') || 'newest';

  let whereClause = 'WHERE a.is_hidden = 0';
  const bindings: (string | number)[] = [];

  if (category && category !== 'latest') {
    whereClause += ' AND a.category = ?';
    bindings.push(category);
  }
  if (sourceId) {
    whereClause += ' AND a.source_id = ?';
    bindings.push(parseInt(sourceId));
  }
  if (period === '24h') {
    whereClause += " AND a.published_at >= datetime('now', '-1 day')";
  } else if (period === '7d') {
    whereClause += " AND a.published_at >= datetime('now', '-7 days')";
  }

  const orderBy = sort === 'oldest'
    ? 'ORDER BY COALESCE(a.published_at, a.fetched_at) ASC'
    : 'ORDER BY COALESCE(a.published_at, a.fetched_at) DESC';

  const query = `
    SELECT a.*, s.name as source_name
    FROM articles a
    LEFT JOIN sources s ON a.source_id = s.id
    ${whereClause}
    ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM articles a ${whereClause}
  `;

  const [articles, countResult] = await Promise.all([
    env.DB.prepare(query).bind(...bindings, limit, offset).all<ArticleRow>(),
    env.DB.prepare(countQuery).bind(...bindings).first<{ total: number }>(),
  ]);

  const total = countResult?.total || 0;
  const data = (articles.results || []).map(formatArticle);

  return success(data, {
    total,
    limit,
    offset,
    pages: Math.ceil(total / limit),
    page: Math.floor(offset / limit) + 1,
  });
}

async function handleGetArticle(env: Env, slug: string): Promise<Response> {
  const article = await env.DB.prepare(`
    SELECT a.*, s.name as source_name
    FROM articles a
    LEFT JOIN sources s ON a.source_id = s.id
    WHERE a.slug = ? AND a.is_hidden = 0
    LIMIT 1
  `).bind(slug).first<ArticleRow>();

  if (!article) {
    return error('Article not found', 404);
  }

  // Get duplicate count
  const dupCount = article.duplicate_group_id
    ? await env.DB.prepare(`
        SELECT COUNT(*) as count FROM articles 
        WHERE duplicate_group_id = ? AND id != ?
      `).bind(article.duplicate_group_id, article.id).first<{ count: number }>()
    : null;

  return success({
    ...formatArticle(article),
    duplicate_count: dupCount?.count || 0,
  });
}

// ─── Category & Source Handlers ──────────────────────────────────────────

async function handleGetCategories(env: Env): Promise<Response> {
  const categories = await env.DB.prepare(`
    SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC
  `).all();

  return success(categories.results || []);
}

async function handleGetSources(env: Env): Promise<Response> {
  const sources = await env.DB.prepare(`
    SELECT id, name, website_url, category, language, country, enabled,
           last_fetched_at, last_success_at, last_error
    FROM sources
    ORDER BY name ASC
  `).all();

  return success(sources.results || []);
}

// ─── Search Handler ──────────────────────────────────────────────────────

async function handleSearch(env: Env, url: URL): Promise<Response> {
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return error('Query must be at least 2 characters');
  }

  const { limit, offset } = parsePagination(url);
  const searchTerm = `%${q}%`;

  const articles = await env.DB.prepare(`
    SELECT a.*, s.name as source_name
    FROM articles a
    LEFT JOIN sources s ON a.source_id = s.id
    WHERE a.is_hidden = 0 AND (
      a.title LIKE ? OR
      a.excerpt LIKE ? OR
      a.category LIKE ?
    )
    ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
    LIMIT ? OFFSET ?
  `).bind(searchTerm, searchTerm, searchTerm, limit, offset).all<ArticleRow>();

  const countResult = await env.DB.prepare(`
    SELECT COUNT(*) as total FROM articles a
    WHERE a.is_hidden = 0 AND (
      a.title LIKE ? OR excerpt LIKE ? OR category LIKE ?
    )
  `).bind(searchTerm, searchTerm, searchTerm).first<{ total: number }>();

  return success(
    (articles.results || []).map(formatArticle),
    { total: countResult?.total || 0, limit, offset }
  );
}

// ─── Stats Handler ───────────────────────────────────────────────────────

async function handleGetStats(env: Env): Promise<Response> {
  const [total, last24h, activeSources, errorSources] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as c FROM articles WHERE is_hidden = 0').first<{ c: number }>(),
    env.DB.prepare(`SELECT COUNT(*) as c FROM articles WHERE is_hidden = 0 AND fetched_at >= datetime('now', '-1 day')`).first<{ c: number }>(),
    env.DB.prepare('SELECT COUNT(*) as c FROM sources WHERE enabled = 1 AND last_error IS NULL').first<{ c: number }>(),
    env.DB.prepare('SELECT COUNT(*) as c FROM sources WHERE enabled = 1 AND last_error IS NOT NULL').first<{ c: number }>(),
  ]);

  return success({
    totalArticles: total?.c || 0,
    articlesLast24h: last24h?.c || 0,
    activeSources: activeSources?.c || 0,
    errorSources: errorSources?.c || 0,
  });
}

// ─── Admin Handlers ──────────────────────────────────────────────────────

async function handleAdminRoutes(
  request: Request,
  env: Env,
  url: URL,
  path: string
): Promise<Response> {
  // GET /api/admin/sources
  if (path === '/api/admin/sources' && request.method === 'GET') {
    const sources = await env.DB.prepare(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM articles WHERE source_id = s.id) as article_count
      FROM sources s
      ORDER BY s.name ASC
    `).all();
    return success(sources.results || []);
  }

  // POST /api/admin/sources
  if (path === '/api/admin/sources' && request.method === 'POST') {
    const body = await request.json() as Record<string, unknown>;
    const { name, website_url, feed_url, category, language, country, fetch_interval, enabled } = body;

    if (!name || !website_url || !feed_url || !category) {
      return error('Missing required fields: name, website_url, feed_url, category');
    }

    const result = await env.DB.prepare(`
      INSERT INTO sources (name, website_url, feed_url, category, language, country, fetch_interval, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      String(name), String(website_url), String(feed_url), String(category),
      String(language || 'vi'), String(country || 'VN'),
      Number(fetch_interval || 60), Number(enabled ?? 1)
    ).run();

    return success({ id: result.meta.last_row_id });
  }

  // PUT /api/admin/sources/:id
  const sourceMatch = path.match(/^\/api\/admin\/sources\/(\d+)$/);
  if (sourceMatch && request.method === 'PUT') {
    const id = parseInt(sourceMatch[1]);
    const body = await request.json() as Record<string, unknown>;

    await env.DB.prepare(`
      UPDATE sources SET
        name = COALESCE(?, name),
        website_url = COALESCE(?, website_url),
        feed_url = COALESCE(?, feed_url),
        category = COALESCE(?, category),
        language = COALESCE(?, language),
        country = COALESCE(?, country),
        fetch_interval = COALESCE(?, fetch_interval),
        enabled = COALESCE(?, enabled),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.name || null, body.website_url || null, body.feed_url || null,
      body.category || null, body.language || null, body.country || null,
      body.fetch_interval || null, body.enabled !== undefined ? Number(body.enabled) : null,
      id
    ).run();

    return success({ updated: true });
  }

  // DELETE /api/admin/sources/:id
  if (sourceMatch && request.method === 'DELETE') {
    const id = parseInt(sourceMatch[1]);
    await env.DB.prepare('DELETE FROM sources WHERE id = ?').bind(id).run();
    return success({ deleted: true });
  }

  // POST /api/admin/sources/:id/fetch - trigger manual fetch
  const fetchMatch = path.match(/^\/api\/admin\/sources\/(\d+)\/fetch$/);
  if (fetchMatch && request.method === 'POST') {
    const id = parseInt(fetchMatch[1]);

    // Reset last_fetched_at to trigger immediate fetch
    await env.DB.prepare(`
      UPDATE sources SET last_fetched_at = NULL WHERE id = ?
    `).bind(id).run();

    // Actually run the fetch now
    const source = await env.DB.prepare(`
      SELECT id, name, feed_url, category, language, fetch_interval,
             last_fetched_at, etag, last_modified
      FROM sources WHERE id = ?
    `).bind(id).first();

    if (!source) return error('Source not found', 404);

    // Run fetch in background (fire and forget due to Worker limitations)
    const { runScheduler } = await import('./scheduler');
    // We can't easily run single source here, so just trigger full scheduler
    await runScheduler(env);

    return success({ triggered: true });
  }

  // GET /api/admin/logs
  if (path === '/api/admin/logs' && request.method === 'GET') {
    const { limit, offset } = parsePagination(url);
    const logs = await env.DB.prepare(`
      SELECT l.*, s.name as source_name
      FROM fetch_logs l
      LEFT JOIN sources s ON l.source_id = s.id
      ORDER BY l.started_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return success(logs.results || []);
  }

  // DELETE /api/admin/articles/:id
  const articleMatch = path.match(/^\/api\/admin\/articles\/(\d+)$/);
  if (articleMatch && request.method === 'DELETE') {
    const id = parseInt(articleMatch[1]);
    await env.DB.prepare(`UPDATE articles SET is_hidden = 1 WHERE id = ?`).bind(id).run();
    return success({ hidden: true });
  }

  // PUT /api/admin/articles/:id
  if (articleMatch && request.method === 'PUT') {
    const id = parseInt(articleMatch[1]);
    const body = await request.json() as Record<string, unknown>;

    await env.DB.prepare(`
      UPDATE articles SET
        category = COALESCE(?, category),
        tags = COALESCE(?, tags),
        is_hidden = COALESCE(?, is_hidden),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.category || null,
      body.tags ? JSON.stringify(body.tags) : null,
      body.is_hidden !== undefined ? Number(body.is_hidden) : null,
      id
    ).run();

    return success({ updated: true });
  }

  // POST /api/admin/test-feed
  if (path === '/api/admin/test-feed' && request.method === 'POST') {
    const body = await request.json() as { feed_url: string };
    if (!body.feed_url) return error('feed_url required');

    try {
      const { fetchAndParseFeed } = await import('./parsers/rss');
      const result = await fetchAndParseFeed(body.feed_url, { timeout: 15000 });
      return success({
        valid: true,
        title: result.feed.title,
        itemCount: result.feed.items.length,
        preview: result.feed.items.slice(0, 5).map(item => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
        })),
      });
    } catch (err) {
      return success({
        valid: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return error('Not found', 404);
}

// ─── Formatting Helper ───────────────────────────────────────────────────

interface ArticleRow {
  id: number;
  source_id: number;
  source_name?: string;
  external_id?: string;
  title: string;
  slug: string;
  url: string;
  canonical_url?: string;
  excerpt?: string;
  content?: string;
  image_url?: string;
  author?: string;
  category: string;
  tags?: string;
  language: string;
  published_at?: string;
  fetched_at: string;
  updated_at: string;
  content_type: string;
  is_hidden: number;
  duplicate_group_id?: string;
  created_at: string;
}

function formatArticle(row: ArticleRow) {
  let tags: string[] = [];
  try {
    if (row.tags) tags = JSON.parse(row.tags);
  } catch {
    tags = [];
  }

  return {
    ...row,
    tags,
    is_hidden: Boolean(row.is_hidden),
  };
}

// Scheduled event type for TypeScript
interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
  waitUntil(promise: Promise<unknown>): void;
}
