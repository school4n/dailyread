'use client';

// Admin Sources Management
// src/app/admin/sources/page.tsx

import { useState, useEffect } from 'react';
import { adminGetSources, adminCreateSource, adminUpdateSource, adminDeleteSource, adminFetchSource, adminTestFeed } from '@/lib/api';
import type { Source } from '@/types';
import { formatRelativeTime, getCategoryName, DEFAULT_CATEGORIES } from '@/lib/utils';

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [toast, setToast] = useState('');
  
  useEffect(() => {
    loadSources();
  }, []);
  
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };
  
  const loadSources = async () => {
    setLoading(true);
    const res = await adminGetSources();
    if (res.success) setSources(res.data || []);
    setLoading(false);
  };
  
  const handleToggleEnabled = async (source: Source) => {
    const res = await adminUpdateSource(source.id, { enabled: source.enabled ? 0 : 1 } as Partial<Source>);
    if (res.success) {
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, enabled: s.enabled ? 0 : 1 } : s));
      showToast(source.enabled ? 'Đã tắt nguồn' : 'Đã bật nguồn');
    }
  };
  
  const handleDelete = async (source: Source) => {
    if (!confirm(`Xóa nguồn "${source.name}"? Tất cả bài viết từ nguồn này cũng sẽ bị xóa.`)) return;
    const res = await adminDeleteSource(source.id);
    if (res.success) {
      setSources(prev => prev.filter(s => s.id !== source.id));
      showToast('Đã xóa nguồn');
    }
  };
  
  const handleFetchNow = async (source: Source) => {
    showToast(`Đang fetch ${source.name}...`);
    await adminFetchSource(source.id);
    showToast('✅ Đã trigger fetch');
    setTimeout(loadSources, 3000);
  };
  
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            📡 Nguồn tin
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Quản lý các nguồn RSS/feed
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          + Thêm nguồn
        </button>
      </div>
      
      {/* Add/Edit Form */}
      {(showAddForm || editingSource) && (
        <SourceForm
          source={editingSource}
          onClose={() => { setShowAddForm(false); setEditingSource(null); }}
          onSave={async (data) => {
            let res;
            if (editingSource) {
              res = await adminUpdateSource(editingSource.id, data as Partial<Source>);
            } else {
              res = await adminCreateSource(data as Partial<Source>);
            }
            if (res.success) {
              showToast(editingSource ? 'Đã cập nhật nguồn' : 'Đã thêm nguồn');
              setShowAddForm(false);
              setEditingSource(null);
              loadSources();
            }
          }}
        />
      )}
      
      {/* Sources Table */}
      {loading ? (
        <div>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8, marginBottom: 8 }} />
          ))}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Tên</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Chuyên mục</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Fetch cuối</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Trạng thái</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(source => (
                <tr
                  key={source.id}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{source.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                      {source.feed_url.substring(0, 50)}{source.feed_url.length > 50 ? '...' : ''}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge">{getCategoryName(source.category)}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {source.last_fetched_at ? formatRelativeTime(source.last_fetched_at) : 'Chưa fetch'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {source.last_error ? (
                      <span style={{ color: '#e53e3e', fontSize: 12 }} title={source.last_error}>
                        ⚠️ Lỗi
                      </span>
                    ) : source.enabled ? (
                      <span style={{ color: '#38a169', fontSize: 12 }}>✅ Hoạt động</span>
                    ) : (
                      <span style={{ color: '#718096', fontSize: 12 }}>⏸ Tắt</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleFetchNow(source)}
                      >
                        Fetch
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => setEditingSource(source)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleToggleEnabled(source)}
                      >
                        {source.enabled ? 'Tắt' : 'Bật'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12, color: '#e53e3e' }}
                        onClick={() => handleDelete(source)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {sources.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Chưa có nguồn nào. Nhấn &ldquo;Thêm nguồn&rdquo; để bắt đầu.
            </div>
          )}
        </div>
      )}
      
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

interface SourceFormData {
  name: string;
  website_url: string;
  feed_url: string;
  category: string;
  language: string;
  country: string;
  fetch_interval: number;
  enabled: number;
}

function SourceForm({ 
  source, onClose, onSave 
}: { 
  source: Source | null; 
  onClose: () => void; 
  onSave: (data: SourceFormData) => Promise<void>; 
}) {
  const [form, setForm] = useState<SourceFormData>({
    name: source?.name || '',
    website_url: source?.website_url || '',
    feed_url: source?.feed_url || '',
    category: source?.category || 'latest',
    language: source?.language || 'vi',
    country: source?.country || 'VN',
    fetch_interval: source?.fetch_interval || 60,
    enabled: source?.enabled ?? 1,
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; title?: string; itemCount?: number; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  
  const handleTest = async () => {
    if (!form.feed_url) return;
    setTesting(true);
    setTestResult(null);
    const res = await adminTestFeed(form.feed_url);
    if (res.success && res.data) {
      setTestResult(res.data);
    }
    setTesting(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };
  
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 520,
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
          {source ? 'Sửa nguồn' : 'Thêm nguồn mới'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Tên nguồn *">
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
                placeholder="VD: VnExpress"
              />
            </FormField>
            
            <FormField label="Website URL *">
              <input
                type="url"
                value={form.website_url}
                onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))}
                required
                placeholder="https://vnexpress.net"
              />
            </FormField>
            
            <FormField label="RSS Feed URL *">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="url"
                  value={form.feed_url}
                  onChange={e => setForm(p => ({ ...p, feed_url: e.target.value }))}
                  required
                  placeholder="https://vnexpress.net/rss/tin-moi-nhat.rss"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTest}
                  disabled={testing || !form.feed_url}
                  style={{ flexShrink: 0, padding: '6px 12px', fontSize: 12 }}
                >
                  {testing ? '...' : 'Test'}
                </button>
              </div>
              {testResult && (
                <div style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 6, fontSize: 12,
                  background: testResult.valid ? '#f0fff4' : '#fff5f5',
                  color: testResult.valid ? '#38a169' : '#e53e3e',
                  border: `1px solid ${testResult.valid ? '#c6f6d5' : '#fed7d7'}`,
                }}>
                  {testResult.valid
                    ? `✅ Hợp lệ: "${testResult.title}" - ${testResult.itemCount} bài`
                    : `❌ Lỗi: ${testResult.error}`}
                </div>
              )}
            </FormField>
            
            <FormField label="Chuyên mục *">
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              >
                {DEFAULT_CATEGORIES.filter(c => c.slug !== 'latest').map(cat => (
                  <option key={cat.slug} value={cat.slug}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </FormField>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Ngôn ngữ">
                <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </FormField>
              
              <FormField label="Fetch interval (phút)">
                <input
                  type="number"
                  min={15}
                  max={1440}
                  value={form.fetch_interval}
                  onChange={e => setForm(p => ({ ...p, fetch_interval: parseInt(e.target.value) || 60 }))}
                />
              </FormField>
            </div>
            
            <FormField label="Trạng thái">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(form.enabled)}
                  onChange={e => setForm(p => ({ ...p, enabled: e.target.checked ? 1 : 0 }))}
                />
                Kích hoạt
              </label>
            </FormField>
          </div>
          
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : (source ? 'Cập nhật' : 'Thêm nguồn')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ width: '100%' }}>
        {children}
      </div>
    </div>
  );
}
