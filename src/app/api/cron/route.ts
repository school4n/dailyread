import { NextResponse } from 'next/server';
import { runScheduler } from '@/lib/scheduler';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// In-memory lock to prevent concurrent cron executions
// (works per serverless instance — for multi-instance, we also use DB lock)
let isRunning = false;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret) {
    // Vercel Cron sends this header automatically
    const vercelCron = request.headers.get('x-vercel-cron');
    // External services send Bearer token
    const authHeader = request.headers.get('authorization');
    // Also support ?secret= query param for easy testing
    const url = new URL(request.url);
    const querySecret = url.searchParams.get('secret');
    
    const isAuthorized = 
      vercelCron === '1' || // Vercel's built-in cron
      authHeader === `Bearer ${cronSecret}` || // External cron service
      querySecret === cronSecret; // Manual testing
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  // Prevent concurrent executions on the same instance
  if (isRunning) {
    console.log('[Cron] Already running, skipping this invocation');
    return NextResponse.json({ 
      success: false, 
      message: 'Cron job already running, skipped' 
    }, { status: 429 });
  }
  
  isRunning = true;
  
  try {
    const result = await runScheduler();
    return NextResponse.json({ 
      success: true, 
      message: 'Cron job ran successfully',
      ...result
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  } finally {
    isRunning = false;
  }
}
