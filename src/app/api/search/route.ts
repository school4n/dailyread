import { NextResponse } from 'next/server';
import { queryAll, queryFirst } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ success: false, error: 'Query too short' }, { status: 400 });
  
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const searchTerm = `%${q}%`;
  
  try {
    const articles = await queryAll<any>(`
      SELECT a.*, s.name as source_name FROM articles a LEFT JOIN sources s ON a.source_id = s.id
      WHERE a.is_hidden = 0 AND (a.title LIKE ? OR a.excerpt LIKE ? OR a.category LIKE ?)
      ORDER BY COALESCE(a.published_at, a.fetched_at) DESC LIMIT ? OFFSET ?
    `, [searchTerm, searchTerm, searchTerm, limit, offset]);
    
    const count = await queryFirst<{total: number}>(`SELECT COUNT(*) as total FROM articles a WHERE a.is_hidden = 0 AND (a.title LIKE ? OR excerpt LIKE ? OR category LIKE ?)`, [searchTerm, searchTerm, searchTerm]);
    
    const formatted = articles.map(row => {
      let tags = [];
      try { if (row.tags) tags = JSON.parse(row.tags); } catch {}
      return { ...row, tags, is_hidden: Boolean(row.is_hidden) };
    });
    
    return NextResponse.json({ success: true, data: formatted, meta: { total: count?.total || 0, limit, offset } });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'DB Error' }, { status: 500 });
  }
}