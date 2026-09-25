// Article Detail Page
// src/app/article/[slug]/page.tsx

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleReader } from '@/components/ArticleReader';
import type { Article } from '@/types';

import { queryFirst } from '@/lib/db';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getArticle(slug: string): Promise<(Article & { duplicate_count: number }) | null> {
  try {
    const article = await queryFirst<any>(`
      SELECT a.*, s.name as source_name
      FROM articles a LEFT JOIN sources s ON a.source_id = s.id
      WHERE a.slug = ? AND a.is_hidden = 0 LIMIT 1
    `, [slug]);
    if (!article) return null;

    const dupCount = article.duplicate_group_id 
      ? await queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM articles WHERE duplicate_group_id = ? AND id != ?', [article.duplicate_group_id, article.id])
      : null;
      
    let tags = [];
    try { if (article.tags) tags = JSON.parse(article.tags); } catch {}
    
    return { ...article, tags, is_hidden: Boolean(article.is_hidden), duplicate_count: dupCount?.count || 0 };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  
  if (!article) return { title: 'Bài viết không tìm thấy' };
  
  return {
    title: article.title,
    description: article.excerpt || `Đọc bài: ${article.title}`,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      images: article.image_url ? [{ url: article.image_url }] : [],
      type: 'article',
      publishedTime: article.published_at || undefined,
      authors: article.author ? [article.author] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt || undefined,
      images: article.image_url ? [article.image_url] : [],
    },
    alternates: {
      canonical: article.canonical_url || article.url,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  
  if (!article) {
    notFound();
  }
  
  return <ArticleReader article={article} />;
}
