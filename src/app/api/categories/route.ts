import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
export async function GET() {
  const categories = await queryAll('SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC');
  return NextResponse.json({ success: true, data: categories });
}