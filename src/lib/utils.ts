// Utility functions
// src/lib/utils.ts

/**
 * Format relative time in Vietnamese
 */
export function formatRelativeTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    
    // Format date in Vietnamese style: DD/MM/YYYY
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Format full datetime in Vietnamese
 */
export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Map category slug to display name
 */
export const CATEGORY_NAMES: Record<string, string> = {
  latest: 'Mới nhất',
  vietnam: 'Việt Nam',
  world: 'Thế giới',
  technology: 'Công nghệ',
  sports: 'Thể thao',
  business: 'Kinh tế',
  science: 'Khoa học',
  entertainment: 'Giải trí',
  game: 'Game',
  auto: 'Ô tô',
  mobile: 'Điện thoại',
  computer: 'Máy tính',
  ai: 'AI',
  football: 'Bóng đá',
};

/**
 * Map category slug to emoji icon
 */
export const CATEGORY_ICONS: Record<string, string> = {
  latest: '🔥',
  vietnam: '🇻🇳',
  world: '🌍',
  technology: '💻',
  sports: '⚽',
  business: '📈',
  science: '🔬',
  entertainment: '🎭',
  game: '🎮',
  auto: '🚗',
  mobile: '📱',
  computer: '🖥️',
  ai: '🤖',
  football: '⚽',
};

export function getCategoryName(slug: string): string {
  return CATEGORY_NAMES[slug] || slug;
}

export function getCategoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] || '📰';
}

/**
 * Get all default categories for navigation
 */
export const DEFAULT_CATEGORIES = Object.entries(CATEGORY_NAMES).map(([slug, name]) => ({
  slug,
  name,
  icon: CATEGORY_ICONS[slug] || '📰',
}));

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

/**
 * Class name helper
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Debounce function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Extract domain from URL for display
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Get reader font size class
 */
export function getReaderFontSize(size: string): string {
  const sizes: Record<string, string> = {
    sm: '16px',
    md: '18px',
    lg: '20px',
    xl: '22px',
  };
  return sizes[size] || '18px';
}

/**
 * Get reader text width
 */
export function getReaderWidth(width: string): string {
  const widths: Record<string, string> = {
    narrow: '580px',
    medium: '680px',
    wide: '780px',
  };
  return widths[width] || '680px';
}

/**
 * Get reader line height
 */
export function getReaderLineHeight(height: string): string {
  const heights: Record<string, string> = {
    compact: '1.6',
    normal: '1.75',
    relaxed: '1.9',
  };
  return heights[height] || '1.75';
}

/**
 * Bookmark management using localStorage
 */
export const BookmarkStore = {
  getAll(): number[] {
    try {
      const data = localStorage.getItem('dr-bookmarks');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  
  isBookmarked(articleId: number): boolean {
    return this.getAll().includes(articleId);
  },
  
  toggle(articleId: number): boolean {
    const current = this.getAll();
    const index = current.indexOf(articleId);
    let isNowBookmarked: boolean;
    
    if (index === -1) {
      current.push(articleId);
      isNowBookmarked = true;
    } else {
      current.splice(index, 1);
      isNowBookmarked = false;
    }
    
    localStorage.setItem('dr-bookmarks', JSON.stringify(current));
    return isNowBookmarked;
  },
  
  add(articleId: number): void {
    const current = this.getAll();
    if (!current.includes(articleId)) {
      current.push(articleId);
      localStorage.setItem('dr-bookmarks', JSON.stringify(current));
    }
  },
  
  remove(articleId: number): void {
    const current = this.getAll().filter(id => id !== articleId);
    localStorage.setItem('dr-bookmarks', JSON.stringify(current));
  }
};

/**
 * Reading history using localStorage
 */
export const HistoryStore = {
  add(articleId: number): void {
    try {
      const history = this.getAll();
      const updated = [
        { id: articleId, readAt: new Date().toISOString() },
        ...history.filter(h => h.id !== articleId),
      ].slice(0, 100); // Keep last 100
      localStorage.setItem('dr-history', JSON.stringify(updated));
    } catch {}
  },
  
  getAll(): Array<{ id: number; readAt: string }> {
    try {
      const data = localStorage.getItem('dr-history');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  
  isRead(articleId: number): boolean {
    return this.getAll().some(h => h.id === articleId);
  }
};

/**
 * Settings using localStorage
 */
export const Settings = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const value = localStorage.getItem(`dr-${key}`);
      return value !== null ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`dr-${key}`, JSON.stringify(value));
    } catch {}
  }
};
