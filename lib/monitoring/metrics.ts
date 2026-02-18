import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

const register = new Registry();

collectDefaultMetrics({ register });

// HTTP request metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Database metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbQueryErrors = new Counter({
  name: 'db_query_errors_total',
  help: 'Total number of database query errors',
  labelNames: ['operation', 'table'] as const,
  registers: [register],
});

// Cache metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'] as const,
  registers: [register],
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'] as const,
  registers: [register],
});

// Active connections
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type'] as const,
  registers: [register],
});

// Background job metrics
export const jobsProcessed = new Counter({
  name: 'jobs_processed_total',
  help: 'Total number of background jobs processed',
  labelNames: ['queue', 'status'] as const,
  registers: [register],
});

export const jobDuration = new Histogram({
  name: 'job_duration_seconds',
  help: 'Background job duration in seconds',
  labelNames: ['queue'] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
  registers: [register],
});

// Business metrics
export const activeCases = new Gauge({
  name: 'active_cases_total',
  help: 'Total number of active cases',
  registers: [register],
});

export const pendingTasks = new Gauge({
  name: 'pending_tasks_total',
  help: 'Total number of pending tasks',
  registers: [register],
});

export async function getMetrics(): Promise<string> {
  return register.metrics();
}

export async function getMetricsAsJSON(): Promise<Record<string, unknown>[]> {
  const metrics = await register.getMetricsAsJSON();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return metrics as any;
}

export { register };
