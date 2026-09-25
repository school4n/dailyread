'use client';

// Bookmarks Page
// src/app/bookmarks/page.tsx

import { useState, useEffect } from 'react';
import { ArticleCard, ArticleCardSkeleton } from '@/components/ArticleCard';
import type { Article } from '@/types';
import { BookmarkStore } from '@/lib/utils';
import { getArticles } from '@/lib/api';

export default function BookmarksPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadBookmarks();
  }, []);
  
  const loadBookmarks = async () => {
    setLoading(true);
    const ids = BookmarkStore.getAll();
    
    if (ids.length === 0) {
      setArticles([]);
      setLoading(false);
      return;
    }
    
    // Fetch articles - we'll get all and filter by ID
    // In a full implementation, we'd have an endpoint for this
    try {
      const res = await getArticles({ limit: 100 });
      if (res.success && res.data) {
        const bookmarked = res.data.filter(a => ids.includes(a.id));
        setArticles(bookmarked);
      }
    } catch {}
    
    setLoading(false);
  };
  
  const handleBookmarkChange = (id: number, isBookmarked: boolean) => {
    if (!isBookmarked) {
      setArticles(prev => prev.filter(a => a.id !== id));
    }
  };
  
  return (
    <div className="container" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, letterSpacing: '-0.02em' }}>
        🔖 Bài đã lưu
      </h1>
      
      {loading && (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      )}
      
      {!loading && articles.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">🔖</div>
          <h3>Chưa có bài đã lưu</h3>
          <p>
            Nhấn vào icon bookmark trên các bài viết để lưu lại đọc sau.
          </p>
        </div>
      )}
      
      {!loading && articles.length > 0 && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {articles.length} bài đã lưu
          </p>
          {articles.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              showExcerpt
              onBookmarkChange={handleBookmarkChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
