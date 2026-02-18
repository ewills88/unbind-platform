import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis
vi.mock('@/lib/cache/redis', () => ({
  getRedisClient: vi.fn(() => null),
  isRedisAvailable: vi.fn(() => false),
}));

describe('CacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when Redis is not available', () => {
    it('cacheGet should return null', async () => {
      const { cacheGet } = await import('@/lib/cache/cacheService');
      const result = await cacheGet('test-key');
      expect(result).toBeNull();
    });

    it('cacheSet should not throw', async () => {
      const { cacheSet } = await import('@/lib/cache/cacheService');
      await expect(
        cacheSet('test-key', { data: 'test' })
      ).resolves.not.toThrow();
    });

    it('cacheDelete should not throw', async () => {
      const { cacheDelete } = await import('@/lib/cache/cacheService');
      await expect(cacheDelete('test-key')).resolves.not.toThrow();
    });

    it('cacheDeletePattern should not throw', async () => {
      const { cacheDeletePattern } = await import(
        '@/lib/cache/cacheService'
      );
      await expect(
        cacheDeletePattern('test:*')
      ).resolves.not.toThrow();
    });

    it('cacheGetOrSet should call fetchFn when cache misses', async () => {
      const { cacheGetOrSet } = await import('@/lib/cache/cacheService');
      const fetchFn = vi.fn().mockResolvedValue({ data: 'fresh' });
      const result = await cacheGetOrSet('test-key', fetchFn);
      expect(fetchFn).toHaveBeenCalled();
      expect(result).toEqual({ data: 'fresh' });
    });
  });

  describe('buildCacheKey', () => {
    it('should join parts with colons', async () => {
      const { buildCacheKey } = await import('@/lib/cache/cacheService');
      expect(buildCacheKey('cases', 'list', 'user-123')).toBe(
        'cases:list:user-123'
      );
    });
  });

  describe('CACHE_KEYS', () => {
    it('should have expected key prefixes', async () => {
      const { CACHE_KEYS } = await import('@/lib/cache/cacheService');
      expect(CACHE_KEYS.CASE).toBeDefined();
      expect(CACHE_KEYS.CASES_LIST).toBeDefined();
      expect(CACHE_KEYS.INVOICES).toBeDefined();
      expect(CACHE_KEYS.HEALTH).toBeDefined();
    });
  });
});
