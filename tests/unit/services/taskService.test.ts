import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clientTaskFactory } from '../../factories';

// Create a chainable mock that returns itself for any method call
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createChainableMock(resolvedValue: any = { data: null, error: null }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: any = {};
  const handler: ProxyHandler<typeof mock> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          resolve: (v: any) => any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          reject: (e: any) => any
        ) => {
          try {
            return Promise.resolve(resolvedValue).then(resolve, reject);
          } catch (e) {
            return reject(e);
          }
        };
      }
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy(mock, handler);
}

// Mock Supabase
const mockFrom = vi.fn();
const mockSupabase = {
  from: mockFrom,
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('TaskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('getClientTasks', () => {
    it('should fetch tasks for a client', async () => {
      const tasks = clientTaskFactory.buildList(5);
      // getClientTasks calls:
      // 1. .from('cases').select('id').eq('client_id', clientId) -> returns case IDs
      // 2. .from('client_tasks').select('*').in().neq().order() -> returns tasks
      // 3. .from('profiles').select().in() -> returns creator names
      mockFrom.mockImplementation((table: string) => {
        if (table === 'cases') {
          return createChainableMock({
            data: [{ id: 'case-1' }, { id: 'case-2' }],
            error: null,
          });
        }
        if (table === 'client_tasks') {
          return createChainableMock({ data: tasks, error: null });
        }
        if (table === 'profiles') {
          return createChainableMock({ data: [], error: null });
        }
        return createChainableMock();
      });

      const { getClientTasks } = await import('@/lib/portal/taskService');

      const result = await getClientTasks('client-123');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by case_id when provided', async () => {
      const tasks = clientTaskFactory.buildList(3, {
        case_id: 'case-456',
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'client_tasks') {
          return createChainableMock({ data: tasks, error: null });
        }
        if (table === 'profiles') {
          return createChainableMock({ data: [], error: null });
        }
        return createChainableMock();
      });

      const { getClientTasks } = await import('@/lib/portal/taskService');

      const result = await getClientTasks('client-123', 'case-456');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('startTask', () => {
    it('should update task status to in_progress', async () => {
      const task = clientTaskFactory.build({ status: 'pending' });
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'client_tasks') {
          callCount++;
          if (callCount === 1) {
            // First call: select to verify task + access
            return createChainableMock({ data: task, error: null });
          }
          if (callCount === 2) {
            // Second call: access check on cases
            return createChainableMock({ data: task, error: null });
          }
          // Third call: update
          return createChainableMock({
            data: { ...task, status: 'in_progress' },
            error: null,
          });
        }
        if (table === 'cases') {
          return createChainableMock({
            data: { id: task.case_id },
            error: null,
          });
        }
        return createChainableMock();
      });

      const { startTask } = await import('@/lib/portal/taskService');

      const result = await startTask('task-123', 'client-123');
      expect(result).toBeDefined();
    });
  });

  describe('submitTask', () => {
    it('should submit task with notes', async () => {
      const task = clientTaskFactory.build({ status: 'in_progress' });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'client_tasks') {
          return createChainableMock({
            data: { ...task, status: 'submitted' },
            error: null,
          });
        }
        if (table === 'cases') {
          return createChainableMock({
            data: { id: task.case_id },
            error: null,
          });
        }
        return createChainableMock();
      });

      const { submitTask } = await import('@/lib/portal/taskService');

      const result = await submitTask('task-123', 'client-123', {
        notes: 'Task completed as requested',
      });
      expect(result).toBeDefined();
    });
  });

  describe('getTaskStats', () => {
    it('should return aggregated task statistics', async () => {
      const tasks = [
        clientTaskFactory.build({ status: 'pending' }),
        clientTaskFactory.build({ status: 'pending' }),
        clientTaskFactory.build({ status: 'in_progress' }),
        clientTaskFactory.build({ status: 'submitted' }),
        clientTaskFactory.build({ status: 'approved' }),
      ];
      mockFrom.mockImplementation((table: string) => {
        if (table === 'cases') {
          return createChainableMock({
            data: [{ id: 'case-1' }],
            error: null,
          });
        }
        if (table === 'client_tasks') {
          return createChainableMock({ data: tasks, error: null });
        }
        return createChainableMock();
      });

      const { getTaskStats } = await import('@/lib/portal/taskService');

      const stats = await getTaskStats('client-123');
      expect(stats).toBeDefined();
    });
  });
});
