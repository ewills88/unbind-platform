'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  MessageSquare,
  FileText,
  Calendar,
  ArrowRight,
  AlertTriangle,
  User,
} from 'lucide-react'
import ProgressTracker from '@/components/client/ProgressTracker'
import TaskCard from '@/components/client/TaskCard'
import { ClientDashboardData } from '@/types/client'
import { formatShortDate } from '@/lib/dates'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ClientDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<ClientDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push('/login')
        return
      }

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setError('Profile not found. Please contact support.')
        return
      }

      // Get client's case
      const { data: caseData } = await supabase
        .from('cases')
        .select('id, client_name, status, attorney_id')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let attorneyName: string | null = null
      if (caseData?.attorney_id) {
        const { data: attorney } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', caseData.attorney_id)
          .single()
        attorneyName = attorney?.full_name || null
      }

      // Get pending tasks (table may not exist yet)
      let pendingTasks: Record<string, unknown>[] = []
      if (caseData) {
        try {
          const { data: tasks } = await supabase
            .from('client_tasks')
            .select('*')
            .eq('case_id', caseData.id)
            .in('status', ['pending', 'in_progress'])
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(5)
          pendingTasks = tasks || []
        } catch {
          // client_tasks table may not exist
        }
      }

      // Get unread message count
      let unreadMessages = 0
      try {
        const { data: unreadData } = await supabase
          .from('message_unread_counts')
          .select('unread_count')
          .eq('user_id', user.id)
        unreadMessages = unreadData?.reduce((sum: number, row: Record<string, unknown>) => sum + ((row.unread_count as number) || 0), 0) || 0
      } catch {
        // Table may not exist yet
      }

      // Get document count
      let documentCount = 0
      if (caseData) {
        try {
          const { count } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('case_id', caseData.id)
          documentCount = count || 0
        } catch {
          // documents table may not exist
        }
      }

      // Get next appointment (table may not exist yet)
      let nextAppointment = null
      if (caseData) {
        try {
          const { data: events } = await supabase
            .from('events')
            .select('id, title, start_time')
            .eq('case_id', caseData.id)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(1)
          nextAppointment = events?.[0] || null
        } catch {
          // events table may not exist
        }
      }

      // Get outstanding invoice amount
      let outstandingAmount = 0
      if (caseData) {
        try {
          const { data: invoices } = await supabase
            .from('invoices')
            .select('total_amount, amount_paid')
            .eq('case_id', caseData.id)
            .in('status', ['sent', 'overdue'])
          if (invoices) {
            outstandingAmount = invoices.reduce(
              (sum: number, inv: Record<string, unknown>) => sum + (((inv.total_amount as number) || 0) - ((inv.amount_paid as number) || 0)),
              0
            )
          }
        } catch {
          // Table may not exist yet
        }
      }

      const dashboardData: ClientDashboardData = {
        profile: {
          full_name: profile.full_name || '',
          email: profile.email || '',
        },
        case_info: caseData ? {
          id: caseData.id,
          client_name: caseData.client_name,
          status: caseData.status,
          attorney_name: attorneyName,
          attorney_id: caseData.attorney_id,
        } : null,
        progress: null,
        pending_tasks: pendingTasks as ClientDashboardData['pending_tasks'],
        unread_messages: unreadMessages,
        document_count: documentCount,
        next_appointment: nextAppointment,
        outstanding_invoice_amount: outstandingAmount,
      }

      setData(dashboardData)
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Unable to load your dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskComplete = async (taskId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('client_tasks')
        .update({
          status: 'completed',
          completed_by_client_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (updateError) throw updateError

      // Update local state
      if (data) {
        setData({
          ...data,
          pending_tasks: data.pending_tasks.map(t =>
            t.id === taskId ? { ...t, status: 'completed', completed_by_client_at: new Date().toISOString() } : t
          ),
        })
      }
    } catch (err) {
      console.error('Complete task error:', err)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-white rounded-xl"></div>
          <div className="h-48 bg-white rounded-xl"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-24 bg-white rounded-xl"></div>
            <div className="h-24 bg-white rounded-xl"></div>
            <div className="h-24 bg-white rounded-xl"></div>
          </div>
        </div>
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

  const pendingTasks = data.pending_tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Welcome back, {data.profile.full_name || 'there'}
        </h1>
        <p className="mt-1 text-blue-100 text-sm sm:text-base">
          Here&apos;s an overview of your case progress and what needs your attention.
        </p>
      </div>

      {/* Progress Tracker */}
      {data.case_info && (
        <div className="mb-6">
          <ProgressTracker caseId={data.case_info.id} />
        </div>
      )}

      {/* Outstanding Invoice Alert */}
      {data.outstanding_invoice_amount > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Outstanding Balance: ${data.outstanding_invoice_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">You have unpaid invoices that need attention.</p>
          </div>
          <Link
            href="/client/payments"
            className="text-xs font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap"
          >
            Pay Now →
          </Link>
        </div>
      )}

      {/* What You Need to Do */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">What You Need to Do</h2>
          {pendingTasks.length > 0 && (
            <Link href="/client/tasks" className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          )}
        </div>

        {pendingTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">You&apos;re all caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No pending tasks right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.slice(0, 3).map(task => (
              <TaskCard key={task.id} task={task} onComplete={handleTaskComplete} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Link
          href="/dashboard/messages"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.unread_messages}</p>
              <p className="text-xs text-gray-500">Unread Messages</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/documents"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.document_count}</p>
              <p className="text-xs text-gray-500">Documents</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/calendar"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              {data.next_appointment ? (
                <>
                  <p className="text-sm font-medium text-gray-900 truncate">{data.next_appointment.title}</p>
                  <p className="text-xs text-gray-500">{formatShortDate(data.next_appointment.start_time)}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-500">No Upcoming</p>
                  <p className="text-xs text-gray-400">Appointments</p>
                </>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Attorney Info Card */}
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
                <p className="text-xs text-gray-500">Attorney</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href="/dashboard/messages"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors min-h-[44px]"
              >
                <MessageSquare className="w-4 h-4 mr-1.5" /> Message
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
