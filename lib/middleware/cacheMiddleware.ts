import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet, buildCacheKey } from '@/lib/cache/cacheService';

interface CacheOptions {
  ttlSeconds?: number;
  keyPrefix?: string;
  varyByQuery?: boolean;
}

export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CacheOptions = {}
) {
  const { ttlSeconds = 300, keyPrefix = 'api', varyByQuery = true } = options;

  return async (req: NextRequest): Promise<NextResponse> => {
    if (req.method !== 'GET') {
      return handler(req);
    }

    const url = new URL(req.url);
    const queryPart = varyByQuery ? url.search : '';
    const cacheKey = buildCacheKey(keyPrefix, url.pathname, queryPart);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cached = await cacheGet<{ body: any; status: number; headers: Record<string, string> }>(cacheKey);
    if (cached) {
      const response = NextResponse.json(cached.body, { status: cached.status });
      response.headers.set('X-Cache', 'HIT');
      for (const [key, value] of Object.entries(cached.headers || {})) {
        response.headers.set(key, value);
      }
      return response;
    }

    const response = await handler(req);

    if (response.status >= 200 && response.status < 300) {
      try {
        const cloned = response.clone();
        const body = await cloned.json();
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          if (!key.startsWith('x-cache')) {
            headers[key] = value;
          }
        });
        await cacheSet(cacheKey, { body, status: response.status, headers }, ttlSeconds);
      } catch {
        // Response might not be JSON, skip caching
      }
    }

    response.headers.set('X-Cache', 'MISS');
    return response;
  };
}
