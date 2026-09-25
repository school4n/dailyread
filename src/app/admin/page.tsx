'use client';

// Admin Dashboard
// src/app/admin/page.tsx

import { useState, useEffect } from 'react';
import { getStats, adminGetSources, adminGetLogs } from '@/lib/api';
import type { AdminStats, Source, FetchLog } from '@/types';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<FetchLog[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    const [statsRes, logsRes, sourcesRes] = await Promise.all([
      getStats(),
      adminGetLogs(10),
      adminGetSources(),
    ]);
    
    if (statsRes.success) setStats(statsRes.data || null);
    if (logsRes.success) setRecentLogs(logsRes.data || []);
    if (sourcesRes.success) setSources(sourcesRes.data || []);
    setLoading(false);
  };
  
  if (loading) return <LoadingState />;
  
  const errorSources = sources.filter(s => s.enabled && s.last_error);
  
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Tổng quan hệ thống DailyRead
        </p>
      </div>
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard
          icon="📰"
          title="Tổng bài viết"
          value={stats?.totalArticles || 0}
          subtitle="Trong database"
        />
        <StatCard
          icon="🔥"
          title="Bài 24 giờ qua"
          value={stats?.articlesLast24h || 0}
          subtitle="Mới nhất"
          color="#38a169"
        />
        <StatCard
          icon="✅"
          title="Nguồn hoạt động"
          value={stats?.activeSources || 0}
          subtitle="Đang fetch"
          color="#3182ce"
        />
        <StatCard
          icon="⚠️"
          title="Nguồn lỗi"
          value={stats?.errorSources || 0}
          subtitle="Cần kiểm tra"
          color={stats?.errorSources ? '#e53e3e' : 'var(--text-muted)'}
        />
      </div>
      
      {/* Error Sources Alert */}
      {errorSources.length > 0 && (
        <div style={{
          background: '#fff5f5',
          border: '1px solid #fed7d7',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 24,
        }}>
          <h3 style={{ color: '#e53e3e', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
            ⚠️ {errorSources.length} nguồn đang gặp lỗi
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {errorSources.map(s => (
              <span key={s.id} style={{ fontSize: 12, background: '#fed7d7', padding: '2px 8px', borderRadius: 4, color: '#e53e3e' }}>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent Logs */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📋 Lịch sử fetch gần đây</h2>
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
            {recentLogs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Chưa có log nào
              </div>
            ) : (
              recentLogs.map(log => (
                <LogRow key={log.id} log={log} />
              ))
            )}
          </div>
        </div>
        
        {/* Sources Status */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📡 Trạng thái nguồn</h2>
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
            {sources.slice(0, 10).map(source => (
              <SourceRow key={source.id} source={source} />
            ))}
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: 24, padding: '16px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
        <strong>Thông tin hệ thống:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>Cloudflare Workers Free: 100,000 request/ngày</li>
          <li>D1 Free: 5GB storage, 100,000 rows write/ngày</li>
          <li>Cron tự động chạy mỗi 30 phút</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color = 'var(--text-primary)' }: {
  icon: string; title: string; value: number; subtitle: string; color?: string;
}) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 10,
      padding: '20px',
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: '-0.03em', marginBottom: 4 }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div>
    </div>
  );
}

function LogRow({ log }: { log: FetchLog }) {
  const statusColor: Record<string, string> = {
    success: '#38a169',
    error: '#e53e3e',
    running: '#e6994d',
    skipped: '#718096',
  };
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      borderBottom: '1px solid var(--border-subtle)',
      fontSize: 12,
    }}>
      <span style={{
        width: 60,
        padding: '2px 6px',
        borderRadius: 4,
        background: `${statusColor[log.status]}20`,
        color: statusColor[log.status],
        fontWeight: 600,
        textAlign: 'center',
        flexShrink: 0,
      }}>
        {log.status}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {(log as FetchLog & { source_name?: string }).source_name || `Source #${log.source_id}`}
        </div>
        {log.status === 'success' && (
          <div style={{ color: 'var(--text-muted)' }}>
            +{log.articles_added} / {log.articles_found} bài
          </div>
        )}
        {log.error_message && (
          <div style={{ color: '#e53e3e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {log.error_message}
          </div>
        )}
      </div>
      <time style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: 11 }}>
        {formatRelativeTime(log.started_at)}
      </time>
    </div>
  );
}

function SourceRow({ source }: { source: Source }) {
  const hasError = Boolean(source.last_error);
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      borderBottom: '1px solid var(--border-subtle)',
      fontSize: 12,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: source.enabled
          ? (hasError ? '#e53e3e' : '#38a169')
          : '#718096',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {source.name}
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          {source.last_fetched_at
            ? `Fetch ${formatRelativeTime(source.last_fetched_at)}`
            : 'Chưa fetch'}
        </div>
      </div>
      {!source.enabled && (
        <span style={{ fontSize: 11, color: '#718096', background: '#edf2f7', padding: '1px 6px', borderRadius: 4 }}>
          Tắt
        </span>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ padding: 24 }}>
      <div className="skeleton" style={{ width: 200, height: 28, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  );
}
