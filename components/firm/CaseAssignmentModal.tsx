'use client'

import { useState, useEffect } from 'react'
import { Loader2, UserPlus, AlertCircle } from 'lucide-react'
import {
  FirmMember,
  CaseAssignment,
  CaseAssignmentRole,
  CASE_ASSIGNMENT_ROLE_INFO,
  FIRM_MEMBER_ROLE_INFO,
} from '@/types/firm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface CaseAssignmentModalProps {
  caseId: string
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

interface AssignmentRow {
  user_id: string
  role: CaseAssignmentRole
}

export default function CaseAssignmentModal({
  caseId,
  isOpen,
  onClose,
  onSave,
}: CaseAssignmentModalProps) {
  const [members, setMembers] = useState<FirmMember[]>([])
  const [currentAssignments, setCurrentAssignments] = useState<CaseAssignment[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, caseId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [membersRes, assignmentsRes] = await Promise.all([
        fetch('/api/firms/members'),
        fetch(`/api/cases/${caseId}/assignments`),
      ])

      const membersData = await membersRes.json()
      const assignmentsData = await assignmentsRes.json()

      const activeMembers = (membersData.members || []).filter(
        (m: FirmMember) => m.status === 'active'
      )
      setMembers(activeMembers)

      const existing = assignmentsData.assignments || []
      setCurrentAssignments(existing)

      // Initialize assignment rows from existing assignments
      if (existing.length > 0) {
        setAssignments(
          existing.map((a: CaseAssignment) => ({
            user_id: a.user_id,
            role: a.role,
          }))
        )
      } else {
        setAssignments([{ user_id: '', role: 'lead' }])
      }
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const updateAssignment = (
    index: number,
    field: keyof AssignmentRow,
    value: string
  ) => {
    const updated = [...assignments]
    updated[index] = { ...updated[index], [field]: value }
    setAssignments(updated)
  }

  const addAssignment = () => {
    setAssignments([...assignments, { user_id: '', role: 'supporting' }])
  }

  const removeAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setError(null)

    // Filter out empty user_ids
    const validAssignments = assignments.filter((a) => a.user_id)

    if (validAssignments.length === 0) {
      setError('At least one assignment is required')
      return
    }

    const leads = validAssignments.filter((a) => a.role === 'lead')
    if (leads.length !== 1) {
      setError('Exactly one lead attorney is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: validAssignments }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      onSave()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Filter members by role relevance for each assignment role
  const getAvailableMembers = (assignmentRole: CaseAssignmentRole) => {
    if (assignmentRole === 'paralegal') {
      return members.filter(
        (m) =>
          m.role === 'paralegal' ||
          m.role === 'legal_assistant' ||
          m.role === 'attorney' ||
          m.role === 'senior_attorney' ||
          m.role === 'owner'
      )
    }
    return members
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Assign Team Members
          </DialogTitle>
          <DialogDescription>
            Assign attorneys and staff to this case.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {assignments.map((assignment, index) => (
              <div key={index} className="flex items-center gap-3">
                <select
                  value={assignment.role}
                  onChange={(e) =>
                    updateAssignment(index, 'role', e.target.value)
                  }
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {(
                    Object.entries(CASE_ASSIGNMENT_ROLE_INFO) as [
                      CaseAssignmentRole,
                      typeof CASE_ASSIGNMENT_ROLE_INFO[CaseAssignmentRole]
                    ][]
                  ).map(([role, info]) => (
                    <option key={role} value={role}>
                      {info.label}
                    </option>
                  ))}
                </select>
                <select
                  value={assignment.user_id}
                  onChange={(e) =>
                    updateAssignment(index, 'user_id', e.target.value)
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select member...</option>
                  {getAvailableMembers(assignment.role).map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.profile?.full_name || member.invited_email || 'Unknown'} (
                      {FIRM_MEMBER_ROLE_INFO[member.role].label})
                    </option>
                  ))}
                </select>
                {assignments.length > 1 && (
                  <button
                    onClick={() => removeAssignment(index)}
                    className="p-1.5 text-gray-400 hover:text-red-500"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addAssignment}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Add assignment
            </button>

            {currentAssignments.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Saving will replace all existing assignments for this case.
                </p>
              </div>
            )}
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
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Save Assignments'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
