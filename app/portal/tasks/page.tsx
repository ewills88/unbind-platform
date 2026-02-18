'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckSquare, Clock, Upload, FileText, AlertCircle,
  ChevronDown, ChevronUp, Loader2, Filter, CheckCircle,
  XCircle, Play, Send, ClipboardList,
} from 'lucide-react'
import { EnhancedClientTask, TaskStats } from '@/types/portal'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000)

  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays <= 7) return `Due in ${diffDays} days`
  return `Due ${formatDate(dateStr)}`
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Play },
  submitted: { label: 'Submitted', color: 'bg-purple-100 text-purple-700', icon: Send },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Needs Revision', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: XCircle },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
}

const TASK_TYPE_ICONS: Record<string, typeof Upload> = {
  upload_document: Upload,
  review_form: FileText,
  complete_questionnaire: ClipboardList,
  attend_appointment: Clock,
  make_payment: CheckSquare,
  review_settlement: FileText,
  signature: FileText,
  other: CheckSquare,
}

export default function PortalTasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<EnhancedClientTask[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [submitNotes, setSubmitNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/portal/tasks?include_stats=true')
      if (res.status === 401) {
        router.push('/portal/login')
        return
      }
      if (!res.ok) throw new Error('Failed to load tasks')
      const data = await res.json()
      setTasks(data.data || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error('Tasks error:', err)
      setError('Unable to load tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartTask = async (taskId: string) => {
    setActionLoading(taskId)
    setError(null)
    try {
      const res = await fetch(`/api/portal/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start task')
      }
      fetchTasks()
    } catch (err) {
      console.error('Start task error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start task')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSubmitTask = async (taskId: string) => {
    setActionLoading(taskId)
    setError(null)
    try {
      const res = await fetch(`/api/portal/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: submitNotes || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit task')
      }
      setSubmitting(null)
      setSubmitNotes('')
      fetchTasks()
    } catch (err) {
      console.error('Submit task error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit task')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'active') return ['pending', 'in_progress', 'rejected'].includes(t.status)
    if (statusFilter === 'done') return ['submitted', 'approved', 'completed'].includes(t.status)
    return t.status === statusFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <p className="text-gray-600 mt-1">Complete tasks assigned by your legal team</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 text-sm underline mt-1">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600' },
            { label: 'Submitted', value: stats.submitted, color: 'text-purple-600' },
            { label: 'Completed', value: stats.approved, color: 'text-green-600' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit overflow-x-auto">
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'done', label: 'Completed' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              statusFilter === f.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No tasks</p>
            <p className="text-sm mt-1">
              {statusFilter === 'all'
                ? 'Tasks from your legal team will appear here.'
                : 'No tasks match the current filter.'}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
            const StatusIcon = statusConfig.icon
            const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
            const TaskTypeIcon = TASK_TYPE_ICONS[task.task_type] || TASK_TYPE_ICONS.other
            const isExpanded = expandedTask === task.id
            const canStart = task.status === 'pending'
            const canSubmit = ['pending', 'in_progress', 'rejected'].includes(task.status)
            const isSubmitting = submitting === task.id

            return (
              <div key={task.id} className={`bg-white border rounded-lg overflow-hidden transition-colors ${
                task.isOverdue ? 'border-red-200' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                      task.isOverdue ? 'bg-red-50' : 'bg-gray-50'
                    }`}>
                      <TaskTypeIcon className={`w-4 h-4 ${task.isOverdue ? 'text-red-500' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                            {task.priority !== 'medium' && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityConfig.color}`}>
                                {priorityConfig.label}
                              </span>
                            )}
                            {task.isOverdue && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                Overdue
                              </span>
                            )}
                            {task.requires_upload && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                <Upload className="w-3 h-3" /> Upload required
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {task.due_date && (
                            <span className={`text-xs whitespace-nowrap ${
                              task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                            }`}>
                              {formatRelativeDate(task.due_date)}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      {task.created_by_name && (
                        <p className="text-xs text-gray-400 mt-1.5">
                          Assigned by {task.created_by_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    {task.description && (
                      <p className="text-sm text-gray-700 mb-3">{task.description}</p>
                    )}
                    {task.instructions && (
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 mb-1">Instructions</p>
                        <p className="text-sm text-blue-700">{task.instructions}</p>
                      </div>
                    )}

                    {/* Review notes from rejection */}
                    {task.status === 'rejected' && task.review_notes && (
                      <div className="mb-3 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm font-medium text-red-800 mb-1">Revision Requested</p>
                        <p className="text-sm text-red-700">{task.review_notes}</p>
                      </div>
                    )}

                    {/* Submission area */}
                    {canSubmit && isSubmitting && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Submission notes (optional)
                        </label>
                        <textarea
                          value={submitNotes}
                          onChange={(e) => setSubmitNotes(e.target.value)}
                          placeholder="Add any notes about your submission..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                    )}

                    {/* Task metadata */}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 mb-4">
                      {task.due_date && <span>Due: {formatDate(task.due_date)}</span>}
                      <span>Created: {formatDate(task.created_at)}</span>
                      {task.completed_by_client_at && (
                        <span>Submitted: {formatDate(task.completed_by_client_at)}</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {canStart && !isSubmitting && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartTask(task.id) }}
                          disabled={actionLoading === task.id}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                        >
                          {actionLoading === task.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          Start Task
                        </button>
                      )}
                      {canSubmit && !isSubmitting && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSubmitting(task.id) }}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          <Send className="w-4 h-4" />
                          Submit Task
                        </button>
                      )}
                      {isSubmitting && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSubmitTask(task.id) }}
                            disabled={actionLoading === task.id}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                          >
                            {actionLoading === task.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Confirm Submit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSubmitting(null); setSubmitNotes('') }}
                            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
