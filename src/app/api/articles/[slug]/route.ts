import { NextResponse } from 'next/server';
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
    const article = await queryFirst<any>(`
      SELECT a.*, s.name as source_name
      FROM articles a LEFT JOIN sources s ON a.source_id = s.id
      WHERE a.slug = ? AND a.is_hidden = 0 LIMIT 1
    `, [slug]);
    
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
}