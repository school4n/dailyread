import { NextResponse } from 'next/server';
import { queryFirst } from '@/lib/db';
export async function GET() {
  const [total, last24h, activeSources, errorSources] = await Promise.all([
    queryFirst<{c:number}>('SELECT COUNT(*) as c FROM articles WHERE is_hidden = 0'),
    queryFirst<{c:number}>("SELECT COUNT(*) as c FROM articles WHERE is_hidden = 0 AND fetched_at >= datetime('now', '-1 day')"),
    queryFirst<{c:number}>('SELECT COUNT(*) as c FROM sources WHERE enabled = 1 AND last_error IS NULL'),
    queryFirst<{c:number}>('SELECT COUNT(*) as c FROM sources WHERE enabled = 1 AND last_error IS NOT NULL'),
  ]);
  return NextResponse.json({
    success: true,
    data: {
      totalArticles: total?.c || 0,
      articlesLast24h: last24h?.c || 0,
      activeSources: activeSources?.c || 0,
      errorSources: errorSources?.c || 0,
    }
  });
}