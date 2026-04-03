'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare, FileText, Calendar, CheckSquare,
  ArrowRight, AlertTriangle, Clock, DollarSign,
  Activity, User, Loader2,
} from 'lucide-react'
import { PortalDashboardData, ACTIVITY_TYPE_ICONS } from '@/types/portal'
import { STAGE_DEFINITIONS, STAGE_ORDER, CaseStage } from '@/types/client'
import { authFetch } from '@/lib/supabase/auth-fetch'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

export default function PortalDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<PortalDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await authFetch('/api/portal/dashboard')
      if (res.status === 401) {
        router.push('/portal/login')
        return
      }
      if (!res.ok) throw new Error('Failed to load dashboard')
      const dashboardData = await res.json()
      setData(dashboardData)
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Unable to load your dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Something went wrong.'}</p>
          <button
            onClick={() => { setError(null); setLoading(true); fetchDashboard() }}
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const stageIndex = data.progress
    ? STAGE_ORDER.indexOf(data.progress.current_stage as CaseStage)
    : 0
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Welcome back, {data.profile.full_name || 'there'}
        </h1>
        <p className="mt-1 text-blue-100 text-sm sm:text-base">
          Here&apos;s an overview of your case and what needs your attention.
        </p>
        {data.case_info?.firm_name && (
          <p className="mt-2 text-blue-200 text-xs">
            Represented by {data.case_info.firm_name}
            {data.case_info.attorney_name ? ` - ${data.case_info.attorney_name}` : ''}
          </p>
        )}
      </div>

      {/* Case Progress */}
      {data.progress && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Case Progress</h2>
            <span className="text-sm font-medium text-blue-600">
              {data.progress.overall_completion_percentage}% Complete
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all"
              style={{ width: `${data.progress.overall_completion_percentage}%` }}
            />
          </div>

          {/* Stage Indicators */}
          <div className="flex items-center justify-between">
            {STAGE_ORDER.map((stage, idx) => {
              const stageDef = STAGE_DEFINITIONS[stage]
              const isComplete = idx < stageIndex
              const isCurrent = idx === stageIndex
              return (
                <div key={stage} className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    isComplete
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isComplete ? '✓' : idx + 1}
                  </div>
                  <span className={`text-[10px] sm:text-xs mt-1 text-center ${
                    isCurrent ? 'font-semibold text-blue-700' : 'text-gray-500'
                  }`}>
                    {stageDef.name}
                  </span>
                </div>
              )
            })}
          </div>

          {data.progress.estimated_completion_date && (
            <p className="text-xs text-gray-500 mt-3">
              Estimated completion: {formatDate(data.progress.estimated_completion_date)}
            </p>
          )}
        </div>
      )}

      {/* Alert: Outstanding Balance */}
      {data.outstanding_balance > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center space-x-3">
          <DollarSign className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Outstanding Balance: ${data.outstanding_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">You have unpaid invoices that need attention.</p>
          </div>
          <Link
            href="/portal/payments"
            className="text-xs font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap"
          >
            Pay Now →
          </Link>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/portal/messages"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.unread_conversations}</p>
              <p className="text-xs text-gray-500">Unread</p>
            </div>
          </div>
        </Link>

        <Link
          href="/client/tasks"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.pending_tasks}</p>
              <p className="text-xs text-gray-500">Tasks</p>
            </div>
          </div>
        </Link>

        <Link
          href="/client/documents"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.recent_documents.length}</p>
              <p className="text-xs text-gray-500">Recent Docs</p>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.upcoming_events.length}</p>
              <p className="text-xs text-gray-500">Events</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-400" />
              Recent Activity
            </h2>
          </div>

          {data.recent_activity.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {data.recent_activity.slice(0, 8).map((activity) => {
                const typeInfo = ACTIVITY_TYPE_ICONS[activity.activity_type as keyof typeof ACTIVITY_TYPE_ICONS]
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      typeInfo?.color.replace('text-', 'bg-') || 'bg-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatRelativeTime(activity.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Upcoming Events
            </h2>
          </div>

          {data.upcoming_events.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No upcoming events</p>
          ) : (
            <div className="space-y-3">
              {data.upcoming_events.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-blue-600">
                      {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold text-blue-800 leading-tight">
                      {new Date(event.event_date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'short', hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    event.event_type === 'court_date'
                      ? 'bg-red-100 text-red-700'
                      : event.event_type === 'filing_deadline'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                  }`}>
                    {event.event_type.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Documents */}
      {data.recent_documents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Recent Documents
            </h2>
            <Link href="/client/documents" className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recent_documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-50 rounded flex items-center justify-center">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-900">{doc.file_name}</span>
                </div>
                <span className="text-xs text-gray-400">{formatDate(doc.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attorney Info */}
      {data.case_info?.attorney_name && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Attorney</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{data.case_info.attorney_name}</p>
                <p className="text-xs text-gray-500">{data.case_info.firm_name || 'Attorney'}</p>
              </div>
            </div>
            <Link
              href="/portal/messages"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <MessageSquare className="w-4 h-4 mr-1.5" /> Message
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
