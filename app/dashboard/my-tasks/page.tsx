'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Clock,
  Briefcase,
  FileText,
  CheckCircle,
  Loader2,
  User,
} from 'lucide-react'
import {
  DelegatedTask,
  TASK_PRIORITY_INFO,
  TASK_STATUS_INFO,
  DELEGATED_TASK_TYPE_INFO,
  formatRelativeTime,
  isOverdue,
  isDueToday,
  getDaysUntilDue,
} from '@/types/collaboration'
import { Label } from '@/components/ui/label'
import { authFetch } from '@/lib/supabase/auth-fetch'

export default function MyTasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<DelegatedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchTasks()
  }, [statusFilter])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'active') params.set('status', statusFilter)
      const res = await authFetch(`/api/delegated-tasks?${params}`)
      const data = await res.json()
      setTasks(data.tasks || [])
    } finally {
      setLoading(false)
    }
  }

  const urgentTasks = tasks.filter(
    (t) =>
      t.priority === 'urgent' ||
      (t.due_date && getDaysUntilDue(t.due_date) <= 1 && !['approved', 'rejected'].includes(t.status))
  )
  const todayTasks = tasks.filter((t) => t.due_date && isDueToday(t.due_date))
  const pendingCount = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length

  const handleStatusChange = async (taskId: string, newStatus: string, extra?: Record<string, unknown>) => {
    try {
      const res = await authFetch(`/api/delegated-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...extra }),
      })
      if (res.ok) fetchTasks()
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-500 mt-1">Tasks and cases assigned to you</p>
      </div>

      {/* Quick stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          title="Urgent Tasks"
          value={urgentTasks.length}
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          highlight={urgentTasks.length > 0}
        />
        <StatCard
          title="Due Today"
          value={todayTasks.length}
          icon={<Clock className="w-5 h-5 text-orange-500" />}
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          icon={<Briefcase className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          title="Total Assigned"
          value={tasks.length}
          icon={<FileText className="w-5 h-5 text-purple-500" />}
        />
      </div>

      {/* Urgent alert */}
      {urgentTasks.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Urgent Tasks Require Attention
            </p>
            <p className="text-sm text-red-700 mt-0.5">
              You have {urgentTasks.length} urgent task
              {urgentTasks.length > 1 ? 's' : ''} that need immediate attention.
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['active', 'pending', 'in_progress', 'completed', 'all'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === filter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter === 'active' ? 'Active' : filter.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onViewCase={(caseId) =>
                router.push(`/dashboard/cases/${caseId}`)
              }
            />
          ))
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <CheckCircle className="mx-auto mb-3 text-green-400 w-12 h-12" />
            <p className="font-medium text-gray-900">No pending tasks</p>
            <p className="text-sm text-gray-500 mt-1">You&apos;re all caught up!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  highlight,
}: {
  title: string
  value: number
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-4 ${
        highlight ? 'border-red-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  onStatusChange,
  onViewCase,
}: {
  task: DelegatedTask
  onStatusChange: (taskId: string, status: string, extra?: Record<string, unknown>) => void
  onViewCase: (caseId: string) => void
}) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [timeSpent, setTimeSpent] = useState(task.time_estimate_minutes || 60)

  const priorityInfo = TASK_PRIORITY_INFO[task.priority]
  const statusInfo = TASK_STATUS_INFO[task.status]
  const taskTypeInfo = DELEGATED_TASK_TYPE_INFO[task.task_type]
  const overdue = isOverdue(task.due_date)
  const dueToday = isDueToday(task.due_date)

  const handleComplete = () => {
    onStatusChange(task.id, 'completed', {
      completion_notes: completionNotes,
      actual_time_minutes: timeSpent,
    })
    setIsCompleting(false)
  }

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 ${priorityInfo.borderColor}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h4 className="font-semibold text-gray-900">{task.title}</h4>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityInfo.color} ${priorityInfo.bgColor}`}
              >
                {priorityInfo.label}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.color} ${statusInfo.bgColor}`}
              >
                {statusInfo.label}
              </span>
            </div>

            {task.description && (
              <p className="text-sm text-gray-600 mb-3">{task.description}</p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {taskTypeInfo.label}
              </span>
              {task.case_info && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {task.case_info.client_name} #{task.case_info.case_number}
                </span>
              )}
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                From: {task.assigner?.full_name || 'Unknown'}
              </span>
              {task.due_date && (
                <span
                  className={`flex items-center gap-1 ${
                    overdue
                      ? 'text-red-600 font-semibold'
                      : dueToday
                      ? 'text-orange-600 font-semibold'
                      : ''
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {overdue
                    ? `Overdue by ${Math.abs(getDaysUntilDue(task.due_date))} day${Math.abs(getDaysUntilDue(task.due_date)) !== 1 ? 's' : ''}`
                    : dueToday
                    ? 'Due today'
                    : `Due ${new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </span>
              )}
              {task.time_estimate_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Est. {task.time_estimate_minutes >= 60
                    ? `${Math.round(task.time_estimate_minutes / 60)}h`
                    : `${task.time_estimate_minutes}m`}
                </span>
              )}
            </div>

            {/* Action buttons */}
            {!isCompleting && !['approved', 'rejected'].includes(task.status) && (
              <div className="flex gap-2 mt-4">
                {task.status === 'pending' && (
                  <button
                    onClick={() => onStatusChange(task.id, 'in_progress')}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Start Task
                  </button>
                )}
                {task.status !== 'completed' && (
                  <button
                    onClick={() => setIsCompleting(true)}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Mark Complete
                  </button>
                )}
                {task.case_info && (
                  <button
                    onClick={() => onViewCase(task.case_id)}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    View Case
                  </button>
                )}
              </div>
            )}

            {/* Completion form */}
            {isCompleting && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <Label>Completion Notes</Label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Add any notes about completing this task..."
                    rows={3}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
                  />
                </div>
                <div>
                  <Label>Actual Time Spent</Label>
                  <select
                    value={timeSpent}
                    onChange={(e) => setTimeSpent(parseInt(e.target.value))}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                    <option value="240">4 hours</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleComplete}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    Submit for Approval
                  </button>
                  <button
                    onClick={() => setIsCompleting(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Status indicators */}
            {task.status === 'completed' && !task.approved_at && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                <Clock className="w-3.5 h-3.5" />
                Pending approval from {task.assigner?.full_name || 'assigner'}
              </div>
            )}

            {task.status === 'approved' && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                <CheckCircle className="w-3.5 h-3.5" />
                Approved {task.approved_at && formatRelativeTime(task.approved_at)}
              </div>
            )}

            {task.status === 'rejected' && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <p className="font-medium">Rejected</p>
                {task.rejection_reason && (
                  <p className="mt-0.5">{task.rejection_reason}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
