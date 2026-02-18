// Session 25: API Documentation Page
// Static reference page documenting available API endpoints

import Link from 'next/link'
import { ArrowLeft, Lock, Globe } from 'lucide-react'

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  description: string
  auth: boolean
  example?: {
    request?: string
    response?: string
  }
}

interface EndpointGroup {
  name: string
  description: string
  endpoints: Endpoint[]
}

const API_GROUPS: EndpointGroup[] = [
  {
    name: 'Health & Monitoring',
    description: 'System health checks and metrics endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'System health check with database and Redis status',
        auth: false,
        example: {
          response: `{
  "status": "healthy",
  "timestamp": "2025-02-17T12:00:00Z",
  "uptime": 86400,
  "checks": {
    "database": { "status": "connected", "latency": 12 },
    "redis": { "status": "connected", "latency": 3 }
  }
}`,
        },
      },
      {
        method: 'GET',
        path: '/api/metrics',
        description: 'Prometheus-compatible metrics endpoint',
        auth: false,
      },
    ],
  },
  {
    name: 'Cases',
    description: 'Case management endpoints for creating and managing divorce cases',
    endpoints: [
      {
        method: 'GET',
        path: '/api/cases',
        description: 'List all cases for the authenticated user\'s firm',
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/cases',
        description: 'Create a new case',
        auth: true,
        example: {
          request: `{
  "client_name": "Jane Doe",
  "case_type": "divorce",
  "state": "CA",
  "opposing_party_name": "John Doe"
}`,
          response: `{
  "id": "uuid",
  "case_number": "2025-DIV-001",
  "status": "active",
  "created_at": "2025-02-17T12:00:00Z"
}`,
        },
      },
      {
        method: 'GET',
        path: '/api/cases/[caseId]',
        description: 'Get case details by ID',
        auth: true,
      },
      {
        method: 'PATCH',
        path: '/api/cases/[caseId]',
        description: 'Update case details',
        auth: true,
      },
    ],
  },
  {
    name: 'Documents',
    description: 'Document upload, management, and AI processing',
    endpoints: [
      {
        method: 'GET',
        path: '/api/cases/[caseId]/documents',
        description: 'List documents for a case',
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/cases/[caseId]/documents',
        description: 'Upload a document to a case',
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/cases/[caseId]/documents/[docId]/analyze',
        description: 'Trigger AI analysis of a document',
        auth: true,
      },
    ],
  },
  {
    name: 'Billing',
    description: 'Time tracking, invoicing, and payment management',
    endpoints: [
      {
        method: 'GET',
        path: '/api/cases/[caseId]/time-entries',
        description: 'List time entries for a case',
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/cases/[caseId]/time-entries',
        description: 'Create a time entry',
        auth: true,
        example: {
          request: `{
  "description": "Client consultation",
  "duration_minutes": 60,
  "billable": true,
  "rate": 350
}`,
        },
      },
      {
        method: 'GET',
        path: '/api/cases/[caseId]/invoices',
        description: 'List invoices for a case',
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/cases/[caseId]/invoices',
        description: 'Generate an invoice from unbilled time entries',
        auth: true,
      },
    ],
  },
  {
    name: 'Messages',
    description: 'In-app messaging between attorneys and clients',
    endpoints: [
      {
        method: 'GET',
        path: '/api/cases/[caseId]/messages',
        description: 'List messages for a case, supports pagination',
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/cases/[caseId]/messages',
        description: 'Send a message in a case thread',
        auth: true,
      },
    ],
  },
  {
    name: 'Events & Deadlines',
    description: 'Calendar events and court deadline tracking',
    endpoints: [
      {
        method: 'GET',
        path: '/api/cases/[caseId]/events',
        description: 'List events and deadlines for a case',
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/cases/[caseId]/events',
        description: 'Create a calendar event or deadline',
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/cases/[caseId]/events/calculate-deadline',
        description: 'Calculate related deadlines based on a trigger event',
        auth: true,
      },
    ],
  },
  {
    name: 'E-Filing',
    description: 'Court e-filing integration endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/api/states',
        description: 'List states with e-filing configuration',
        auth: true,
      },
      {
        method: 'GET',
        path: '/api/states/[stateCode]',
        description: 'Get state-specific filing requirements',
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/cases/[caseId]/filings',
        description: 'Submit a court filing',
        auth: true,
      },
    ],
  },
  {
    name: 'Help Center',
    description: 'Help articles, search, and feedback',
    endpoints: [
      {
        method: 'GET',
        path: '/api/help/articles',
        description: 'Search articles (query param: q)',
        auth: false,
      },
      {
        method: 'GET',
        path: '/api/help/articles/[slug]',
        description: 'Get a single article by slug',
        auth: false,
      },
      {
        method: 'POST',
        path: '/api/help/articles/[slug]/feedback',
        description: 'Submit article feedback',
        auth: true,
      },
    ],
  },
  {
    name: 'Beta Signup',
    description: 'Public beta registration',
    endpoints: [
      {
        method: 'POST',
        path: '/api/beta/signup',
        description: 'Register for beta access',
        auth: false,
        example: {
          request: `{
  "email": "attorney@firm.com",
  "name": "Jane Smith",
  "firm_name": "Smith Family Law",
  "role": "attorney",
  "firm_size": "2-10"
}`,
          response: `{
  "message": "Successfully signed up for beta access!",
  "id": "uuid"
}`,
        },
      },
    ],
  },
]

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
}

