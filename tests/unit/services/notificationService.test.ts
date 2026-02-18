import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationFactory } from '../../factories';

// Create a chainable mock that returns itself for any method call
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createChainableMock(resolvedValue: any = { data: null, error: null }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: any = {};
  const handler: ProxyHandler<typeof mock> = {
    get(_target, prop) {
      if (prop === 'then') {
        // Make it thenable - resolve with the configured value
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
      // Every other property returns a function that returns the proxy again
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

// Mock web-push if used
vi.mock('web-push', () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(() => Promise.resolve()),
}));

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('createNotification', () => {
    it('should insert a notification record', async () => {
      const notification = notificationFactory.build();
      // createNotification calls .from('client_notifications').insert().select().single()
      // then internally calls getPreferences which calls .from('client_notification_preferences')...
      mockFrom.mockImplementation((table: string) => {
        if (table === 'client_notifications') {
          return createChainableMock({ data: notification, error: null });
        }
        if (table === 'client_notification_preferences') {
          return createChainableMock({
            data: {
              client_id: 'client-123',
              email_enabled: false,
              sms_enabled: false,
              push_enabled: false,
              preferences: {},
            },
            error: null,
          });
        }
        return createChainableMock();
      });

      const { createNotification } = await import(
        '@/lib/portal/notificationService'
      );

      const params = {
        clientId: 'client-123',
        type: 'task_assigned',
        category: 'task' as const,
        title: 'New Task Assigned',
        message: 'You have a new task to complete',
      };

      const result = await createNotification(params);
      expect(result).toBeDefined();
    });
  });

  describe('getNotifications', () => {
    it('should fetch notifications for a client', async () => {
      const notifications = notificationFactory.buildList(5);
      mockFrom.mockReturnValue(
        createChainableMock({ data: notifications, error: null })
      );

      const { getNotifications } = await import(
        '@/lib/portal/notificationService'
      );

      const result = await getNotifications('client-123');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter unread notifications', async () => {
      const unreadNotifications = notificationFactory.buildList(3, {
        read_at: null,
      });
      mockFrom.mockReturnValue(
        createChainableMock({ data: unreadNotifications, error: null })
      );

      const { getNotifications } = await import(
        '@/lib/portal/notificationService'
      );

      const result = await getNotifications('client-123', {
        unreadOnly: true,
      });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should update notifications as read', async () => {
      mockFrom.mockReturnValue(
        createChainableMock({ error: null })
      );

      const { markAsRead } = await import(
        '@/lib/portal/notificationService'
      );

      await expect(
        markAsRead('client-123', ['notif-1', 'notif-2'])
      ).resolves.not.toThrow();
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockFrom.mockReturnValue(
        createChainableMock({ count: 5, error: null })
      );

      const { getUnreadCount } = await import(
        '@/lib/portal/notificationService'
      );

      const count = await getUnreadCount('client-123');
      expect(typeof count).toBe('number');
    });
  });
});
