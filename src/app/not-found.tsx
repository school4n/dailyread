// 404 Not Found Page
// src/app/not-found.tsx

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 - Không tìm thấy trang',
};

export default function NotFound() {
  return (
    <div className="container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>📭</div>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.03em' }}>
        404
      </h1>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Trang không tìm thấy
      </h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.6, marginBottom: 32 }}>
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
      </p>
      <Link href="/" className="btn btn-primary">
        ← Về trang chủ
      </Link>
    </div>
  );
}
