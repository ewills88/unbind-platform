import { http, HttpResponse } from 'msw';
import {
  userFactory,
  caseFactory,
  documentFactory,
  invoiceFactory,
  clientTaskFactory,
} from '../factories';

export const handlers = [
  // Auth handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      password: string;
    };

    if (
      body.email === 'test@example.com' &&
      body.password === 'password123'
    ) {
      return HttpResponse.json({
        user: userFactory.build({ email: body.email }),
        token: 'mock-jwt-token',
      });
    }

    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization');

    if (auth === 'Bearer mock-jwt-token') {
      return HttpResponse.json({ user: userFactory.build() });
    }

    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }),

  // Cases handlers
  http.get('/api/cases', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '25');
    const status = url.searchParams.get('status');

    let cases = caseFactory.buildList(limit);

    if (status) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cases = cases.filter((c: any) => c.status === status);
    }

    return HttpResponse.json({
      data: cases,
      total: cases.length,
      hasMore: false,
    });
  }),

  http.get('/api/cases/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      data: caseFactory.build({ id: id as string }),
    });
  }),

  http.post('/api/cases', async ({ request }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await request.json()) as any;
    return HttpResponse.json(
      { data: caseFactory.build(body) },
      { status: 201 }
    );
  }),

  http.patch('/api/cases/:id', async ({ params, request }) => {
    const { id } = params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await request.json()) as any;
    return HttpResponse.json({
      data: caseFactory.build({ id: id as string, ...body }),
    });
  }),

  http.delete('/api/cases/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  // Documents handlers
  http.get('/api/documents', ({ request }) => {
    const url = new URL(request.url);
    const caseId = url.searchParams.get('case_id');

    const documents = documentFactory.buildList(10, {
      case_id: caseId || undefined,
    });

    return HttpResponse.json({ data: documents });
  }),

  http.post('/api/documents/upload', async () => {
    return HttpResponse.json(
      { data: documentFactory.build() },
      { status: 201 }
    );
  }),

  // Invoices handlers
  http.get('/api/invoices', () => {
    return HttpResponse.json({
      data: invoiceFactory.buildList(5),
    });
  }),

  http.post('/api/invoices', async ({ request }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await request.json()) as any;
    return HttpResponse.json(
      { data: invoiceFactory.build(body) },
      { status: 201 }
    );
  }),

  // Tasks handlers
  http.get('/api/tasks', () => {
    return HttpResponse.json({
      data: clientTaskFactory.buildList(10),
    });
  }),

  http.patch('/api/tasks/:id', async ({ params, request }) => {
    const { id } = params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await request.json()) as any;
    return HttpResponse.json({
      data: clientTaskFactory.build({ id: id as string, ...body }),
    });
  }),

  // Health endpoint
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 3600,
      version: '1.0.0',
      checks: {
        database: { status: 'connected', latency: 5 },
        redis: { status: 'not_configured' },
        memory: { heapUsed: 50, heapTotal: 100, rss: 120 },
      },
    });
  }),

  // Metrics endpoint
  http.get('/api/metrics', () => {
    return HttpResponse.json({
      timestamp: new Date().toISOString(),
      metrics: [],
      tracing: {
        totalSpans: 100,
        activeSpans: 2,
        avgDuration: 45.3,
        errorRate: 0.02,
        slowestOperations: [],
      },
      errors: {
        totalErrors: 5,
        last24h: 1,
        bySeverity: { error: 1 },
        topErrors: [],
      },
    });
  }),

  // Dashboard analytics
  http.get('/api/analytics/dashboard', () => {
    return HttpResponse.json({
      data: {
        cases: {
          active: 25,
          openedThisMonth: 5,
          closedThisMonth: 3,
          trend: 12,
        },
        financial: {
          revenueThisMonth: 45000,
          collectionsThisMonth: 38000,
          outstandingAR: 25000,
          trend: 8,
        },
        productivity: {
          billableHours: 120,
          utilizationRate: 75,
        },
        deadlines: {
          upcoming: 8,
          overdue: 2,
        },
      },
    });
  }),

  // Search handler
  http.get('/api/search', () => {
    return HttpResponse.json({
      cases: caseFactory.buildList(3),
      documents: documentFactory.buildList(2),
      clients: [],
    });
  }),
];
