'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle, Clock, AlertCircle, Send, UserPlus, X,
  FileText, Eye, ArrowRight
} from 'lucide-react'
import {
  WorkflowStatus,
  WorkflowAction,
  DocumentAssignment,
  getAvailableActions
} from '@/types/document-collaboration'

interface WorkflowPanelProps {
  caseId: string
  documentId: string
  currentStatus: WorkflowStatus
  userRole: 'attorney' | 'paralegal' | 'client'
  onStatusChange?: (newStatus: WorkflowStatus) => void
}

const STATUS_CONFIG: Record<WorkflowStatus, {
  label: string
  color: string
  bgColor: string
  icon: typeof CheckCircle
}> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: FileText
  },
  paralegal_review: {
    label: 'Paralegal Review',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: Eye
  },
  attorney_review: {
    label: 'Attorney Review',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Eye
  },
  client_review: {
    label: 'Client Review',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: Eye
  },
  pending_signature: {
    label: 'Pending Signature',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: Clock
  },
  final_approval: {
    label: 'Final Approval',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle
  },
  filed: {
    label: 'Filed',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    icon: CheckCircle
  }
}

const ACTION_CONFIG: Record<WorkflowAction['action'], {
  label: string
  color: string
  icon: typeof Send
}> = {
  submit_for_review: {
    label: 'Submit for Review',
    color: 'bg-blue-600 hover:bg-blue-700',
    icon: Send
  },
  request_changes: {
    label: 'Request Changes',
    color: 'bg-orange-600 hover:bg-orange-700',
    icon: AlertCircle
  },
  approve: {
    label: 'Approve',
    color: 'bg-green-600 hover:bg-green-700',
    icon: CheckCircle
  },
  reject: {
    label: 'Reject',
    color: 'bg-red-600 hover:bg-red-700',
    icon: X
  },
  request_signature: {
    label: 'Request Signature',
    color: 'bg-purple-600 hover:bg-purple-700',
    icon: UserPlus
  },
  mark_filed: {
    label: 'Mark as Filed',
    color: 'bg-emerald-600 hover:bg-emerald-700',
    icon: CheckCircle
  }
}

const WORKFLOW_STAGES: WorkflowStatus[] = [
  'draft',
  'attorney_review',
  'final_approval',
  'pending_signature',
  'filed'
]

export default function WorkflowPanel({
  caseId,
  documentId,
  currentStatus,
  userRole,
  onStatusChange
}: WorkflowPanelProps) {
  const [assignments, setAssignments] = useState<DocumentAssignment[]>([])
  const [_loading, _setLoading] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const availableActions = getAvailableActions(currentStatus, userRole)
  const statusConfig = STATUS_CONFIG[currentStatus]
  const StatusIcon = statusConfig.icon

  useEffect(() => {
    fetchAssignments()
  }, [caseId, documentId])

  async function fetchAssignments() {
    try {
      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/assignments`
      )
      if (response.ok) {
        const data = await response.json()
        setAssignments(data.assignments || [])
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err)
    }
  }

  async function performAction(action: WorkflowAction) {
    try {
      setActionLoading(action.action)

      // For status transitions, update the document status
      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow_status: action.to_status
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      onStatusChange?.(action.to_status)
    } catch (err) {
      console.error('Action failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Find current stage index
  const currentStageIndex = WORKFLOW_STAGES.indexOf(currentStatus)

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Document Workflow</h3>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bgColor}`}>
            <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
            <span className={`text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {WORKFLOW_STAGES.map((stage, index) => {
            const stageConfig = STATUS_CONFIG[stage]
            const StageIcon = stageConfig.icon
            const isPast = index < currentStageIndex
            const isCurrent = index === currentStageIndex
            const _isFuture = index > currentStageIndex

            return (
              <div key={stage} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isPast
                        ? 'bg-green-100'
                        : isCurrent
                        ? stageConfig.bgColor
                        : 'bg-gray-100'
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <StageIcon
                        className={`w-4 h-4 ${
                          isCurrent ? stageConfig.color : 'text-gray-400'
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`mt-1 text-xs ${
                      isCurrent ? 'font-medium text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {stageConfig.label.split(' ')[0]}
                  </span>
                </div>
                {index < WORKFLOW_STAGES.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      isPast ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Available Actions */}
      {availableActions.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <p className="text-sm text-gray-500 mb-3">Available Actions</p>
          <div className="flex flex-wrap gap-2">
            {availableActions.map((action) => {
              const config = ACTION_CONFIG[action.action]
              const ActionIcon = config.icon

              return (
                <button
                  key={action.action}
                  onClick={() => performAction(action)}
                  disabled={actionLoading !== null}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                            rounded-lg ${config.color} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {actionLoading === action.action ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ActionIcon className="w-4 h-4" />
                  )}
                  {config.label}
                  <ArrowRight className="w-4 h-4 opacity-50" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Assignments */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">Assignments</p>
          {userRole === 'attorney' && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              <UserPlus className="w-4 h-4 inline mr-1" />
              Assign
            </button>
          )}
        </div>

        {assignments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No assignments yet
          </p>
        ) : (
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {assignment.assigned_to_user?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {assignment.assigned_to_user?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {assignment.role}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    assignment.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : assignment.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : assignment.status === 'declined'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {assignment.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignModal
          caseId={caseId}
          documentId={documentId}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            setShowAssignModal(false)
            fetchAssignments()
          }}
        />
      )}
    </div>
  )
}

interface AssignModalProps {
  caseId: string
  documentId: string
  onClose: () => void
  onAssigned: () => void
}

function AssignModal({ caseId, documentId, onClose, onAssigned }: AssignModalProps) {
  const [assignTo, setAssignTo] = useState('')
  const [role, setRole] = useState<'reviewer' | 'approver' | 'signer'>('reviewer')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assignTo) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assigned_to: assignTo,
            role,
            due_date: dueDate || undefined,
            notes: notes || undefined
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to create assignment')
      }

      onAssigned()
    } catch (err) {
      console.error('Assignment failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Assign Document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign To (User ID)
            </label>
            <input
              type="text"
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              placeholder="Enter user ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
                       focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
                       focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="reviewer">Reviewer</option>
              <option value="approver">Approver</option>
              <option value="signer">Signer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
                       focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any instructions..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
                       focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg
                       hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !assignTo}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
