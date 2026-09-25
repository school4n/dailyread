import { NextResponse } from 'next/server';
import { runScheduler } from '@/lib/scheduler';

export async function GET(request: Request) {
  // Option: Protect this route with a secret key
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Run the scheduler
    // In Vercel, this function has max 10s execution on Hobby, up to 60s on Pro.
    // We should await it but Vercel might kill it if it takes too long.
    // By keeping LIMIT 20 in scheduler, it should be fast enough, or we can lower the limit to 5 on Vercel.
    await runScheduler();
    return NextResponse.json({ success: true, message: 'Cron job ran successfully' });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
