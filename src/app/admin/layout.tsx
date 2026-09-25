'use client';

// Admin Layout
// src/app/admin/layout.tsx

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [secret, setSecret] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  
  useEffect(() => {
    const saved = localStorage.getItem('dr-admin-secret');
    if (saved) {
      setAuthenticated(true);
      setSecret(saved);
    } else {
      setAuthenticated(false);
    }
  }, []);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (secret.trim()) {
      localStorage.setItem('dr-admin-secret', secret.trim());
      setAuthenticated(true);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('dr-admin-secret');
    setAuthenticated(false);
    setSecret('');
  };
  
  if (authenticated === null) return null; // Loading
  
  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 16,
          padding: '40px 32px',
          width: '100%',
          maxWidth: 400,
          boxShadow: 'var(--shadow-lg)',
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
            🔐 Admin Login
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
            Nhập admin secret để tiếp tục
          </p>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <input
                type="password"
                placeholder="Admin Secret"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
              Đăng nhập
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/sources', label: 'Nguồn tin', icon: '📡' },
    { href: '/admin/articles', label: 'Bài viết', icon: '📰' },
    { href: '/admin/logs', label: 'Logs', icon: '📋' },
  ];
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
      }}>
        <div style={{ padding: '8px 16px', marginBottom: 8 }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.03em', textDecoration: 'none' }}>
            Daily<span style={{ color: 'var(--text-primary)' }}>Read</span>
          </Link>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Admin
          </div>
        </div>
        
        <nav>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-item ${
                (item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href))
                  ? 'admin-nav-item--active'
                  : ''
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div style={{ marginTop: 'auto', padding: '16px' }}>
          <Link href="/" className="admin-nav-item" style={{ fontSize: 13 }}>
            ← Về trang chủ
          </Link>
          <button
            onClick={handleLogout}
            className="admin-nav-item"
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e' }}
          >
            🚪 Đăng xuất
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