export default function APIDocumentationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Help Center
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API Reference</h1>
          <p className="text-gray-500 text-lg">
            Complete reference for the Unbind REST API
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Nav */}
          <nav className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Endpoints</h3>
              <ul className="space-y-1">
                {API_GROUPS.map((group) => (
                  <li key={group.name}>
                    <a
                      href={`#${group.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors block py-1"
                    >
                      {group.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Auth info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h2 className="font-semibold text-blue-900 mb-2">Authentication</h2>
              <p className="text-sm text-blue-800 leading-relaxed">
                Most endpoints require authentication via Supabase Auth. Include the user&apos;s
                session cookie or pass the Authorization header with a valid JWT token.
                Endpoints marked with a lock icon require authentication.
              </p>
              <pre className="mt-3 bg-blue-900 text-blue-100 rounded-md p-3 text-sm overflow-x-auto">
{`Authorization: Bearer <your-jwt-token>
Content-Type: application/json`}
              </pre>
            </div>

            {/* Endpoint Groups */}
            <div className="space-y-12">
              {API_GROUPS.map((group) => (
                <section
                  key={group.name}
                  id={group.name.toLowerCase().replace(/\s+/g, '-')}
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{group.name}</h2>
                  <p className="text-gray-500 mb-6">{group.description}</p>

                  <div className="space-y-4">
                    {group.endpoints.map((endpoint, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <div className="p-4 flex items-center gap-3">
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-bold ${
                              METHOD_COLORS[endpoint.method]
                            }`}
                          >
                            {endpoint.method}
                          </span>
                          <code className="text-sm font-mono text-gray-800">
                            {endpoint.path}
                          </code>
                          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                            {endpoint.auth ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                Auth required
                              </>
                            ) : (
                              <>
                                <Globe className="w-3.5 h-3.5" />
                                Public
                              </>
                            )}
                          </span>
                        </div>
                        <div className="px-4 pb-4">
                          <p className="text-sm text-gray-600">{endpoint.description}</p>
                        </div>

                        {endpoint.example && (
                          <div className="border-t border-gray-100">
                            {endpoint.example.request && (
                              <div className="p-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                  Request Body
                                </p>
                                <pre className="bg-gray-900 text-gray-100 rounded-md p-3 text-sm overflow-x-auto">
                                  {endpoint.example.request}
                                </pre>
                              </div>
                            )}
                            {endpoint.example.response && (
                              <div className="p-4 border-t border-gray-50">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                  Response
                                </p>
                                <pre className="bg-gray-900 text-gray-100 rounded-md p-3 text-sm overflow-x-auto">
                                  {endpoint.example.response}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
