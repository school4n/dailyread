// Categories List Page - No styled-jsx, use inline styles
// src/app/categories/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';
import { DEFAULT_CATEGORIES } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Chuyên mục - DailyRead',
  description: 'Khám phá tất cả chuyên mục tin tức trên DailyRead.',
};

export default function CategoriesPage() {
  const categories = DEFAULT_CATEGORIES.filter(c => c.slug !== 'latest');
  
  return (
    <div className="container" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, letterSpacing: '-0.02em' }}>
        📂 Chuyên mục
      </h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
      }}>
        {categories.map(cat => (
          <CategoryCard key={cat.slug} slug={cat.slug} icon={cat.icon} name={cat.name} />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ slug, icon, name }: { slug: string; icon: string; name: string }) {
  return (
    <Link
      href={`/${slug}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '20px 16px',
        borderRadius: 12,
        border: '1px solid var(--border-color)',
        background: 'var(--bg-card)',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'var(--text-primary)',
        transition: 'all 0.2s ease',
      }}
      aria-label={name}
    >
      <span style={{ fontSize: 32 }} aria-hidden="true">{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{name}</span>
    </Link>
  );
}
