import { NextResponse } from 'next/server';
import { queryFirst } from '@/lib/db';
import { processSource, type SourceRow } from '@/lib/scheduler';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Fetch source details
    const source = await queryFirst<SourceRow>('SELECT * FROM sources WHERE id = ?', [id]);
    
    if (!source) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy nguồn' }, { status: 404 });
    }
    
    // We don't await the processSource fully if we want to return immediately,
    // but in serverless it's better to await it so it completes before process exits.
    await processSource(source, new Date());
    
    return NextResponse.json({ success: true, data: { triggered: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
