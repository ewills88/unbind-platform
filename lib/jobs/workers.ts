import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { QUEUE_NAMES } from './queue';
import { cacheDeletePattern } from '@/lib/cache/cacheService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

function getServiceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getRedisConnection() {
  if (!process.env.REDIS_URL) return null;
  try {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password || undefined,
    };
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processAnalyticsRefresh(job: Job<any>): Promise<void> {
  const supabase = getServiceSupabase();
  const { firmId } = job.data;

  await supabase.rpc('refresh_case_summary');

  if (firmId) {
    await cacheDeletePattern(`firm:analytics:${firmId}:*`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processCacheInvalidation(job: Job<any>): Promise<void> {
  const { pattern } = job.data;
  if (pattern) {
    await cacheDeletePattern(pattern);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processDeadlineCheck(job: Job<any>): Promise<void> {
  const supabase = getServiceSupabase();
  const { firmId } = job.data;

  const { data: overdueDeadlines } = await supabase
    .from('filing_deadlines')
    .select('id, case_id, deadline_name, deadline_date, assigned_to')
    .eq('status', 'upcoming')
    .lt('deadline_date', new Date().toISOString())
    .order('deadline_date', { ascending: true });

  if (overdueDeadlines && overdueDeadlines.length > 0) {
    const notifications = overdueDeadlines.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (deadline: any) => ({
        user_id: deadline.assigned_to,
        type: 'task_assigned',
        title: 'Overdue Deadline',
        message: `Deadline "${deadline.deadline_name}" is overdue`,
        link: `/dashboard/cases/${deadline.case_id}`,
        priority: 'high',
        category: 'deadline',
      })
    );

    const validNotifications = notifications.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (n: any) => n.user_id != null
    );

    if (validNotifications.length > 0) {
      await supabase.from('client_notifications').insert(validNotifications);
    }
  }

  if (firmId) {
    await cacheDeletePattern(`case:deadlines:*`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMaterializedViewRefresh(_job: Job<any>): Promise<void> {
  const supabase = getServiceSupabase();
  await supabase.rpc('refresh_case_summary');
}

const workers: Worker[] = [];

export function startWorkers(): void {
  const connection = getRedisConnection();
  if (!connection) {
    console.warn('[Workers] Redis unavailable, workers not started');
    return;
  }

  const workerConfigs = [
    { name: QUEUE_NAMES.ANALYTICS_REFRESH, processor: processAnalyticsRefresh },
    { name: QUEUE_NAMES.CACHE_INVALIDATION, processor: processCacheInvalidation },
    { name: QUEUE_NAMES.DEADLINE_CHECK, processor: processDeadlineCheck },
    { name: QUEUE_NAMES.MATERIALIZED_VIEW_REFRESH, processor: processMaterializedViewRefresh },
  ];

  for (const config of workerConfigs) {
    const worker = new Worker(config.name, config.processor, {
      connection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000,
      },
    });

    worker.on('completed', (job: Job) => {
      console.log(`[Worker:${config.name}] Job ${job.id} completed`);
    });

    worker.on('failed', (job: Job | undefined, err: Error) => {
      console.error(`[Worker:${config.name}] Job ${job?.id} failed:`, err.message);
    });

    workers.push(worker);
  }

  console.log(`[Workers] Started ${workers.length} workers`);
}

export async function stopWorkers(): Promise<void> {
  for (const worker of workers) {
    await worker.close();
  }
  workers.length = 0;
}
