const fs = require('fs');
const path = require('path');

const codeArticles = `import { NextResponse } from 'next/server';
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
    
  const query = \`SELECT a.*, s.name as source_name FROM articles a LEFT JOIN sources s ON a.source_id = s.id \${whereClause} \${orderBy} LIMIT ? OFFSET ?\`;
  const countQuery = \`SELECT COUNT(*) as total FROM articles a \${whereClause}\`;
  
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
}`;

fs.writeFileSync('src/app/api/articles/route.ts', codeArticles);

const codeArticleDetail = `import { NextResponse } from 'next/server';
import { queryFirst } from '@/lib/db';

function formatArticle(row: any) {
  let tags = [];
  try { if (row.tags) tags = JSON.parse(row.tags); } catch {}
  return { ...row, tags, is_hidden: Boolean(row.is_hidden) };
}

export async function GET(request: Request, context: any) {
  const params = await context.params;
  const slug = params.slug;
  
  try {
    const article = await queryFirst<any>(\`
      SELECT a.*, s.name as source_name
      FROM articles a LEFT JOIN sources s ON a.source_id = s.id
      WHERE a.slug = ? AND a.is_hidden = 0 LIMIT 1
    \`, [slug]);
    
    if (!article) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    
    const dupCount = article.duplicate_group_id 
      ? await queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM articles WHERE duplicate_group_id = ? AND id != ?', [article.duplicate_group_id, article.id])
      : null;
      
    return NextResponse.json({
      success: true,
      data: { ...formatArticle(article), duplicate_count: dupCount?.count || 0 }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'DB Error' }, { status: 500 });
  }
}`;
fs.writeFileSync('src/app/api/articles/[slug]/route.ts', codeArticleDetail);

const codeCategories = `import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
export async function GET() {
  const categories = await queryAll('SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC');
  return NextResponse.json({ success: true, data: categories });
}`;
fs.writeFileSync('src/app/api/categories/route.ts', codeCategories);

const codeSources = `import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
export async function GET() {
  const sources = await queryAll('SELECT id, name, website_url, category, language, country, enabled, last_fetched_at, last_success_at, last_error FROM sources ORDER BY name ASC');
  return NextResponse.json({ success: true, data: sources });
}`;
fs.writeFileSync('src/app/api/sources/route.ts', codeSources);

const codeStats = `import { NextResponse } from 'next/server';
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
}`;
fs.writeFileSync('src/app/api/stats/route.ts', codeStats);

const searchCode = `import { NextResponse } from 'next/server';
import { queryAll, queryFirst } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ success: false, error: 'Query too short' }, { status: 400 });
  
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const searchTerm = \`%\${q}%\`;
  
  try {
    const articles = await queryAll<any>(\`
      SELECT a.*, s.name as source_name FROM articles a LEFT JOIN sources s ON a.source_id = s.id
      WHERE a.is_hidden = 0 AND (a.title LIKE ? OR a.excerpt LIKE ? OR a.category LIKE ?)
      ORDER BY COALESCE(a.published_at, a.fetched_at) DESC LIMIT ? OFFSET ?
    \`, [searchTerm, searchTerm, searchTerm, limit, offset]);
    
    const count = await queryFirst<{total: number}>(\`SELECT COUNT(*) as total FROM articles a WHERE a.is_hidden = 0 AND (a.title LIKE ? OR excerpt LIKE ? OR category LIKE ?)\`, [searchTerm, searchTerm, searchTerm]);
    
    const formatted = articles.map(row => {
      let tags = [];
      try { if (row.tags) tags = JSON.parse(row.tags); } catch {}
      return { ...row, tags, is_hidden: Boolean(row.is_hidden) };
    });
    
    return NextResponse.json({ success: true, data: formatted, meta: { total: count?.total || 0, limit, offset } });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'DB Error' }, { status: 500 });
  }
}`;
fs.writeFileSync('src/app/api/search/route.ts', searchCode);

console.log('Done');
