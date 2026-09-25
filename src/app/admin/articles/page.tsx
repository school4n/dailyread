'use client';

// Admin Articles Management
// src/app/admin/articles/page.tsx

import { useState, useEffect } from 'react';
import { getArticles, adminHideArticle } from '@/lib/api';
import type { Article } from '@/types';
import { formatRelativeTime, getCategoryName } from '@/lib/utils';

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterCategory, setFilterCategory] = useState('');
  const [toast, setToast] = useState('');
  
  const PAGE_SIZE = 30;
  
  useEffect(() => {
    loadArticles();
  }, [page, filterCategory]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };
  
  const loadArticles = async () => {
    setLoading(true);
    const res = await getArticles({
      category: filterCategory || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    if (res.success && res.data) {
      setArticles(res.data);
      setTotal(res.meta?.total || 0);
    }
    setLoading(false);
  };
  
  const handleHide = async (article: Article) => {
    if (!confirm(`Ẩn bài "${article.title}"?`)) return;
    const res = await adminHideArticle(article.id);
    if (res.success) {
      setArticles(prev => prev.filter(a => a.id !== article.id));
      showToast('Đã ẩn bài viết');
    }
  };
  
  const totalPages = Math.ceil(total / PAGE_SIZE);
  
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
          📰 Bài viết
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Quản lý bài viết trong database ({total.toLocaleString()} bài)
        </p>
      </div>
      
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select
          value={filterCategory}
          onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: 13,
          }}
        >
          <option value="">Tất cả chuyên mục</option>
          <option value="latest">Mới nhất</option>
          <option value="technology">Công nghệ</option>
          <option value="sports">Thể thao</option>
          <option value="business">Kinh tế</option>
          <option value="world">Thế giới</option>
          <option value="science">Khoa học</option>
          <option value="entertainment">Giải trí</option>
        </select>
      </div>
      
      {/* Table */}
      {loading ? (
        <div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8, marginBottom: 8 }} />
          ))}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Tiêu đề</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Nguồn</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Chuyên mục</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Thời gian</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(article => (
                <tr key={article.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', maxWidth: 300 }}>
                    <div style={{
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {article.title}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {article.source_name}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge">{getCategoryName(article.category)}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {formatRelativeTime(article.published_at || article.fetched_at)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <a
                        href={`/article/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                      >
                        Xem
                      </a>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12, color: '#e53e3e' }}
                        onClick={() => handleHide(article)}
                      >
                        Ẩn
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {articles.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Không có bài viết nào
            </div>
          )}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '20px 0' }}>
          {page > 1 && (
            <button className="btn btn-secondary" onClick={() => setPage(p => p - 1)}>← Trước</button>
          )}
          <span style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', color: 'var(--text-muted)', fontSize: 14 }}>
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)}>Sau →</button>
          )}
        </div>
      )}
      
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
