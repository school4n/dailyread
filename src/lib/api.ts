// API client for frontend
// src/lib/api.ts

import type { Article, Category, Source, FetchLog, ApiResponse, ArticleFilters, AdminStats } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`;
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (data as { error?: string }).error || `HTTP ${res.status}`,
      };
    }
    
    return res.json();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

// Articles
export async function getArticles(filters: ArticleFilters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.source_id) params.set('source_id', String(filters.source_id));
  if (filters.period) params.set('period', filters.period);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));
  
  const query = params.toString() ? `?${params}` : '';
  return fetchApi<Article[]>(`/articles${query}`);
}

export async function getArticle(slug: string) {
  return fetchApi<Article & { duplicate_count: number }>(`/articles/${slug}`);
}

export async function searchArticles(q: string, limit = 20, offset = 0) {
  const params = new URLSearchParams({ q, limit: String(limit), offset: String(offset) });
  return fetchApi<Article[]>(`/search?${params}`);
}

// Categories
export async function getCategories() {
  return fetchApi<Category[]>('/categories');
}

// Sources
export async function getSources() {
  return fetchApi<Source[]>('/sources');
}

// Stats
export async function getStats() {
  return fetchApi<AdminStats>('/stats');
}

// Admin API
function adminFetch<T>(path: string, options?: RequestInit) {
  const secret = typeof window !== 'undefined' 
    ? localStorage.getItem('dr-admin-secret') || ''
    : '';
  
  return fetchApi<T>(path, {
    ...options,
    headers: {
      'X-Admin-Secret': secret,
      ...options?.headers,
    },
  });
}

export async function adminGetSources() {
  return adminFetch<Source[]>('/admin/sources');
}

export async function adminCreateSource(data: Partial<Source>) {
  return adminFetch<{ id: number }>('/admin/sources', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function adminUpdateSource(id: number, data: Partial<Source>) {
  return adminFetch<{ updated: boolean }>(`/admin/sources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function adminDeleteSource(id: number) {
  return adminFetch<{ deleted: boolean }>(`/admin/sources/${id}`, {
    method: 'DELETE',
  });
}

export async function adminFetchSource(id: number) {
  return adminFetch<{ triggered: boolean }>(`/admin/sources/${id}/fetch`, {
    method: 'POST',
  });
}

export async function adminGetLogs(limit = 50, offset = 0) {
  return adminFetch<FetchLog[]>(`/admin/logs?limit=${limit}&offset=${offset}`);
}

export async function adminTestFeed(feed_url: string) {
  return adminFetch<{ valid: boolean; title?: string; itemCount?: number; preview?: Array<{ title: string; link: string; pubDate?: string }>; error?: string }>('/admin/test-feed', {
    method: 'POST',
    body: JSON.stringify({ feed_url }),
  });
}

export async function adminUpdateArticle(id: number, data: { category?: string; is_hidden?: number; tags?: string[] }) {
  return adminFetch<{ updated: boolean }>(`/admin/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function adminHideArticle(id: number) {
  return adminFetch<{ hidden: boolean }>(`/admin/articles/${id}`, {
    method: 'DELETE',
  });
}
