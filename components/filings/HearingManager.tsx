'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState, useEffect } from 'react'
import {
  Calendar, Plus, Loader2, X,
  Video, Phone, Monitor, Building, User,
  CheckCircle2, AlertTriangle, Gavel,
  ExternalLink, Circle,
} from 'lucide-react'
import {
  HEARING_TYPE_INFO,
  HEARING_STATUS_INFO,
  APPEARANCE_TYPE_INFO,
  formatHearingCountdown,
  getHearingUrgency,
  type CourtHearing,
  type HearingType,
  type HearingStatus,
  type AppearanceType,
  type HearingPrepTask,
} from '@/types/court-forms'

interface Props {
  caseId: string
}

export default function HearingManager({ caseId }: Props) {
  const [hearings, setHearings] = useState<CourtHearing[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedHearing, setSelectedHearing] = useState<string | null>(null)

  async function loadHearings() {
    try {
      const res = await authFetch(`/api/cases/${caseId}/hearings`)
      if (res.ok) {
        const json = await res.json()
        setHearings(json.data || [])
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHearings()
  }, [caseId])

  const upcomingHearings = hearings.filter(h =>
    (h.status === 'scheduled' || h.status === 'confirmed') &&
    new Date(h.hearing_date) >= new Date(new Date().toISOString().split('T')[0])
  )
  const pastHearings = hearings.filter(h =>
    h.status === 'completed' || h.status === 'vacated' ||
    (h.status !== 'continued' && new Date(h.hearing_date) < new Date(new Date().toISOString().split('T')[0]))
  )
  const continuedHearings = hearings.filter(h => h.status === 'continued')

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Court Hearings</h2>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and prepare for hearings</p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Schedule Hearing
        </button>
      </div>

      {/* Upcoming */}
      {upcomingHearings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Upcoming</h3>
          <div className="space-y-3">
            {upcomingHearings.map(hearing => (
              <HearingCard
                key={hearing.id}
                hearing={hearing}
                onClick={() => setSelectedHearing(hearing.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Continued */}
      {continuedHearings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Continued</h3>
          <div className="space-y-3">
            {continuedHearings.map(hearing => (
              <HearingCard
                key={hearing.id}
                hearing={hearing}
                onClick={() => setSelectedHearing(hearing.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {pastHearings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Past</h3>
          <div className="space-y-3">
            {pastHearings.map(hearing => (
              <HearingCard
                key={hearing.id}
                hearing={hearing}
                onClick={() => setSelectedHearing(hearing.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {hearings.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No Hearings Scheduled</h3>
          <p className="text-sm text-gray-500 mb-4">Schedule court hearings and track preparation</p>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Schedule First Hearing
          </button>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleHearingModal
          caseId={caseId}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={() => {
            setShowScheduleModal(false)
            loadHearings()
          }}
        />
      )}

      {/* Hearing Detail */}
      {selectedHearing && (
        <HearingDetail
          caseId={caseId}
          hearingId={selectedHearing}
          onClose={() => setSelectedHearing(null)}
          onUpdate={loadHearings}
        />
      )}
    </div>
  )
}

// ============================================================
// HEARING CARD
// ============================================================
function HearingCard({ hearing, onClick }: { hearing: CourtHearing; onClick: () => void }) {
  const urgency = getHearingUrgency(hearing.hearing_date)
  const isUpcoming = urgency !== 'past'
  const isUrgent = urgency === 'today' || urgency === 'tomorrow'
  const statusInfo = HEARING_STATUS_INFO[hearing.status as HearingStatus]
  const typeInfo = HEARING_TYPE_INFO[hearing.hearing_type as HearingType]

  const prepComplete = (hearing.prep_tasks || []).filter(t => t.status === 'complete').length
  const prepTotal = (hearing.prep_tasks || []).length

  const AppearanceIcon = hearing.appearance_type === 'remote' ? Video
    : hearing.appearance_type === 'telephonic' ? Phone
    : hearing.appearance_type === 'hybrid' ? Monitor
    : Building

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 bg-white border rounded-lg hover:shadow-md transition ${
        isUrgent ? 'border-orange-400 border-2' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${
            hearing.status === 'completed' ? 'bg-gray-100' :
            hearing.appearance_type === 'remote' ? 'bg-purple-100' :
            'bg-blue-100'
          }`}>
            {hearing.status === 'completed' ? (
              <Gavel className="w-5 h-5 text-gray-500" />
            ) : (
              <AppearanceIcon className={`w-5 h-5 ${
                hearing.appearance_type === 'remote' ? 'text-purple-600' : 'text-blue-600'
              }`} />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-900">
                {hearing.hearing_name || typeInfo?.label || hearing.hearing_type}
              </h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                {statusInfo?.label || hearing.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(hearing.hearing_date).toLocaleDateString()}
                {hearing.hearing_time && ` at ${hearing.hearing_time}`}
              </span>
              {hearing.department && (
                <span className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  Dept. {hearing.department}
                </span>
              )}
              {hearing.judge_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Judge {hearing.judge_name}
                </span>
              )}
            </div>

            {/* Prep tasks progress */}
            {isUpcoming && prepTotal > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 max-w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${prepTotal > 0 ? (prepComplete / prepTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{prepComplete}/{prepTotal} prep</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          {isUpcoming && hearing.status !== 'vacated' && (
            <p className={`text-sm font-medium ${isUrgent ? 'text-orange-600' : 'text-gray-600'}`}>
              {formatHearingCountdown(hearing.hearing_date)}
            </p>
          )}
          {hearing.outcome && (
            <p className="text-xs text-gray-500 mt-1 max-w-40 truncate">{hearing.outcome}</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ============================================================
// SCHEDULE HEARING MODAL
// ============================================================
function ScheduleHearingModal({
  caseId,
  onClose,
  onScheduled,
}: {
  caseId: string
  onClose: () => void
  onScheduled: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hearingType, setHearingType] = useState<string>('rfo')
  const [hearingName, setHearingName] = useState('')
  const [hearingDate, setHearingDate] = useState('')
  const [hearingTime, setHearingTime] = useState('')
  const [department, setDepartment] = useState('')
  const [judgeName, setJudgeName] = useState('')
  const [appearanceType, setAppearanceType] = useState<string>('in_person')
  const [remoteLink, setRemoteLink] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit() {
    if (!hearingDate) {
      setError('Hearing date is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await authFetch(`/api/cases/${caseId}/hearings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hearing_type: hearingType,
          hearing_name: hearingName || null,
          hearing_date: hearingDate,
          hearing_time: hearingTime || null,
          department: department || null,
          judge_name: judgeName || null,
          appearance_type: appearanceType,
          remote_link: remoteLink || null,
          notes: notes || null,
        }),
      })

      const json = await res.json()
      if (json.error) {
        setError(json.error)
        return
      }

      onScheduled()
    } catch {
      setError('Failed to schedule hearing')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Schedule Hearing</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hearing Type *</label>
            <select
              value={hearingType}
              onChange={e => setHearingType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(HEARING_TYPE_INFO).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Name</label>
            <input
              type="text"
              value={hearingName}
              onChange={e => setHearingName(e.target.value)}
              placeholder={HEARING_TYPE_INFO[hearingType as HearingType]?.label || 'Hearing'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={hearingDate}
                onChange={e => setHearingDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={hearingTime}
                onChange={e => setHearingTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g., Dept. 12"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Judge</label>
              <input
                type="text"
                value={judgeName}
                onChange={e => setJudgeName(e.target.value)}
                placeholder="Judge name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appearance Type</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(APPEARANCE_TYPE_INFO).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAppearanceType(key)}
                  className={`p-2 rounded-lg border text-xs font-medium text-center ${
                    appearanceType === key
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          {(appearanceType === 'remote' || appearanceType === 'hybrid') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remote Link</label>
              <input
                type="url"
                value={remoteLink}
                onChange={e => setRemoteLink(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !hearingDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Schedule Hearing
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// HEARING DETAIL (Overlay)
// ============================================================
function HearingDetail({
  caseId,
  hearingId,
  onClose,
  onUpdate,
}: {
  caseId: string
  hearingId: string
  onClose: () => void
  onUpdate: () => void
}) {
  const [hearing, setHearing] = useState<CourtHearing | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`/api/cases/${caseId}/hearings/${hearingId}`)
        if (res.ok) {
          const json = await res.json()
          setHearing(json.data)
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [caseId, hearingId])

  async function handleAction(action: string, extra?: Record<string, unknown>) {
    setUpdating(true)
    try {
      await authFetch(`/api/cases/${caseId}/hearings/${hearingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      onUpdate()
      if (action === 'vacate') onClose()
      else {
        // Reload
        const res = await authFetch(`/api/cases/${caseId}/hearings/${hearingId}`)
        if (res.ok) {
          const json = await res.json()
          setHearing(json.data)
        }
      }
    } catch {
      // Ignore
    } finally {
      setUpdating(false)
    }
  }

  async function handlePrepTaskToggle(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'complete' ? 'pending' : 'complete'
    try {
      await authFetch(`/api/cases/${caseId}/hearings/${hearingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_prep_task', task_id: taskId, status: newStatus }),
      })
      // Reload
      const res = await authFetch(`/api/cases/${caseId}/hearings/${hearingId}`)
      if (res.ok) {
        const json = await res.json()
        setHearing(json.data)
        onUpdate()
      }
    } catch {
      // Ignore
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!hearing) return null

  const typeInfo = HEARING_TYPE_INFO[hearing.hearing_type as HearingType]
  const statusInfo = HEARING_STATUS_INFO[hearing.status as HearingStatus]
  const urgency = getHearingUrgency(hearing.hearing_date)
  const isUpcoming = urgency !== 'past' && hearing.status !== 'vacated' && hearing.status !== 'completed'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {hearing.hearing_name || typeInfo?.label}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo?.color || ''}`}>
                {statusInfo?.label || hearing.status}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(hearing.hearing_date).toLocaleDateString()}
                {hearing.hearing_time && ` at ${hearing.hearing_time}`}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Type</p>
              <p className="text-sm font-medium text-gray-900">{typeInfo?.label || hearing.hearing_type}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Appearance</p>
              <p className="text-sm font-medium text-gray-900">
                {APPEARANCE_TYPE_INFO[hearing.appearance_type as AppearanceType]?.label || hearing.appearance_type}
              </p>
            </div>
            {hearing.department && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Department</p>
                <p className="text-sm font-medium text-gray-900">{hearing.department}</p>
              </div>
            )}
            {hearing.judge_name && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Judge</p>
                <p className="text-sm font-medium text-gray-900">{hearing.judge_name}</p>
              </div>
            )}
            {hearing.court && (
              <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                <p className="text-xs text-gray-500">Court</p>
                <p className="text-sm font-medium text-gray-900">{hearing.court.court_name} - {hearing.court.county} County</p>
              </div>
            )}
          </div>

          {/* Remote link */}
          {hearing.remote_link && (
            <a
              href={hearing.remote_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-100"
            >
              <Video className="w-4 h-4" />
              Join Remote Hearing
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
          )}

          {/* Tentative ruling */}
          {hearing.tentative_ruling && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-medium text-yellow-800">Tentative Ruling</p>
              <p className="text-sm text-yellow-700 mt-1">{hearing.tentative_ruling}</p>
            </div>
          )}

          {/* Prep tasks */}
          {hearing.prep_tasks && hearing.prep_tasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Preparation Tasks</h3>
              <div className="space-y-2">
                {hearing.prep_tasks.map((task: HearingPrepTask) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                      task.status === 'complete' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
                    }`}
                  >
                    <button
                      onClick={() => handlePrepTaskToggle(task.id, task.status)}
                      className="flex-shrink-0"
                    >
                      {task.status === 'complete' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className={`text-sm ${task.status === 'complete' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {task.task_title}
                      </p>
                      {task.due_date && (
                        <p className="text-xs text-gray-400">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outcome (completed hearings) */}
          {hearing.status === 'completed' && hearing.outcome && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600">Outcome</p>
              <p className="text-sm text-gray-900 mt-1">{hearing.outcome}</p>
              {hearing.outcome_details && (
                <p className="text-xs text-gray-500 mt-1">{hearing.outcome_details}</p>
              )}
              {hearing.orders_issued && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-600">Orders Issued</p>
                  <p className="text-sm text-gray-900">{hearing.orders_issued}</p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {hearing.notes && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600">Notes</p>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{hearing.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {isUpcoming && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => handleAction('vacate')}
              disabled={updating}
              className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              Vacate
            </button>
            <button
              onClick={() => handleAction('complete', { outcome: 'Completed' })}
              disabled={updating}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Mark Completed
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
