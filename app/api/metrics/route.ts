import { NextRequest, NextResponse } from 'next/server';
import { getMetrics, getMetricsAsJSON } from '@/lib/monitoring/metrics';
import { getSpanStats } from '@/lib/monitoring/tracing';
import { getErrorStats } from '@/lib/monitoring/errorTracking';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const accept = req.headers.get('accept') || '';
  const format = req.nextUrl.searchParams.get('format');

  // Return Prometheus text format
  if (format === 'prometheus' || accept.includes('text/plain')) {
    const metrics = await getMetrics();
    return new NextResponse(metrics, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // Return JSON format with combined metrics
  const [metricsJSON, spanStats, errorStats] = await Promise.all([
    getMetricsAsJSON(),
    Promise.resolve(getSpanStats()),
    getErrorStats(),
  ]);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    metrics: metricsJSON,
    tracing: spanStats,
    errors: errorStats,
  });
}
