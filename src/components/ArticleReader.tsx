'use client';

// Article Reader Component - Reader Mode
// src/components/ArticleReader.tsx

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Article } from '@/types';
import { 
  formatDateTime, getCategoryName, BookmarkStore, HistoryStore,
  getReaderFontSize, getReaderWidth, getReaderLineHeight, Settings
} from '@/lib/utils';

type ReaderTheme = 'light' | 'dark' | 'sepia';
type FontSize = 'sm' | 'md' | 'lg' | 'xl';
type TextWidth = 'narrow' | 'medium' | 'wide';

interface ArticleReaderProps {
  article: Article & { duplicate_count?: number };
}

export function ArticleReader({ article }: ArticleReaderProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('light');
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [textWidth, setTextWidth] = useState<TextWidth>('medium');
  const [showToast, setShowToast] = useState('');
  const [imgError, setImgError] = useState(false);
  
  useEffect(() => {
    // Load preferences
    setIsBookmarked(BookmarkStore.isBookmarked(article.id));
    setReaderTheme(Settings.get<ReaderTheme>('reader-theme', 'light'));
    setFontSize(Settings.get<FontSize>('reader-font-size', 'md'));
    setTextWidth(Settings.get<TextWidth>('reader-width', 'medium'));
    
    // Mark as read
    HistoryStore.add(article.id);
    
    // Apply reader theme to html
    const applyTheme = () => {
      const t = Settings.get<ReaderTheme>('reader-theme', 'light');
      document.documentElement.setAttribute('data-reader-theme', t);
    };
    applyTheme();
    
    return () => {
      document.documentElement.removeAttribute('data-reader-theme');
    };
  }, [article.id]);
  
  const toast = (message: string) => {
    setShowToast(message);
    setTimeout(() => setShowToast(''), 2000);
  };
  
  const handleBookmark = () => {
    const next = BookmarkStore.toggle(article.id);
    setIsBookmarked(next);
    toast(next ? '🔖 Đã lưu bài' : 'Đã bỏ lưu');
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || article.title,
          url: article.url,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(article.url).catch(() => {});
      toast('📋 Đã copy link');
    }
  };
  
  const cycleFontSize = () => {
    const sizes: FontSize[] = ['sm', 'md', 'lg', 'xl'];
    const next = sizes[(sizes.indexOf(fontSize) + 1) % sizes.length];
    setFontSize(next);
    Settings.set('reader-font-size', next);
  };
  
  const cycleWidth = () => {
    const widths: TextWidth[] = ['narrow', 'medium', 'wide'];
    const next = widths[(widths.indexOf(textWidth) + 1) % widths.length];
    setTextWidth(next);
    Settings.set('reader-width', next);
  };
  
  const cycleTheme = () => {
    const themes: ReaderTheme[] = ['light', 'dark', 'sepia'];
    const next = themes[(themes.indexOf(readerTheme) + 1) % themes.length];
    setReaderTheme(next);
    Settings.set('reader-theme', next);
    document.documentElement.setAttribute('data-reader-theme', next);
  };
  
  const themeLabels: Record<ReaderTheme, string> = {
    light: '☀️ Sáng',
    dark: '🌙 Tối',
    sepia: '📄 Sepia',
  };
  
  const fontSizeLabels: Record<FontSize, string> = {
    sm: 'A-',
    md: 'A',
    lg: 'A+',
    xl: 'A++',
  };
  
  const widthLabels: Record<TextWidth, string> = {
    narrow: '⬅→ Hẹp',
    medium: '← → Vừa',
    wide: '←  → Rộng',
  };
  
  const readerStyle = {
    '--reader-font-size': getReaderFontSize(fontSize),
    '--reader-width': getReaderWidth(textWidth),
    '--reader-line-height': getReaderLineHeight('normal'),
  } as React.CSSProperties;
  
  const publishedDate = article.published_at || article.fetched_at;
  const isExcerptOnly = article.content_type === 'excerpt' || !article.content;
  
  return (
    <div className="reader" style={readerStyle} data-reader-theme={readerTheme}>
      <div className="reader__inner">
        {/* Breadcrumb */}
        <nav style={{ marginBottom: 20, display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          <Link href="/" style={{ color: 'var(--accent)' }}>Home</Link>
          <span>›</span>
          <Link href={`/${article.category}`} style={{ color: 'var(--accent)' }}>
            {getCategoryName(article.category)}
          </Link>
          <span>›</span>
          <span>Bài viết</span>
        </nav>
        
        {/* Source */}
        <div className="reader__source">{article.source_name || 'Nguồn không xác định'}</div>
        
        {/* Date */}
        {publishedDate && (
          <time className="reader__date" dateTime={publishedDate}>
            {formatDateTime(publishedDate)}
          </time>
        )}
        
        {/* Title */}
        <h1 className="reader__title">{article.title}</h1>
        
        {/* Author */}
        {article.author && (
          <div className="reader__author">
            <span>✍️</span>
            <span>{article.author}</span>
          </div>
        )}
        
        {/* Hero image */}
        {article.image_url && !imgError && (
          <div className="reader__hero">
            <img
              src={article.image_url}
              alt={article.title}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          </div>
        )}
        
        {/* Duplicate notice */}
        {article.duplicate_count && article.duplicate_count > 0 && (
          <div style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}>
            📰 Tin này xuất hiện trên <strong>{article.duplicate_count + 1}</strong> nguồn khác nhau
          </div>
        )}
        
        {/* Content */}
        {isExcerptOnly ? (
          // Excerpt only - show summary and link to source
          <div>
            {article.excerpt && (
              <div className="reader__content">
                <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  {article.excerpt}
                </p>
              </div>
            )}
            
            <div style={{
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center',
              marginTop: 32,
              background: 'var(--bg-secondary)',
            }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
                Nội dung đầy đủ được cung cấp bởi nguồn gốc
              </p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ fontSize: 15, padding: '12px 24px' }}
              >
                📖 Đọc bài gốc tại {article.source_name || 'nguồn'}
              </a>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                Sẽ mở trong tab mới
              </p>
            </div>
          </div>
        ) : (
          // Full content
          <div>
            <div
              className="reader__content"
              dangerouslySetInnerHTML={{ __html: article.content || '' }}
            />
            
            {/* Source attribution */}
            <div style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: 24,
              marginTop: 32,
            }}>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: 'var(--accent)', 
                  fontSize: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                🔗 Xem bài gốc tại {article.source_name}
              </a>
            </div>
          </div>
        )}
      </div>
      
      {/* Reader Toolbar */}
      <div className="reader-toolbar">
        <button
          className="reader-toolbar__btn"
          onClick={cycleFontSize}
          aria-label="Đổi cỡ chữ"
          title="Cỡ chữ"
        >
          {fontSizeLabels[fontSize]}
        </button>
        
        <button
          className="reader-toolbar__btn"
          onClick={cycleWidth}
          aria-label="Đổi độ rộng"
          title="Độ rộng"
        >
          ↔
        </button>
        
        <button
          className="reader-toolbar__btn"
          onClick={cycleTheme}
          aria-label="Đổi theme"
          title="Theme"
        >
          {themeLabels[readerTheme]}
        </button>
        
        <button
          className={`reader-toolbar__btn ${isBookmarked ? 'reader-toolbar__btn--active' : ''}`}
          onClick={handleBookmark}
          aria-label={isBookmarked ? 'Bỏ lưu' : 'Lưu bài'}
          title={isBookmarked ? 'Bỏ lưu' : 'Lưu bài'}
        >
          {isBookmarked ? '🔖 Đã lưu' : '🔖 Lưu'}
        </button>
        
        <button
          className="reader-toolbar__btn"
          onClick={handleShare}
          aria-label="Chia sẻ"
          title="Chia sẻ"
        >
          📤 Chia sẻ
        </button>
        
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="reader-toolbar__btn"
          aria-label="Đọc tại nguồn"
        >
          🔗 Nguồn
        </a>
      </div>
      
      {/* Toast */}
      {showToast && (
        <div className="toast" role="status" aria-live="polite">
          {showToast}
        </div>
      )}
    </div>
  );
}
