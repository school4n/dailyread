'use client';

// Header Component
// src/components/Header.tsx

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useTheme } from './ThemeProvider';
import { debounce } from '@/lib/utils';

export function Header() {
  const { theme, setTheme, isDark } = useTheme();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((q: string) => {
      if (q.trim().length >= 2) {
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }
    }, 600),
    [router]
  );
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };
  
  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };
  
  const themeIcon = isDark ? '🌙' : '☀️';
  
  return (
    <header className="header">
      <div className="header__inner">
        {/* Logo */}
        <Link href="/" className="header__logo">
          Daily<span>Read</span>
        </Link>
        
        {/* Search - desktop */}
        <div className="header__search hidden md:block">
          <form onSubmit={handleSearchSubmit}>
            <div className="search-input">
              <SearchIcon className="search-input__icon" />
              <input
                type="search"
                placeholder="Tìm kiếm tin tức..."
                value={searchValue}
                onChange={handleSearchChange}
                aria-label="Tìm kiếm"
              />
            </div>
          </form>
        </div>
        
        {/* Actions */}
        <div className="header__actions">
          {/* Theme toggle */}
          <button
            className="btn-ghost"
            onClick={toggleTheme}
            aria-label={`Chuyển theme (hiện tại: ${theme})`}
            title={`Theme: ${theme}`}
          >
            <span style={{ fontSize: '18px' }}>{themeIcon}</span>
          </button>
          
          {/* Bookmarks */}
          <Link
            href="/bookmarks"
            className="btn-ghost"
            aria-label="Bài đã lưu"
            title="Bài đã lưu"
          >
            <BookmarkIcon />
          </Link>
          
          {/* Settings */}
          <Link
            href="/settings"
            className="btn-ghost"
            aria-label="Cài đặt"
            title="Cài đặt"
          >
            <SettingsIcon />
          </Link>
        </div>
      </div>
    </header>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
