// Search page wrapper to use Suspense for useSearchParams
// src/app/search/page.tsx

import { Suspense } from 'react';
import type { Metadata } from 'next';
import SearchContent from './SearchContent';

export const metadata: Metadata = {
  title: 'Tìm kiếm - DailyRead',
  description: 'Tìm kiếm tin tức, chủ đề quan tâm trên DailyRead.',
  robots: { index: false },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: 20 }}><div className="skeleton" style={{ width: 200, height: 32, marginBottom: 20 }} /></div>}>
      <SearchContent />
    </Suspense>
  );
}
