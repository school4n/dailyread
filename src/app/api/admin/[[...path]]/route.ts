import { NextResponse } from 'next/server';
import { queryAll, queryFirst, execute } from '@/lib/db';
import { fetchAndParseFeed } from '../../../../worker/parsers/rss';
import { runScheduler } from '@/lib/scheduler';

function isAdmin(request: Request): boolean {
  const secret = request.headers.get('X-Admin-Secret') || new URL(request.url).searchParams.get('secret');
  return secret === process.env.ADMIN_SECRET;
}

export async function GET(request: Request, context: any) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const params = await context.params;
  const path = params.path || [];
  const url = new URL(request.url);
  
  try {
    if (path[0] === 'sources' && path.length === 1) {
      const sources = await queryAll(`SELECT s.*, (SELECT COUNT(*) FROM articles WHERE source_id = s.id) as article_count FROM sources s ORDER BY s.name ASC`);
      return NextResponse.json({ success: true, data: sources });
    }
    
    if (path[0] === 'logs' && path.length === 1) {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const logs = await queryAll(`SELECT l.*, s.name as source_name FROM fetch_logs l LEFT JOIN sources s ON l.source_id = s.id ORDER BY l.started_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
      return NextResponse.json({ success: true, data: logs });
    }
    
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: any) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const params = await context.params;
  const path = params.path || [];
  
  try {
    if (path[0] === 'sources' && path.length === 1) {
      const body = await request.json();
      const result = await execute(`
        INSERT INTO sources (name, website_url, feed_url, category, language, country, fetch_interval, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [body.name, body.website_url, body.feed_url, body.category, body.language || 'vi', body.country || 'VN', Number(body.fetch_interval || 60), Number(body.enabled ?? 1)]);
      return NextResponse.json({ success: true, data: { id: result.lastInsertRowid } });
    }
    
    if (path[0] === 'sources' && path[2] === 'fetch' && path.length === 3) {
      const id = parseInt(path[1]);
      await execute('UPDATE sources SET last_fetched_at = NULL WHERE id = ?', [id]);
      
      // Run the scheduler in the background (fire and forget doesn't work perfectly in Vercel, but we try)
      runScheduler().catch(console.error);
      
      return NextResponse.json({ success: true, data: { triggered: true } });
    }
    
    if (path[0] === 'test-feed' && path.length === 1) {
      const body = await request.json();
      try {
        const result = await fetchAndParseFeed(body.feed_url, { timeout: 15000 });
        return NextResponse.json({ success: true, data: {
          valid: true, title: result.feed.title, itemCount: result.feed.items.length,
          preview: result.feed.items.slice(0, 5).map(item => ({ title: item.title, link: item.link, pubDate: item.pubDate }))
        }});
      } catch (err) {
        return NextResponse.json({ success: true, data: { valid: false, error: err instanceof Error ? err.message : 'Unknown error' }});
      }
    }
    
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const params = await context.params;
  const path = params.path || [];
  
  try {
    if (path[0] === 'sources' && path.length === 2) {
      const id = parseInt(path[1]);
      const body = await request.json();
      await execute(`
        UPDATE sources SET
          name = COALESCE(?, name), website_url = COALESCE(?, website_url), feed_url = COALESCE(?, feed_url),
          category = COALESCE(?, category), language = COALESCE(?, language), country = COALESCE(?, country),
          fetch_interval = COALESCE(?, fetch_interval), enabled = COALESCE(?, enabled), updated_at = datetime('now')
        WHERE id = ?
      `, [body.name || null, body.website_url || null, body.feed_url || null, body.category || null, body.language || null, body.country || null, body.fetch_interval || null, body.enabled !== undefined ? Number(body.enabled) : null, id]);
      return NextResponse.json({ success: true, data: { updated: true } });
    }
    
    if (path[0] === 'articles' && path.length === 2) {
      const id = parseInt(path[1]);
      const body = await request.json();
      await execute(`
        UPDATE articles SET
          category = COALESCE(?, category), tags = COALESCE(?, tags), is_hidden = COALESCE(?, is_hidden), updated_at = datetime('now')
        WHERE id = ?
      `, [body.category || null, body.tags ? JSON.stringify(body.tags) : null, body.is_hidden !== undefined ? Number(body.is_hidden) : null, id]);
      return NextResponse.json({ success: true, data: { updated: true } });
    }
    
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const params = await context.params;
  const path = params.path || [];
  
  try {
    if (path[0] === 'sources' && path.length === 2) {
      const id = parseInt(path[1]);
      await execute('DELETE FROM sources WHERE id = ?', [id]);
      return NextResponse.json({ success: true, data: { deleted: true } });
    }
    
    if (path[0] === 'articles' && path.length === 2) {
      const id = parseInt(path[1]);
      await execute('UPDATE articles SET is_hidden = 1 WHERE id = ?', [id]);
      return NextResponse.json({ success: true, data: { hidden: true } });
    }
    
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
