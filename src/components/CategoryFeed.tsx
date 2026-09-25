// Category Feed Server Component
// src/components/CategoryFeed.tsx

import Link from 'next/link';
import { ArticleCard } from './ArticleCard';
import type { Article } from '@/types';

import { queryAll, queryFirst } from '@/lib/db';

const PAGE_SIZE = 20;

async function fetchCategoryArticles(
  category: string,
  sort: string,
  period: string,
  page: number
): Promise<{ articles: Article[]; total: number }> {
  try {
    const offset = (page - 1) * PAGE_SIZE;
    let whereClause = 'WHERE a.is_hidden = 0';
    const bindings: any[] = [];
    
    if (category && category !== 'latest') {
      whereClause += ' AND a.category = ?';
      bindings.push(category);
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
    
    const [articles, countResult] = await Promise.all([
      queryAll(query, [...bindings, PAGE_SIZE, offset]),
      queryFirst<{ total: number }>(countQuery, bindings)
    ]);
    
    const formatted = articles.map((row: any) => {
      let tags = [];
      try { if (row.tags) tags = JSON.parse(row.tags); } catch {}
      return { ...row, tags, is_hidden: Boolean(row.is_hidden) };
    });
    
    return {
      articles: formatted,
      total: countResult?.total || 0,
    };
  } catch {
    return { articles: [], total: 0 };
  }
}

interface Props {
  category: string;
  sort: 'newest' | 'oldest';
  period: '24h' | '7d' | 'all';
  page: number;
}

export async function CategoryFeed({ category, sort, period, page }: Props) {
  const { articles, total } = await fetchCategoryArticles(category, sort, period, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  
  if (articles.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📭</div>
        <h3>Không có bài viết</h3>
        <p>Không tìm thấy bài viết trong chuyên mục này với bộ lọc đã chọn.</p>
      </div>
    );
  }
  
  const makePageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (sort !== 'newest') params.set('sort', sort);
    if (period !== 'all') params.set('period', period);
    if (p > 1) params.set('page', String(p));
    const q = params.toString();
    return `/${category}${q ? `?${q}` : ''}`;
  };
  
  return (
    <div>
      {articles.map(article => (
        <ArticleCard key={article.id} article={article} showExcerpt />
      ))}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          padding: '24px 0',
          flexWrap: 'wrap',
        }}>
          {page > 1 && (
            <Link href={makePageUrl(page - 1)} className="btn btn-secondary">
              ← Trang trước
            </Link>
          )}
          
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '8px 16px',
            color: 'var(--text-muted)',
            fontSize: 14,
          }}>
            {page} / {totalPages}
          </span>
          
          {page < totalPages && (
            <Link href={makePageUrl(page + 1)} className="btn btn-secondary">
              Trang sau →
            </Link>
          )}
        </div>
      )}
      
      {/* Article count */}
      <p style={{ 
        textAlign: 'center', 
        fontSize: 12, 
        color: 'var(--text-muted)',
        paddingBottom: 16,
      }}>
        Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total} bài
      </p>
    </div>
  );
}
