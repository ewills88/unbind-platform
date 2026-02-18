import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [{ id: '1' }], error: null })),
      })),
    })),
  })),
}));

// Mock Redis
vi.mock('@/lib/cache/redis', () => ({
  getRedisClient: vi.fn(() => null),
  isRedisAvailable: vi.fn(() => false),
}));

describe('Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return health status', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(data.status).toBeDefined();
    expect(data.timestamp).toBeDefined();
    expect(data.uptime).toBeDefined();
    expect(data.checks).toBeDefined();
    expect(data.checks.database).toBeDefined();
    expect(data.checks.redis).toBeDefined();
    expect(data.checks.memory).toBeDefined();
  });

  it('should include memory information', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(data.checks.memory.heapUsed).toBeGreaterThan(0);
    expect(data.checks.memory.heapTotal).toBeGreaterThan(0);
    expect(data.checks.memory.rss).toBeGreaterThan(0);
  });

  it('should report redis as not_configured when unavailable', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(data.checks.redis.status).toBe('not_configured');
  });

  it('should return 200 for healthy status', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET();

    expect(response.status).toBeLessThanOrEqual(200);
  });
});
