// Category Page
// src/app/[category]/page.tsx

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryScroll } from '@/components/CategoryScroll';
import { CategoryFeed } from '@/components/CategoryFeed';
import { ArticleCardSkeleton } from '@/components/ArticleCard';
import { CATEGORY_NAMES, CATEGORY_ICONS, getCategoryName } from '@/lib/utils';

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sort?: string; period?: string; page?: string }>;
}

const VALID_CATEGORIES = Object.keys(CATEGORY_NAMES).filter(c => c !== 'latest');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  
  if (!VALID_CATEGORIES.includes(category)) return {};
  
  const name = getCategoryName(category);
  return {
    title: `${name} - DailyRead`,
    description: `Tin tức ${name} mới nhất được tổng hợp từ nhiều nguồn uy tín.`,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const { sort = 'newest', period = 'all', page = '1' } = await searchParams;
  
  // Validate category
  if (!VALID_CATEGORIES.includes(category)) {
    notFound();
  }
  
  const name = getCategoryName(category);
  const icon = CATEGORY_ICONS[category] || '📰';
  
  return (
    <div>
      {/* Category scroll */}
      <div className="container" style={{ paddingTop: 12 }}>
        <CategoryScroll />
      </div>
      
      <div className="container" style={{ paddingTop: 16 }}>
        {/* Page Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ 
            fontSize: 28, 
            fontWeight: 800, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
          }}>
            <span>{icon}</span>
            {name}
          </h1>
        </div>
        
        {/* Filters */}
        <CategoryFilters category={category} sort={sort} period={period} />
        
        {/* Feed */}
        <Suspense fallback={<SkeletonList />} key={`${category}-${sort}-${period}-${page}`}>
          <CategoryFeed 
            category={category} 
            sort={sort as 'newest' | 'oldest'} 
            period={period as '24h' | '7d' | 'all'} 
            page={parseInt(page)} 
          />
        </Suspense>
      </div>
    </div>
  );
}

function CategoryFilters({ 
  category, sort, period 
}: { 
  category: string; sort: string; period: string; 
}) {
  const makeUrl = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams();
    Object.entries({ sort, period, ...params }).forEach(([k, v]) => {
      if (v !== 'newest' && v !== 'all') searchParams.set(k, v);
    });
    const q = searchParams.toString();
    return `/${category}${q ? `?${q}` : ''}`;
  };
  
  return (
    <div style={{ 
      display: 'flex', 
      gap: 8, 
      flexWrap: 'wrap', 
      marginBottom: 20,
    }}>
      {/* Sort */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[
          { value: 'newest', label: 'Mới nhất' },
          { value: 'oldest', label: 'Cũ nhất' },
        ].map(option => (
          <a
            key={option.value}
            href={makeUrl({ sort: option.value })}
            className={`category-pill ${sort === option.value ? 'category-pill--active' : ''}`}
          >
            {option.label}
          </a>
        ))}
      </div>
      
      {/* Period */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[
          { value: 'all', label: 'Tất cả' },
          { value: '24h', label: '24 giờ' },
          { value: '7d', label: '7 ngày' },
        ].map(option => (
          <a
            key={option.value}
            href={makeUrl({ period: option.value })}
            className={`category-pill ${period === option.value ? 'category-pill--active' : ''}`}
          >
            {option.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div>
      {Array.from({ length: 10 }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Generate static params for known categories
export function generateStaticParams() {
  return VALID_CATEGORIES.map(category => ({ category }));
}
