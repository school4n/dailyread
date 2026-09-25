import { NextResponse } from 'next/server';
import { queryAll, execute } from '@/lib/db';

export async function GET() {
  try {
    const sources = await queryAll('SELECT * FROM sources ORDER BY id DESC');
    return NextResponse.json({ success: true, data: sources });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    if (!data.name || !data.website_url || !data.feed_url || !data.category) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }
    
    const result = await execute(
      `INSERT INTO sources (
        name, website_url, feed_url, category, language, country, enabled, fetch_interval
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.website_url,
        data.feed_url,
        data.category,
        data.language || 'vi',
        data.country || 'VN',
        data.enabled !== undefined ? data.enabled : 1,
        data.fetch_interval || 60
      ]
    );
    
    return NextResponse.json({ success: true, data: { id: Number(result.lastInsertRowid) } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
