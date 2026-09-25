import { NextResponse } from 'next/server';
import { fetchAndParseFeed } from '@/lib/parsers/rss';

export async function POST(req: Request) {
  try {
    const { feed_url } = await req.json();
    
    if (!feed_url) {
      return NextResponse.json({ success: false, error: 'Thiếu feed_url' }, { status: 400 });
    }
    
    try {
      const { feed } = await fetchAndParseFeed(feed_url, { timeout: 10000 });
      
      return NextResponse.json({
        success: true,
        data: {
          valid: true,
          title: feed.title,
          itemCount: feed.items.length,
          preview: feed.items.slice(0, 3).map((item: any) => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate
          }))
        }
      });
    } catch (parseError: any) {
      return NextResponse.json({
        success: true,
        data: {
          valid: false,
          error: parseError.message || 'Không thể đọc feed'
        }
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
