import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

interface ErrorContext {
  url?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  [key: string]: string | number | boolean | undefined;
}

type Severity = 'info' | 'warning' | 'error' | 'critical';

// In-memory buffer for errors (flushes to DB periodically)
interface ErrorEntry {
  error_type: string;
  error_message: string;
  error_stack?: string;
  context: Record<string, unknown>;
  user_id?: string;
  url?: string;
  method?: string;
  status_code?: number;
  severity: Severity;
}

const errorBuffer: ErrorEntry[] = [];
const MAX_BUFFER_SIZE = 50;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getServiceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function flushErrors(): Promise<void> {
  if (errorBuffer.length === 0) return;

  const errors = errorBuffer.splice(0, errorBuffer.length);
  try {
    const supabase = getServiceSupabase();
    await supabase.from('error_logs').insert(errors);
  } catch (err) {
    console.error('[ErrorTracking] Failed to flush errors to DB:', err);
    // Put errors back if we couldn't save them (up to max buffer size)
    if (errorBuffer.length < MAX_BUFFER_SIZE) {
      errorBuffer.push(...errors.slice(0, MAX_BUFFER_SIZE - errorBuffer.length));
    }
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushErrors();
  }, 5000);
}

export function trackError(
  error: Error | string,
  severity: Severity = 'error',
  context: ErrorContext = {}
): void {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  const { url, method, statusCode, userId, ...extraContext } = context;

  const entry: ErrorEntry = {
    error_type: errorObj.name || 'Error',
    error_message: errorObj.message,
    error_stack: errorObj.stack,
    context: extraContext as Record<string, unknown>,
    user_id: userId,
    url,
    method,
    status_code: statusCode,
    severity,
  };

  errorBuffer.push(entry);

  // Log to console for immediate visibility
  if (severity === 'critical' || severity === 'error') {
    console.error(`[${severity.toUpperCase()}]`, errorObj.message, context);
  }

  // Flush immediately for critical errors, or schedule for others
  if (severity === 'critical' || errorBuffer.length >= MAX_BUFFER_SIZE) {
    flushErrors();
  } else {
    scheduleFlush();
  }
}

export function trackWarning(message: string, context: ErrorContext = {}): void {
  trackError(message, 'warning', context);
}

export function trackInfo(message: string, context: ErrorContext = {}): void {
  trackError(message, 'info', context);
}

export async function getRecentErrors(
  limit: number = 50,
  severity?: Severity
): Promise<ErrorEntry[]> {
  try {
    const supabase = getServiceSupabase();
    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data } = await query;
    return data || [];
  } catch {
    return [];
  }
}

export async function getErrorStats(): Promise<{
  totalErrors: number;
  last24h: number;
  bySeverity: Record<string, number>;
  topErrors: { error_type: string; count: number }[];
}> {
  try {
    const supabase = getServiceSupabase();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ count: totalErrors }, { count: last24h }, { data: recentErrors }] = await Promise.all([
      supabase.from('error_logs').select('*', { count: 'exact', head: true }),
      supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo),
      supabase
        .from('error_logs')
        .select('error_type, severity')
        .gte('created_at', oneDayAgo)
        .limit(500),
    ]);

    const bySeverity: Record<string, number> = {};
    const errorTypeCounts = new Map<string, number>();

    for (const error of recentErrors || []) {
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      errorTypeCounts.set(error.error_type, (errorTypeCounts.get(error.error_type) || 0) + 1);
    }

    const topErrors = Array.from(errorTypeCounts.entries())
      .map(([error_type, count]) => ({ error_type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: totalErrors || 0,
      last24h: last24h || 0,
      bySeverity,
      topErrors,
    };
  } catch {
    return { totalErrors: 0, last24h: 0, bySeverity: {}, topErrors: [] };
  }
}
