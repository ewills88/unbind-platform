'use client'

import { useState, useEffect } from 'react'
import {
  FileSearch,
  FileText,
  Search,
  MessageCircle,
  Scale,
  MoreHorizontal,
  Loader2,
  Info,
} from 'lucide-react'
import {
  DelegatedTaskType,
  TaskPriority,
  DELEGATED_TASK_TYPE_INFO,
  CreateDelegatedTaskRequest,
} from '@/types/collaboration'
import { FirmMember, FIRM_MEMBER_ROLE_INFO } from '@/types/firm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const TASK_TYPE_ICONS: Record<DelegatedTaskType, React.ReactNode> = {
  review_document: <FileSearch className="w-4 h-4" />,
  prepare_document: <FileText className="w-4 h-4" />,
  research: <Search className="w-4 h-4" />,
  client_communication: <MessageCircle className="w-4 h-4" />,
  court_filing: <Scale className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
}

interface TaskDelegationModalProps {
  caseId: string
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export default function TaskDelegationModal({
  caseId,
  isOpen,
  onClose,
  onCreated,
}: TaskDelegationModalProps) {
  const [members, setMembers] = useState<FirmMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [taskType, setTaskType] = useState<DelegatedTaskType>('prepare_document')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [timeEstimate, setTimeEstimate] = useState(60)

  useEffect(() => {
    if (isOpen) {
      fetchMembers()
      // Default due date to 3 days from now
      const d = new Date()
      d.setDate(d.getDate() + 3)
      setDueDate(d.toISOString().split('T')[0])
    }
  }, [isOpen])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/firms/members')
      const data = await res.json()
      setMembers(
        (data.members || []).filter((m: FirmMember) => m.status === 'active')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDelegate = async () => {
    setError(null)
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!assignedTo) {
      setError('Please select a team member')
      return
    }

    setSaving(true)
    try {
      const payload: CreateDelegatedTaskRequest = {
        case_id: caseId,
        task_type: taskType,
        title: title.trim(),
        description: description.trim() || undefined,
        assigned_to: assignedTo,
        due_date: dueDate || undefined,
        priority,
        time_estimate_minutes: timeEstimate,
      }

      const res = await fetch(`/api/cases/${caseId}/delegate-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delegate task')
      }

      // Reset form
      setTitle('')
      setDescription('')
      setAssignedTo('')
      setTaskType('prepare_document')
      setPriority('medium')
      setTimeEstimate(60)

      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delegate task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delegate Task</DialogTitle>
          <DialogDescription>
            Assign a task to a team member
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-5 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Task Type */}
            <div>
              <Label>Task Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(
                  Object.entries(DELEGATED_TASK_TYPE_INFO) as [
                    DelegatedTaskType,
                    typeof DELEGATED_TASK_TYPE_INFO[DelegatedTaskType]
                  ][]
                ).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => setTaskType(type)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      taskType === type
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {TASK_TYPE_ICONS[type]}
                    <span>{info.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label>Task Title *</Label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Review settlement proposal for errors"
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <Label>Instructions</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed instructions for completing this task..."
                rows={4}
                className="mt-1 w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Assign To & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assign To *</Label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select team member...</option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.profile?.full_name || member.invited_email || 'Unknown'} -{' '}
                      {FIRM_MEMBER_ROLE_INFO[member.role].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Due Date</Label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Priority & Time Estimate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <Label>Estimated Time</Label>
                <select
                  value={timeEstimate}
                  onChange={(e) => setTimeEstimate(parseInt(e.target.value))}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="240">4 hours</option>
                  <option value="480">1 day</option>
                </select>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                {members.find((m) => m.user_id === assignedTo)?.profile?.full_name || 'The assigned user'}{' '}
                will see this task in their dashboard.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleDelegate}
            disabled={!title.trim() || !assignedTo || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Delegate Task'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
