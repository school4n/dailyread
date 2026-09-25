'use client';

// Category Scroll Component
// src/components/CategoryScroll.tsx

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DEFAULT_CATEGORIES } from '@/lib/utils';

export function CategoryScroll() {
  const pathname = usePathname();
  
  const isActive = (slug: string) => {
    if (slug === 'latest') return pathname === '/';
    return pathname === `/${slug}`;
  };
  
  return (
    <div className="category-scroll" role="navigation" aria-label="Chuyên mục">
      {DEFAULT_CATEGORIES.map(cat => (
        <Link
          key={cat.slug}
          href={cat.slug === 'latest' ? '/' : `/${cat.slug}`}
          className={`category-pill ${isActive(cat.slug) ? 'category-pill--active' : ''}`}
          aria-current={isActive(cat.slug) ? 'page' : undefined}
        >
          <span aria-hidden="true">{cat.icon}</span>
          {cat.name}
        </Link>
      ))}
    </div>
  );
}
