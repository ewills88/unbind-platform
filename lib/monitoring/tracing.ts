import { v4 as uuidv4 } from 'uuid';

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error';
  attributes: Record<string, string | number | boolean>;
}

const activeSpans = new Map<string, Span>();
const completedSpans: Span[] = [];
const MAX_COMPLETED_SPANS = 1000;

export function startSpan(
  operation: string,
  attributes: Record<string, string | number | boolean> = {},
  parentSpanId?: string
): string {
  const spanId = uuidv4();
  const span: Span = {
    traceId: parentSpanId ? (activeSpans.get(parentSpanId)?.traceId || uuidv4()) : uuidv4(),
    spanId,
    parentSpanId,
    operation,
    startTime: Date.now(),
    status: 'ok',
    attributes,
  };

  activeSpans.set(spanId, span);
  return spanId;
}

export function endSpan(spanId: string, status: 'ok' | 'error' = 'ok'): Span | null {
  const span = activeSpans.get(spanId);
  if (!span) return null;

  span.endTime = Date.now();
  span.duration = span.endTime - span.startTime;
  span.status = status;

  activeSpans.delete(spanId);
  completedSpans.push(span);

  // Keep only the last MAX_COMPLETED_SPANS
  if (completedSpans.length > MAX_COMPLETED_SPANS) {
    completedSpans.splice(0, completedSpans.length - MAX_COMPLETED_SPANS);
  }

  return span;
}

export function addSpanAttribute(
  spanId: string,
  key: string,
  value: string | number | boolean
): void {
  const span = activeSpans.get(spanId);
  if (span) {
    span.attributes[key] = value;
  }
}

export async function withTracing<T>(
  operation: string,
  fn: () => Promise<T>,
  attributes: Record<string, string | number | boolean> = {}
): Promise<T> {
  const spanId = startSpan(operation, attributes);
  try {
    const result = await fn();
    endSpan(spanId, 'ok');
    return result;
  } catch (error) {
    endSpan(spanId, 'error');
    throw error;
  }
}

export function getRecentSpans(limit: number = 50): Span[] {
  return completedSpans.slice(-limit);
}

export function getSpanStats(): {
  totalSpans: number;
  activeSpans: number;
  avgDuration: number;
  errorRate: number;
  slowestOperations: { operation: string; avgDuration: number }[];
} {
  const total = completedSpans.length;
  const errors = completedSpans.filter((s) => s.status === 'error').length;

  const durations = completedSpans
    .filter((s) => s.duration !== undefined)
    .map((s) => s.duration as number);

  const avgDuration =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  // Group by operation and calculate average duration
  const opMap = new Map<string, number[]>();
  for (const span of completedSpans) {
    if (span.duration !== undefined) {
      const existing = opMap.get(span.operation) || [];
      existing.push(span.duration);
      opMap.set(span.operation, existing);
    }
  }

  const slowestOperations = Array.from(opMap.entries())
    .map(([operation, durs]) => ({
      operation,
      avgDuration: durs.reduce((a, b) => a + b, 0) / durs.length,
    }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 10);

  return {
    totalSpans: total,
    activeSpans: activeSpans.size,
    avgDuration,
    errorRate: total > 0 ? errors / total : 0,
    slowestOperations,
  };
}
