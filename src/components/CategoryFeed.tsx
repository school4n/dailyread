// Category Feed Server Component
// src/components/CategoryFeed.tsx

import Link from 'next/link';
import { ArticleCard } from './ArticleCard';
import type { Article } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8787/api';
const PAGE_SIZE = 20;

async function fetchCategoryArticles(
  category: string,
  sort: string,
  period: string,
  page: number
): Promise<{ articles: Article[]; total: number }> {
  try {
    const offset = (page - 1) * PAGE_SIZE;
    const params = new URLSearchParams({
      category,
      sort,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (period !== 'all') params.set('period', period);
    
    const res = await fetch(`${API_URL}/articles?${params}`, {
      next: { revalidate: 300 },
    });
    
    if (!res.ok) return { articles: [], total: 0 };
    const data = await res.json();
    return {
      articles: data.data || [],
      total: data.meta?.total || 0,
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
