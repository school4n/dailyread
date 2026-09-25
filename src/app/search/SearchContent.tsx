'use client';

// Search Content Client Component
// src/app/search/SearchContent.tsx

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArticleCard, ArticleCardSkeleton } from '@/components/ArticleCard';
import type { Article } from '@/types';
import { debounce } from '@/lib/utils';
import { searchArticles } from '@/lib/api';

const PAGE_SIZE = 20;

export default function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  
  const doSearch = useCallback(async (q: string, p = 1) => {
    if (q.trim().length < 2) {
      setResults([]);
      setTotal(0);
      setSearched(false);
      return;
    }
    
    setLoading(true);
    setSearched(true);
    
    try {
      const res = await searchArticles(q.trim(), PAGE_SIZE, (p - 1) * PAGE_SIZE);
      if (res.success && res.data) {
        setResults(res.data);
        setTotal(res.meta?.total || 0);
      }
    } catch {}
    
    setLoading(false);
  }, []);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((q: string) => {
      setPage(1);
      doSearch(q, 1);
      if (q.trim().length >= 2) {
        router.replace(`/search?q=${encodeURIComponent(q.trim())}`, { scroll: false });
      }
    }, 500),
    [doSearch, router]
  );
  
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    if (q) doSearch(q, 1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    doSearch(query, 1);
  };
  
  const totalPages = Math.ceil(total / PAGE_SIZE);
  
  return (
    <div className="container" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, letterSpacing: '-0.02em' }}>
        🔍 Tìm kiếm
      </h1>
      
      {/* Search form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div className="search-input" style={{ maxWidth: 600 }}>
          <svg
            className="search-input__icon"
            width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Tìm kiếm tin tức, chủ đề..."
            value={query}
            onChange={handleInputChange}
            autoFocus
            autoComplete="off"
            aria-label="Tìm kiếm"
            style={{ padding: '12px 12px 12px 44px', fontSize: 16, borderRadius: 10 }}
          />
        </div>
      </form>
      
      {/* Results */}
      {loading && (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      )}
      
      {!loading && searched && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <h3>Không tìm thấy kết quả</h3>
          <p>Thử tìm kiếm với từ khóa khác hoặc kiểm tra chính tả.</p>
        </div>
      )}
      
      {!loading && results.length > 0 && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Tìm thấy <strong>{total}</strong> bài viết cho &ldquo;{query}&rdquo;
          </p>
          
          {results.map(article => (
            <ArticleCard key={article.id} article={article} showExcerpt />
          ))}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '24px 0' }}>
              {page > 1 && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const p = page - 1;
                    setPage(p);
                    doSearch(query, p);
                  }}
                >
                  ← Trang trước
                </button>
              )}
              <span style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', color: 'var(--text-muted)', fontSize: 14 }}>
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const p = page + 1;
                    setPage(p);
                    doSearch(query, p);
                  }}
                >
                  Trang sau →
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {!searched && (
        <div className="empty-state">
          <div className="empty-state__icon">💡</div>
          <h3>Bắt đầu tìm kiếm</h3>
          <p>Nhập từ khóa để tìm tin tức bạn quan tâm.</p>
        </div>
      )}
    </div>
  );
}
