import { createClient } from '@supabase/supabase-js';
import { cacheGetOrSet, buildCacheKey, CACHE_KEYS } from '@/lib/cache/cacheService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

function getServiceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function batchFetch<T>(
  table: string,
  ids: string[],
  selectFields: string = '*'
): Promise<T[]> {
  if (ids.length === 0) return [];

  const supabase = getServiceSupabase();
  const uniqueIds = Array.from(new Set(ids));

  // Batch in groups of 50 to avoid query size limits
  const batchSize = 50;
  const results: T[] = [];

  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from(table)
      .select(selectFields)
      .in('id', batch);

    if (error) {
      console.error(`[QueryOptimizer] Batch fetch error for ${table}:`, error.message);
      continue;
    }

    if (data) {
      results.push(...data);
    }
  }

  return results;
}

export async function getCasesPaginated(
  attorneyId: string,
  options: PaginationOptions = {}
): Promise<PaginatedResult<Record<string, unknown>>> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options;

  const cacheKey = buildCacheKey(
    CACHE_KEYS.CASES_LIST,
    attorneyId,
    `${page}`,
    `${pageSize}`,
    sortBy,
    sortOrder
  );

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const supabase = getServiceSupabase();
      const offset = (page - 1) * pageSize;

      const { count } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('attorney_id', attorneyId);

      const { data, error } = await supabase
        .from('cases')
        .select('id, case_number, case_type, status, client_id, attorney_id, created_at, updated_at')
        .eq('attorney_id', attorneyId)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch cases: ${error.message}`);
      }

      const total = count || 0;
      return {
        data: data || [],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    120 // 2 minute cache
  );
}

export async function prefetchCaseRelations(caseId: string): Promise<{
  documents: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  deadlines: Record<string, unknown>[];
  timeEntries: Record<string, unknown>[];
}> {
  const supabase = getServiceSupabase();

  type Row = Record<string, unknown>;

  const [documentsResult, tasksResult, deadlinesResult, timeEntriesResult] = await Promise.all([
    cacheGetOrSet<Row[]>(
      buildCacheKey(CACHE_KEYS.CASE_DOCUMENTS, caseId),
      () =>
        supabase
          .from('generated_documents')
          .select('id, document_title, document_type, status, created_at')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false })
          .limit(50)
          .then(({ data }: { data: Row[] | null }) => data || []),
      180
    ),
    cacheGetOrSet<Row[]>(
      buildCacheKey(CACHE_KEYS.CASE_TASKS, caseId),
      () =>
        supabase
          .from('client_tasks')
          .select('id, title, status, priority, due_date')
          .eq('case_id', caseId)
          .in('status', ['pending', 'in_progress'])
          .order('due_date', { ascending: true })
          .then(({ data }: { data: Row[] | null }) => data || []),
      120
    ),
    cacheGetOrSet<Row[]>(
      buildCacheKey(CACHE_KEYS.CASE_DEADLINES, caseId),
      () =>
        supabase
          .from('filing_deadlines')
          .select('id, deadline_name, deadline_date, status, priority')
          .eq('case_id', caseId)
          .eq('status', 'upcoming')
          .order('deadline_date', { ascending: true })
          .then(({ data }: { data: Row[] | null }) => data || []),
      120
    ),
    cacheGetOrSet<Row[]>(
      buildCacheKey(CACHE_KEYS.TIME_ENTRIES, caseId),
      () =>
        supabase
          .from('time_entries')
          .select('id, entry_date, duration_minutes, activity_type, amount, billable, billed_at')
          .eq('case_id', caseId)
          .order('entry_date', { ascending: false })
          .limit(100)
          .then(({ data }: { data: Row[] | null }) => data || []),
      120
    ),
  ]);

  return {
    documents: documentsResult,
    tasks: tasksResult,
    deadlines: deadlinesResult,
    timeEntries: timeEntriesResult,
  };
}
