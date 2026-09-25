// Article Detail Page
// src/app/article/[slug]/page.tsx

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleReader } from '@/components/ArticleReader';
import type { Article } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api` : 'http://localhost:3000/api');

interface Props {
  params: Promise<{ slug: string }>;
}

async function getArticle(slug: string): Promise<(Article & { duplicate_count: number }) | null> {
  try {
    const res = await fetch(`${API_URL}/articles/${slug}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
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
