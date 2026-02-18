import { getRedisClient } from './redis';

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Silently fail - cache is optional
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch {
    // Silently fail
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch {
    // Silently fail
  }
}

export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const data = await fetchFn();
  await cacheSet(key, data, ttlSeconds);
  return data;
}

export function buildCacheKey(...parts: string[]): string {
  return parts.join(':');
}

// Cache key prefixes
export const CACHE_KEYS = {
  CASE: 'case',
  CASES_LIST: 'cases:list',
  CASE_DOCUMENTS: 'case:docs',
  CASE_TASKS: 'case:tasks',
  CASE_DEADLINES: 'case:deadlines',
  INVOICES: 'invoices',
  TIME_ENTRIES: 'time_entries',
  FIRM_ANALYTICS: 'firm:analytics',
  USER_NOTIFICATIONS: 'user:notifications',
  HEALTH: 'health',
} as const;
