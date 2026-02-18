import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase for error tracking
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        gte: vi.fn(() =>
          Promise.resolve({ count: 0, error: null })
        ),
      })),
    })),
  })),
}));

describe('Metrics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return JSON metrics by default', async () => {
    const { GET } = await import('@/app/api/metrics/route');
    const req = new NextRequest('http://localhost:3000/api/metrics');
    const response = await GET(req);
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    expect(data.metrics).toBeDefined();
    expect(data.tracing).toBeDefined();
    expect(data.errors).toBeDefined();
  });

  it('should return prometheus format when requested', async () => {
    const { GET } = await import('@/app/api/metrics/route');
    const req = new NextRequest(
      'http://localhost:3000/api/metrics?format=prometheus'
    );
    const response = await GET(req);

    expect(response.headers.get('content-type')).toContain('text/plain');
  });

  it('should include tracing stats', async () => {
    const { GET } = await import('@/app/api/metrics/route');
    const req = new NextRequest('http://localhost:3000/api/metrics');
    const response = await GET(req);
    const data = await response.json();

    expect(data.tracing).toHaveProperty('totalSpans');
    expect(data.tracing).toHaveProperty('activeSpans');
    expect(data.tracing).toHaveProperty('avgDuration');
    expect(data.tracing).toHaveProperty('errorRate');
  });

  it('should include error stats', async () => {
    const { GET } = await import('@/app/api/metrics/route');
    const req = new NextRequest('http://localhost:3000/api/metrics');
    const response = await GET(req);
    const data = await response.json();

    expect(data.errors).toHaveProperty('totalErrors');
    expect(data.errors).toHaveProperty('last24h');
    expect(data.errors).toHaveProperty('bySeverity');
    expect(data.errors).toHaveProperty('topErrors');
  });
});
