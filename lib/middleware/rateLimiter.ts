import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/cache/redis';

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}

// In-memory fallback when Redis is unavailable
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function cleanupInMemoryStore() {
  const now = Date.now();
  const entries = Array.from(inMemoryStore.entries());
  for (const [key, value] of entries) {
    if (value.resetAt <= now) {
      inMemoryStore.delete(key);
    }
  }
}

// Clean up every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupInMemoryStore, 60000);
}

async function checkRateLimitRedis(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const client = getRedisClient();
  if (!client) {
    return checkRateLimitInMemory(key, windowMs, maxRequests);
  }

  try {
    const now = Date.now();
    const windowKey = `ratelimit:${key}`;
    const windowSeconds = Math.ceil(windowMs / 1000);

    const multi = client.multi();
    multi.incr(windowKey);
    multi.pttl(windowKey);
    const results = await multi.exec();

    if (!results) {
      return checkRateLimitInMemory(key, windowMs, maxRequests);
    }

    const count = results[0][1] as number;
    const ttl = results[1][1] as number;

    if (ttl === -1) {
      await client.expire(windowKey, windowSeconds);
    }

    const resetAt = now + (ttl > 0 ? ttl : windowMs);
    const remaining = Math.max(0, maxRequests - count);

    return { allowed: count <= maxRequests, remaining, resetAt };
  } catch {
    return checkRateLimitInMemory(key, windowMs, maxRequests);
  }
}

function checkRateLimitInMemory(
  key: string,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    inMemoryStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { allowed: entry.count <= maxRequests, remaining, resetAt: entry.resetAt };
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: RateLimitOptions = {}
) {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyPrefix = 'api',
  } = options;

  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;
    const { allowed, remaining, resetAt } = await checkRateLimitRedis(key, windowMs, maxRequests);

    if (!allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());
      response.headers.set('Retry-After', Math.ceil((resetAt - Date.now()) / 1000).toString());
      return response;
    }

    const response = await handler(req);
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());
    return response;
  };
}
