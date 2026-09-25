// Home Page - Server Component
// src/app/page.tsx

import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArticleCard, ArticleCardSkeleton } from '@/components/ArticleCard';
import { CategoryScroll } from '@/components/CategoryScroll';
import { HomeFeed } from '@/components/HomeFeed';
import { DEFAULT_CATEGORIES } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'DailyRead - Đọc tin tức cá nhân',
  description: 'Tổng hợp tin tức mới nhất từ nhiều nguồn uy tín. Công nghệ, thể thao, kinh tế, giải trí và nhiều hơn nữa.',
};

// Revalidate every 5 minutes
export const revalidate = 300;

export default function HomePage() {
  return (
    <div>
      {/* Category scroll */}
      <div className="container" style={{ paddingTop: 12 }}>
        <CategoryScroll />
      </div>
      
      {/* Main feed */}
      <div className="container" style={{ paddingTop: 8 }}>
        <Suspense fallback={<HomeSkeleton />}>
          <HomeFeed />
        </Suspense>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div>
      {/* Hero skeleton */}
      <div className="skeleton" style={{ width: '100%', aspectRatio: '16/9', maxHeight: 360, borderRadius: 12, marginBottom: 32 }} />
      
      {/* Section */}
      <div style={{ marginBottom: 32 }}>
        <div className="skeleton" style={{ width: 160, height: 24, marginBottom: 16 }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
