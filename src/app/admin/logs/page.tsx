'use client';

// Admin Logs Page
// src/app/admin/logs/page.tsx

import { useState, useEffect } from 'react';
import { adminGetLogs } from '@/lib/api';
import type { FetchLog } from '@/types';
import { formatDateTime } from '@/lib/utils';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<FetchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  
  const PAGE_SIZE = 30;
  
  useEffect(() => {
    loadLogs();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const loadLogs = async () => {
    setLoading(true);
    const res = await adminGetLogs(PAGE_SIZE, (page - 1) * PAGE_SIZE);
    if (res.success) setLogs(res.data || []);
    setLoading(false);
  };
  
  const statusColor: Record<string, string> = {
    success: '#38a169',
    error: '#e53e3e',
    running: '#e6994d',
    skipped: '#718096',
  };
  
  const statusLabel: Record<string, string> = {
    success: '✅ Thành công',
    error: '❌ Lỗi',
    running: '⏳ Đang chạy',
    skipped: '⏭ Bỏ qua',
  };
  
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
          📋 Logs
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Lịch sử fetch dữ liệu từ các nguồn
        </p>
      </div>
      
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
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Nguồn</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Thời gian</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Trạng thái</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>Tìm thấy</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>Thêm mới</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {(log as FetchLog & { source_name?: string }).source_name || `Source #${log.source_id}`}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {formatDateTime(log.started_at)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: statusColor[log.status] || 'var(--text-muted)',
                    }}>
                      {statusLabel[log.status] || log.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {log.articles_found}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {log.articles_added > 0 ? (
                      <span style={{ color: '#38a169', fontWeight: 600 }}>+{log.articles_added}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {log.error_message && (
                      <span style={{ color: '#e53e3e', fontSize: 12 }} title={log.error_message}>
                        {log.error_message.substring(0, 60)}{log.error_message.length > 60 ? '...' : ''}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {logs.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Chưa có log nào
            </div>
          )}
        </div>
      )}
      
      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '20px 0' }}>
        {page > 1 && (
          <button className="btn btn-secondary" onClick={() => setPage(p => p - 1)}>
            ← Trước
          </button>
        )}
        <span style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', color: 'var(--text-muted)', fontSize: 14 }}>
          Trang {page}
        </span>
        {logs.length >= PAGE_SIZE && (
          <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)}>
            Sau →
          </button>
        )}
      </div>
    </div>
  );
}
