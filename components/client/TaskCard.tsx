'use client'

import { useState } from 'react'
import {
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClientTask } from '@/types/client'
import { getDaysUntil, formatShortDate } from '@/lib/dates'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-blue-500',
  low: 'border-l-gray-300',
}

const PRIORITY_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgent' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Medium' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Low' },
}

interface TaskCardProps {
  task: ClientTask
  onComplete: (id: string) => void
}

export default function TaskCard({ task, onComplete }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [completing, setCompleting] = useState(false)

  const daysUntilDue = task.due_date ? getDaysUntil(task.due_date) : null
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0
  const isDone = task.status === 'completed' || task.status === 'approved'
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
  const priorityBadge = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium

  const handleComplete = async () => {
    if (isDone || completing) return
    setCompleting(true)
    try {
      await onComplete(task.id)
    } finally {
      setCompleting(false)
    }
  }

  const getDueDateLabel = () => {
    if (!task.due_date) return null
    if (daysUntilDue === null) return null

    if (daysUntilDue === 0) return 'Due today'
    if (daysUntilDue === 1) return 'Due tomorrow'
    if (daysUntilDue > 1) return `Due in ${daysUntilDue} days`
    return `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? 's' : ''}`
  }

  const getStatusButton = () => {
    if (task.status === 'approved') {
      return (
        <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approved
        </span>
      )
    }
    if (task.status === 'completed') {
      return (
        <span className="inline-flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-lg">
          <Clock className="w-3.5 h-3.5 mr-1" /> Awaiting Approval
        </span>
      )
    }
    if (task.status === 'in_progress') {
      return (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {completing ? 'Completing...' : 'Mark Complete'}
        </button>
      )
    }
    return (
      <button
        onClick={handleComplete}
        disabled={completing}
        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 min-h-[44px]"
      >
        {completing ? 'Completing...' : 'Start Task'}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 border-l-4 shadow-sm transition-all hover:shadow-md',
        priorityColor,
        isDone && 'opacity-60'
      )}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Checkbox */}
          <button
            onClick={handleComplete}
            disabled={isDone || completing}
            className="mt-0.5 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -m-2"
          >
            {isDone ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className={cn('w-5 h-5', completing ? 'text-blue-400 animate-pulse' : 'text-gray-300 hover:text-blue-500')} />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className={cn('text-sm font-medium text-gray-900', isDone && 'line-through text-gray-500')}>
                  {task.title}
                </h4>
                {task.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                )}
              </div>

              {/* Priority badge (desktop) */}
              <span className={cn('hidden sm:inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full', priorityBadge.bg, priorityBadge.text)}>
                {priorityBadge.label}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {task.due_date && (
                <span className={cn(
                  'inline-flex items-center text-xs',
                  isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                )}>
                  {isOverdue && <AlertCircle className="w-3 h-3 mr-1" />}
                  {getDueDateLabel()}
                </span>
              )}

              {task.estimated_minutes && (
                <span className="inline-flex items-center text-xs text-gray-400">
                  <Clock className="w-3 h-3 mr-1" />
                  ~{task.estimated_minutes} min
                </span>
              )}

              {/* Priority badge (mobile) */}
              <span className={cn('sm:hidden inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full', priorityBadge.bg, priorityBadge.text)}>
                {priorityBadge.label}
              </span>
            </div>

            {/* Expandable instructions */}
            {task.instructions && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 min-h-[44px] -my-3"
                >
                  {expanded ? 'Hide' : 'Show'} Instructions
                  {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                </button>
                {expanded && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 whitespace-pre-wrap">
                    {task.instructions}
                  </div>
                )}
              </div>
            )}

            {/* Action button */}
            <div className="mt-3 flex items-center justify-between">
              <div>
                {task.due_date && isDone && (
                  <span className="text-xs text-gray-400">
                    Completed {task.completed_by_client_at ? formatShortDate(task.completed_by_client_at) : ''}
                  </span>
                )}
              </div>
              {!isDone && getStatusButton()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
