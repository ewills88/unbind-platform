import { Queue } from 'bullmq';
import { getRedisClient } from '@/lib/cache/redis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueueMap = Map<string, Queue<any>>;
const queues: QueueMap = new Map();

export const QUEUE_NAMES = {
  ANALYTICS_REFRESH: 'analytics-refresh',
  CACHE_INVALIDATION: 'cache-invalidation',
  NOTIFICATION_SEND: 'notification-send',
  REPORT_GENERATION: 'report-generation',
  DEADLINE_CHECK: 'deadline-check',
  MATERIALIZED_VIEW_REFRESH: 'mv-refresh',
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getQueue<T = any>(name: string): Queue<T> | null {
  const client = getRedisClient();
  if (!client) {
    console.warn(`[Queue] Redis unavailable, cannot create queue: ${name}`);
    return null;
  }

  if (!queues.has(name)) {
    const queue = new Queue<T>(name, {
      connection: {
        host: new URL(process.env.REDIS_URL!).hostname,
        port: parseInt(new URL(process.env.REDIS_URL!).port || '6379'),
        password: new URL(process.env.REDIS_URL!).password || undefined,
      },
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });
    queues.set(name, queue);
  }

  return queues.get(name) as Queue<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addJob<T = any>(
  queueName: string,
  jobName: string,
  data: T,
  options: { delay?: number; priority?: number; repeat?: { pattern: string } } = {}
): Promise<string | null> {
  const queue = getQueue<T>(queueName);
  if (!queue) {
    console.warn(`[Queue] Skipping job ${jobName} - queue unavailable`);
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const job = await queue.add(jobName as any, data as any, {
      delay: options.delay,
      priority: options.priority,
      repeat: options.repeat,
    });
    return job.id ?? null;
  } catch (err) {
    console.error(`[Queue] Failed to add job ${jobName}:`, err);
    return null;
  }
}

export async function closeAllQueues(): Promise<void> {
  const entries = Array.from(queues.entries());
  for (const [name, queue] of entries) {
    try {
      await queue.close();
    } catch (err) {
      console.error(`[Queue] Failed to close queue ${name}:`, err);
    }
  }
  queues.clear();
}
