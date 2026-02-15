'use client'

import { useState, useEffect } from 'react'
import { Loader2, Info } from 'lucide-react'
import { CoverageType, CreateCoverageRequest } from '@/types/collaboration'
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

interface CoverageSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CoverageSetupModal({
  isOpen,
  onClose,
  onCreated,
}: CoverageSetupModalProps) {
  const [members, setMembers] = useState<FirmMember[]>([])
  const [cases, setCases] = useState<{ id: string; case_number: string; client_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [coverageAttorneyId, setCoverageAttorneyId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [coverageType, setCoverageType] = useState<CoverageType>('full_coverage')
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadData()
      // Defaults
      const start = new Date()
      const end = new Date()
      end.setDate(end.getDate() + 7)
      setStartDate(start.toISOString().split('T')[0])
      setEndDate(end.toISOString().split('T')[0])
    }
  }, [isOpen])

  const loadData = async () => {
    setLoading(true)
    try {
      const [membersRes, casesRes] = await Promise.all([
        fetch('/api/firms/members'),
        fetch('/api/cases?limit=50'),
      ])
      const membersData = await membersRes.json()
      const casesData = await casesRes.json()

      const attorneys = (membersData.members || []).filter(
        (m: FirmMember) =>
          m.status === 'active' &&
          ['owner', 'senior_attorney', 'attorney'].includes(m.role)
      )
      setMembers(attorneys)
      setCases(casesData.cases || [])
    } finally {
      setLoading(false)
    }
  }

  const toggleCase = (caseId: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(caseId)
        ? prev.filter((id) => id !== caseId)
        : [...prev, caseId]
    )
  }

  const handleSetupCoverage = async () => {
    setError(null)
    if (!coverageAttorneyId) {
      setError('Please select a coverage attorney')
      return
    }

    setSaving(true)
    try {
      const payload: CreateCoverageRequest = {
        coverage_attorney_id: coverageAttorneyId,
        start_date: startDate,
        end_date: endDate,
        coverage_type: coverageType,
        case_ids: coverageType === 'specific_cases' ? selectedCaseIds : undefined,
        notes: notes || undefined,
      }

      const res = await fetch('/api/coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to set up coverage')
      }

      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up coverage')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Up Coverage</DialogTitle>
          <DialogDescription>
            Assign another attorney to cover your cases while you&apos;re away
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

            {/* Coverage Attorney */}
            <div>
              <Label>Coverage Attorney *</Label>
              <select
                value={coverageAttorneyId}
                onChange={(e) => setCoverageAttorneyId(e.target.value)}
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select attorney...</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.profile?.full_name || member.invited_email || 'Unknown'} -{' '}
                    {FIRM_MEMBER_ROLE_INFO[member.role].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Coverage Type */}
            <div>
              <Label>Coverage Type</Label>
              <div className="mt-2 space-y-2">
                {[
                  {
                    value: 'full_coverage' as CoverageType,
                    label: 'Full Coverage',
                    desc: 'All cases and communications',
                  },
                  {
                    value: 'urgent_only' as CoverageType,
                    label: 'Urgent Only',
                    desc: 'Emergencies and deadlines only',
                  },
                  {
                    value: 'specific_cases' as CoverageType,
                    label: 'Specific Cases',
                    desc: 'Select which cases to cover',
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      coverageType === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="coverageType"
                      value={option.value}
                      checked={coverageType === option.value}
                      onChange={() => setCoverageType(option.value)}
                      className="text-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Specific cases selector */}
            {coverageType === 'specific_cases' && (
              <div>
                <Label>Select Cases</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {cases.length > 0 ? (
                    cases.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCaseIds.includes(c.id)}
                          onChange={() => toggleCase(c.id)}
                          className="rounded text-blue-600"
                        />
                        <span>
                          {c.client_name} - Case #{c.case_number}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No cases available</p>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label>Special Instructions</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any important notes for the covering attorney..."
                rows={3}
                className="mt-1 w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                The coverage attorney will receive notifications for your cases during this period.
                You&apos;ll receive a handoff summary when coverage ends.
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
            onClick={handleSetupCoverage}
            disabled={!coverageAttorneyId || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Set Up Coverage'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
