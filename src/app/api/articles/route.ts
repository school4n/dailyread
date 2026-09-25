import { NextResponse } from 'next/server';
import { queryAll, queryFirst } from '@/lib/db';
import type { Article } from '@/types';

function parsePagination(url: URL) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  return { limit: isNaN(limit) ? 20 : limit, offset: isNaN(offset) ? 0 : offset };
}

function formatArticle(row: any): Article {
  let tags = [];
  try { if (row.tags) tags = JSON.parse(row.tags); } catch {}
  return { ...row, tags, is_hidden: Boolean(row.is_hidden) };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { limit, offset } = parsePagination(url);
  const category = url.searchParams.get('category');
  const sourceId = url.searchParams.get('source_id');
  const period = url.searchParams.get('period');
  const sort = url.searchParams.get('sort') || 'newest';
  
  let whereClause = 'WHERE a.is_hidden = 0';
  const bindings: any[] = [];
  
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
    
  const query = `SELECT a.*, s.name as source_name FROM articles a LEFT JOIN sources s ON a.source_id = s.id ${whereClause} ${orderBy} LIMIT ? OFFSET ?`;
  const countQuery = `SELECT COUNT(*) as total FROM articles a ${whereClause}`;
  
  try {
    const [articles, countResult] = await Promise.all([
      queryAll(query, [...bindings, limit, offset]),
      queryFirst<{ total: number }>(countQuery, bindings)
    ]);
    
    const total = countResult?.total || 0;
    return NextResponse.json({
      success: true,
      data: articles.map(formatArticle),
      meta: { total, limit, offset, pages: Math.ceil(total / limit), page: Math.floor(offset / limit) + 1 }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'DB Error' }, { status: 500 });
  }
}