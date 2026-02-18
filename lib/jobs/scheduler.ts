import { addJob, QUEUE_NAMES } from './queue';

export async function scheduleRecurringJobs(): Promise<void> {
  // Refresh materialized view every 15 minutes
  await addJob(
    QUEUE_NAMES.MATERIALIZED_VIEW_REFRESH,
    'refresh-mv-case-summary',
    {},
    { repeat: { pattern: '*/15 * * * *' } }
  );

  // Check for overdue deadlines every hour
  await addJob(
    QUEUE_NAMES.DEADLINE_CHECK,
    'check-overdue-deadlines',
    {},
    { repeat: { pattern: '0 * * * *' } }
  );

  // Refresh analytics cache daily at 2 AM
  await addJob(
    QUEUE_NAMES.ANALYTICS_REFRESH,
    'daily-analytics-refresh',
    {},
    { repeat: { pattern: '0 2 * * *' } }
  );

  console.log('[Scheduler] Recurring jobs scheduled');
}

export async function triggerAnalyticsRefresh(firmId: string): Promise<string | null> {
  return addJob(QUEUE_NAMES.ANALYTICS_REFRESH, 'manual-analytics-refresh', { firmId });
}

export async function triggerCacheInvalidation(pattern: string): Promise<string | null> {
  return addJob(QUEUE_NAMES.CACHE_INVALIDATION, 'manual-cache-invalidation', { pattern });
}

export async function triggerDeadlineCheck(firmId?: string): Promise<string | null> {
  return addJob(QUEUE_NAMES.DEADLINE_CHECK, 'manual-deadline-check', { firmId });
}
