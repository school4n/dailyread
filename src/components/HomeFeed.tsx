// Home Feed - Server Component that fetches data
// src/components/HomeFeed.tsx

import Link from 'next/link';
import { ArticleCard } from './ArticleCard';
import type { Article } from '@/types';
import { getCategoryIcon, getCategoryName } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api` : 'http://localhost:3000/api');

async function fetchArticles(category?: string, limit = 10): Promise<Article[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (category && category !== 'latest') params.set('category', category);
    
    const res = await fetch(`${API_URL}/articles?${params}`, {
      next: { revalidate: 300 },
    });
    
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

const HOME_SECTIONS = [
  { category: 'latest', label: 'Mới nhất', icon: '🔥', limit: 8 },
  { category: 'technology', label: 'Công nghệ', icon: '💻', limit: 5 },
  { category: 'sports', label: 'Thể thao', icon: '⚽', limit: 5 },
  { category: 'world', label: 'Thế giới', icon: '🌍', limit: 5 },
  { category: 'business', label: 'Kinh tế', icon: '📈', limit: 5 },
  { category: 'ai', label: 'AI', icon: '🤖', limit: 5 },
];

export async function HomeFeed() {
  // Fetch all sections in parallel
  const sections = await Promise.all(
    HOME_SECTIONS.map(async (section) => ({
      ...section,
      articles: await fetchArticles(
        section.category === 'latest' ? undefined : section.category, 
        section.limit
      ),
    }))
  );
  
  // Hero: first article from latest
  const latestSection = sections.find(s => s.category === 'latest');
  const heroArticle = latestSection?.articles[0];
  const remainingLatest = latestSection?.articles.slice(1) || [];
  
  return (
    <div>
      {/* Hero */}
      {heroArticle && (
        <div style={{ marginBottom: 32 }}>
          <ArticleCard article={heroArticle} isHero />
        </div>
      )}
      
      {/* Latest Section */}
      {remainingLatest.length > 0 && (
        <Section
          icon="🔥"
          title="Mới nhất"
          href="/latest"
          articles={remainingLatest}
        />
      )}
      
      {/* Category sections */}
      {sections.filter(s => s.category !== 'latest' && s.articles.length > 0).map(section => (
        <Section
          key={section.category}
          icon={section.icon}
          title={section.label}
          href={`/${section.category}`}
          articles={section.articles}
        />
      ))}
      
      {/* Empty state */}
      {sections.every(s => s.articles.length === 0) && (
        <EmptyState />
      )}
    </div>
  );
}

function Section({ 
  icon, title, href, articles 
}: { 
  icon: string; title: string; href: string; articles: Article[] 
}) {
  return (
    <section style={{ marginBottom: 40 }} aria-label={title}>
      <div className="section-header">
        <h2>
          <span>{icon}</span>
          {title}
        </h2>
        <Link href={href}>Xem thêm →</Link>
      </div>
      
      <div>
        {articles.map(article => (
          <ArticleCard key={article.id} article={article} showExcerpt />
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">📰</div>
      <h3>Chưa có tin tức</h3>
      <p>
        Hệ thống đang thu thập tin tức từ các nguồn. 
        Vui lòng kiểm tra lại sau ít phút.
      </p>
      <p style={{ marginTop: 12, fontSize: 13 }}>
        Nếu bạn là admin, hãy{' '}
        <Link href="/admin" style={{ color: 'var(--accent)' }}>
          thêm nguồn tin
        </Link>
        {' '}để bắt đầu.
      </p>
    </div>
  );
}
