import { NextResponse } from 'next/server';
import { queryFirst, execute } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const source = await queryFirst('SELECT * FROM sources WHERE id = ?', [id]);

    if (!source) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy nguồn' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: source });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await req.json();
    const { id } = await params;

    const source = await queryFirst('SELECT * FROM sources WHERE id = ?', [id]);
    if (!source) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy nguồn' }, { status: 404 });
    }

    const updates = [];
    const values = [];
    const allowedFields = ['name', 'website_url', 'feed_url', 'category', 'language', 'country', 'enabled', 'fetch_interval'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'Không có dữ liệu cập nhật' }, { status: 400 });
    }

    values.push(id);

    await execute(
      `UPDATE sources SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const source = await queryFirst('SELECT * FROM sources WHERE id = ?', [id]);
    if (!source) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy nguồn' }, { status: 404 });
    }

    await execute('DELETE FROM sources WHERE id = ?', [id]);

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
