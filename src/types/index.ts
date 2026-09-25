// DailyRead - TypeScript Types
// src/types/index.ts

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  display_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: number;
  name: string;
  website_url: string;
  feed_url: string;
  category: string;
  language: string;
  country: string;
  enabled: number;
  fetch_interval: number;
  last_fetched_at?: string;
  last_success_at?: string;
  last_error?: string;
  etag?: string;
  last_modified?: string;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  source_id: number;
  source_name?: string;
  external_id?: string;
  title: string;
  slug: string;
  url: string;
  canonical_url?: string;
  excerpt?: string;
  content?: string;
  image_url?: string;
  author?: string;
  category: string;
  tags?: string[]; // parsed from JSON
  language: string;
  published_at?: string;
  fetched_at: string;
  updated_at: string;
  content_type: 'excerpt' | 'full';
  is_hidden: number;
  duplicate_group_id?: string;
  created_at: string;
}

export interface Bookmark {
  id: number;
  article_id: number;
  article?: Article;
  created_at: string;
}

export interface FetchLog {
  id: number;
  source_id: number;
  source_name?: string;
  started_at: string;
  finished_at?: string;
  status: 'running' | 'success' | 'error' | 'skipped';
  articles_found: number;
  articles_added: number;
  error_message?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    page?: number;
    pages?: number;
  };
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface ArticleFilters {
  category?: string;
  source_id?: number;
  search?: string;
  sort?: 'newest' | 'oldest';
  period?: '24h' | '7d' | 'all';
  limit?: number;
  offset?: number;
}

export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type TextWidth = 'narrow' | 'medium' | 'wide';
export type LineHeight = 'compact' | 'normal' | 'relaxed';
export type ReaderTheme = 'light' | 'dark' | 'sepia';

export interface UserSettings {
  theme: Theme;
  fontSize: FontSize;
  textWidth: TextWidth;
  lineHeight: LineHeight;
  showImages: boolean;
  reduceMotion: boolean;
  defaultCategory: string;
  language: string;
}

export interface RssItem {
  title: string;
  link: string;
  description?: string;
  content?: string;
  pubDate?: string;
  guid?: string;
  author?: string;
  category?: string;
  enclosure?: {
    url: string;
    type?: string;
  };
  thumbnail?: string;
}

export interface ParsedFeed {
  title: string;
  link: string;
  description?: string;
  items: RssItem[];
}

export interface AdminStats {
  totalArticles: number;
  articlesLast24h: number;
  activeSources: number;
  errorSources: number;
  lastFetchAt?: string;
}

export interface SourceCreateInput {
  name: string;
  website_url: string;
  feed_url: string;
  category: string;
  language?: string;
  country?: string;
  fetch_interval?: number;
  enabled?: number;
}

export interface SourceUpdateInput extends Partial<SourceCreateInput> {
  id: number;
}
