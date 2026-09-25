import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
export async function GET() {
  const sources = await queryAll('SELECT id, name, website_url, category, language, country, enabled, last_fetched_at, last_success_at, last_error FROM sources ORDER BY name ASC');
  return NextResponse.json({ success: true, data: sources });
}