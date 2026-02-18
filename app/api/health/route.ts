import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRedisClient } from '@/lib/cache/redis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: string; latency?: number };
    redis: { status: string; latency?: number };
    memory: { heapUsed: number; heapTotal: number; rss: number };
  };
}

const startTime = Date.now();

async function checkDatabase(): Promise<{ status: string; latency?: number }> {
  const start = Date.now();
  try {
    const supabase: SupabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.from('cases').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      return { status: 'error', latency };
    }
    return { status: 'connected', latency };
  } catch {
    return { status: 'error', latency: Date.now() - start };
  }
}

async function checkRedis(): Promise<{ status: string; latency?: number }> {
  const start = Date.now();
  const client = getRedisClient();

  if (!client) {
    return { status: 'not_configured' };
  }

  try {
    await client.ping();
    return { status: 'connected', latency: Date.now() - start };
  } catch {
    return { status: 'error', latency: Date.now() - start };
  }
}

export async function GET(): Promise<NextResponse> {
  const [dbCheck, redisCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const memoryUsage = process.memoryUsage();

  const overallStatus =
    dbCheck.status === 'error'
      ? 'unhealthy'
      : redisCheck.status === 'error'
        ? 'degraded'
        : 'healthy';

  const health: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.APP_VERSION || '1.0.0',
    checks: {
      database: dbCheck,
      redis: redisCheck,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
    },
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(health, { status: statusCode });
}
