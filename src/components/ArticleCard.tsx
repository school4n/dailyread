'use client';

// Article Card Component
// src/components/ArticleCard.tsx

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { Article } from '@/types';
import { formatRelativeTime, getCategoryName, BookmarkStore } from '@/lib/utils';

interface ArticleCardProps {
  article: Article;
  showExcerpt?: boolean;
  isHero?: boolean;
  onBookmarkChange?: (id: number, isBookmarked: boolean) => void;
}

export function ArticleCard({ article, showExcerpt = true, isHero = false, onBookmarkChange }: ArticleCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(() => BookmarkStore.isBookmarked(article.id));
  
  const publishedAt = article.published_at || article.fetched_at;
  const relativeTime = formatRelativeTime(publishedAt);
  const categoryName = getCategoryName(article.category);
  const articleUrl = `/article/${article.slug}`;
  
  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = BookmarkStore.toggle(article.id);
    setIsBookmarked(next);
    onBookmarkChange?.(article.id, next);
  };
  
  if (isHero) {
    return (
      <Link href={articleUrl} className="hero-card" aria-label={article.title}>
        {article.image_url && !imgError ? (
          <img
            src={article.image_url}
            alt={article.title}
            className="hero-card__img"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="hero-card__img" style={{ background: 'linear-gradient(135deg, var(--accent-light) 0%, var(--bg-tertiary) 100%)' }} />
        )}
        <div className="hero-card__overlay" />
        <div className="hero-card__content">
          <span className="hero-card__category">{categoryName}</span>
          <h2 className="hero-card__title">{article.title}</h2>
          <div className="hero-card__meta">
            {article.source_name} • {relativeTime}
          </div>
        </div>
      </Link>
    );
  }
  
  return (
    <article className="article-card" role="article">
      <Link href={articleUrl} className="article-card__body" style={{ display: 'contents' }}>
        {/* Thumbnail */}
        {article.image_url && !imgError && (
          <div className="article-card__thumb" style={{ flexShrink: 0 }}>
            <img
              src={article.image_url}
              alt=""
              onError={() => setImgError(true)}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
        
        {/* Content */}
        <div className="article-card__body">
          <div className="article-card__meta">
            <span className="article-card__source">{article.source_name || 'Unknown'}</span>
            <span>•</span>
            <span>{categoryName}</span>
            <span>•</span>
            <time dateTime={publishedAt} title={publishedAt}>
              {relativeTime}
            </time>
          </div>
          
          <h3 className="article-card__title">{article.title}</h3>
          
          {showExcerpt && article.excerpt && (
            <p className="article-card__excerpt">{article.excerpt}</p>
          )}
        </div>
      </Link>
      
      {/* Bookmark button */}
      <button
        onClick={handleBookmark}
        aria-label={isBookmarked ? 'Bỏ lưu' : 'Lưu bài'}
        title={isBookmarked ? 'Bỏ lưu' : 'Lưu bài'}
        style={{
          flexShrink: 0,
          padding: '4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: isBookmarked ? 'var(--accent)' : 'var(--text-muted)',
          transition: 'color 0.2s ease',
          alignSelf: 'flex-start',
          marginTop: '4px',
        }}
      >
        <BookmarkIcon filled={isBookmarked} />
      </button>
    </article>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

// Skeleton loading state
export function ArticleCardSkeleton() {
  return (
    <div className="article-card" style={{ cursor: 'default' }}>
      <div className="skeleton" style={{ width: 100, height: 70, borderRadius: 6, flexShrink: 0 }} />
      <div className="article-card__body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ width: '60%', height: 12 }} />
        <div className="skeleton" style={{ width: '100%', height: 16 }} />
        <div className="skeleton" style={{ width: '85%', height: 16 }} />
        <div className="skeleton" style={{ width: '70%', height: 12 }} />
      </div>
    </div>
  );
}
