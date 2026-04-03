'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, X, Loader2, Users, Calendar, MapPin, Video, Clock,
  CheckCircle, XCircle, ArrowRight, Play,
} from 'lucide-react'
import type {
  MediationSession, MediationPosition, MediationOffer,
  MediationOutcome, MediationLocationType,
  PositionPriority, PositionCategory, OfferResponse,
} from '@/types/settlement'
import {
  MEDIATION_STATUS_INFO, MEDIATION_OUTCOME_INFO,
  POSITION_PRIORITY_INFO, POSITION_CATEGORY_INFO,
  formatCurrency,
} from '@/types/settlement'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

interface Props {
  caseId: string
}

export default function MediationManager({ caseId }: Props) {
  const [sessions, setSessions] = useState<MediationSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await authFetch(`/api/cases/${caseId}/mediation`)
      if (res.ok) {
        const d = await res.json()
        setSessions(d.data || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const upcoming = sessions.filter(s => s.status === 'scheduled' || s.status === 'confirmed' || s.status === 'in_progress')
  const completed = sessions.filter(s => s.status === 'completed')
  const other = sessions.filter(s => s.status === 'cancelled' || s.status === 'continued')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Mediation Sessions</h2>
          <p className="text-sm text-gray-500">Prepare for and track mediation</p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Schedule Mediation
        </button>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Upcoming ({upcoming.length})</h3>
          <div className="space-y-3">
            {upcoming.map(session => (
              <SessionCard key={session.id} session={session} onClick={() => setActiveSessionId(session.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Completed ({completed.length})</h3>
          <div className="space-y-3">
            {completed.map(session => (
              <SessionCard key={session.id} session={session} onClick={() => setActiveSessionId(session.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Other */}
      {other.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Other ({other.length})</h3>
          <div className="space-y-3">
            {other.map(session => (
              <SessionCard key={session.id} session={session} onClick={() => setActiveSessionId(session.id)} />
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No mediation sessions</p>
          <p className="text-sm mt-1">Schedule mediation to work toward settlement.</p>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleMediationModal
          caseId={caseId}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={() => {
            fetchSessions()
            setShowScheduleModal(false)
          }}
        />
      )}

      {/* Session Detail Drawer */}
      {activeSessionId && (
        <SessionDetailDrawer
          sessionId={activeSessionId}
          caseId={caseId}
          onClose={() => setActiveSessionId(null)}
          onUpdate={fetchSessions}
        />
      )}
    </div>
  )
}

// ============================================================================
// SessionCard
// ============================================================================
function SessionCard({ session, onClick }: { session: MediationSession; onClick: () => void }) {
  const now = new Date()
  const sessionDate = new Date(session.session_date)
  const daysUntil = Math.ceil((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isUpcoming = daysUntil >= 0 && session.status !== 'completed'
  const statusInfo = MEDIATION_STATUS_INFO[session.status]
  const outcomeInfo = session.outcome ? MEDIATION_OUTCOME_INFO[session.outcome] : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${session.status === 'in_progress' ? 'bg-green-100' : session.status === 'completed' ? 'bg-gray-100' : 'bg-orange-100'}`}>
            <Users className={`w-5 h-5 ${session.status === 'in_progress' ? 'text-green-600' : session.status === 'completed' ? 'text-gray-600' : 'text-orange-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-semibold text-gray-900 text-sm">Session #{session.session_number}</h4>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {outcomeInfo && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${outcomeInfo.bgColor} ${outcomeInfo.color}`}>
                  {outcomeInfo.label}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600">
              {session.mediator_name}
              {session.mediator_company && ` \u2022 ${session.mediator_company}`}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(session.session_date)}
                {session.session_start_time && ` at ${session.session_start_time.slice(0, 5)}`}
              </span>
              <span className="flex items-center gap-1">
                {session.location_type === 'video' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                {session.location_type === 'video' ? 'Video' : session.location_address || 'TBD'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          {isUpcoming && (
            <p className={`text-xs font-medium ${daysUntil <= 3 ? 'text-orange-600' : 'text-gray-500'}`}>
              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
            </p>
          )}
          {session.agreements_reached && session.agreements_reached.length > 0 && (
            <p className="text-xs text-green-600 mt-0.5">{session.agreements_reached.length} resolved</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ============================================================================
// ScheduleMediationModal
// ============================================================================
function ScheduleMediationModal({
  caseId,
  onClose,
  onScheduled,
}: {
  caseId: string
  onClose: () => void
  onScheduled: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    session_date: '',
    session_start_time: '',
    mediator_name: '',
    mediator_company: '',
    mediator_email: '',
    mediator_phone: '',
    location_type: 'video' as MediationLocationType,
    location_address: '',
    video_link: '',
    our_attendees: '',
    their_attendees: '',
    total_cost: 0,
  })

  async function handleSubmit() {
    if (!form.session_date || !form.mediator_name) return
    setSaving(true)
    try {
      await authFetch(`/api/cases/${caseId}/mediation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          our_attendees: form.our_attendees ? form.our_attendees.split(',').map(s => s.trim()) : [],
          their_attendees: form.their_attendees ? form.their_attendees.split(',').map(s => s.trim()) : [],
        }),
      })
      onScheduled()
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Schedule Mediation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date *</label>
              <input type="date" value={form.session_date} onChange={e => setForm({ ...form, session_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
              <input type="time" value={form.session_start_time} onChange={e => setForm({ ...form, session_start_time: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mediator Name *</label>
            <input type="text" value={form.mediator_name} onChange={e => setForm({ ...form, mediator_name: e.target.value })} placeholder="Mediator's full name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
              <input type="text" value={form.mediator_company} onChange={e => setForm({ ...form, mediator_company: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" value={form.mediator_email} onChange={e => setForm({ ...form, mediator_email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Location Type</label>
            <select value={form.location_type} onChange={e => setForm({ ...form, location_type: e.target.value as MediationLocationType })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="video">Video Conference</option>
              <option value="in_person">In Person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          {(form.location_type === 'in_person' || form.location_type === 'hybrid') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
              <input type="text" value={form.location_address} onChange={e => setForm({ ...form, location_address: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}

          {(form.location_type === 'video' || form.location_type === 'hybrid') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Video Link</label>
              <input type="url" value={form.video_link} onChange={e => setForm({ ...form, video_link: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Our Attendees (comma separated)</label>
              <input type="text" value={form.our_attendees} onChange={e => setForm({ ...form, our_attendees: e.target.value })} placeholder="Names..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Their Attendees</label>
              <input type="text" value={form.their_attendees} onChange={e => setForm({ ...form, their_attendees: e.target.value })} placeholder="Names..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estimated Cost</label>
            <input type="number" value={form.total_cost} onChange={e => setForm({ ...form, total_cost: parseFloat(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={!form.session_date || !form.mediator_name || saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Scheduling...' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SessionDetailDrawer
// ============================================================================
function SessionDetailDrawer({
  sessionId,
  caseId: _caseId,
  onClose,
  onUpdate,
}: {
  sessionId: string
  caseId: string
  onClose: () => void
  onUpdate: () => void
}) {
  const [session, setSession] = useState<MediationSession | null>(null)
  const [positions, setPositions] = useState<MediationPosition[]>([])
  const [offers, setOffers] = useState<MediationOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'prep' | 'positions' | 'live' | 'summary'>('prep')
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [showAddOffer, setShowAddOffer] = useState(false)

  const fetchSession = useCallback(async () => {
    try {
      const res = await authFetch(`/api/mediation/${sessionId}`)
      if (res.ok) {
        const d = await res.json()
        setSession(d.data)
        setPositions(d.data.positions || [])
        setOffers(d.data.offers || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { fetchSession() }, [fetchSession])

  async function handleStartSession() {
    await authFetch(`/api/mediation/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    })
    fetchSession()
    setActiveTab('live')
  }

  async function handleCompleteSession(outcome: MediationOutcome) {
    await authFetch(`/api/mediation/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        outcome,
        session_end_time: new Date().toTimeString().slice(0, 5),
      }),
    })
    fetchSession()
    onUpdate()
    setActiveTab('summary')
  }

  async function handleUpdateNotes(field: string, value: string) {
    await authFetch(`/api/mediation/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
  }

  async function handleAddPosition(posData: Record<string, unknown>) {
    await authFetch(`/api/mediation/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'add_position', ...posData }),
    })
    fetchSession()
    setShowAddPosition(false)
  }

  async function handleResolvePosition(positionId: string, resolution: string) {
    await authFetch(`/api/mediation/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'update_position', position_id: positionId, resolved: true, final_resolution: resolution }),
    })
    fetchSession()
  }

  async function handleAddOffer(offerData: Record<string, unknown>) {
    await authFetch(`/api/mediation/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'add_offer', ...offerData }),
    })
    fetchSession()
    setShowAddOffer(false)
  }

  async function handleRespondOffer(offerId: string, response: OfferResponse) {
    await authFetch(`/api/mediation/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'respond_offer', offer_id: offerId, response }),
    })
    fetchSession()
  }

  const isLive = session?.status === 'in_progress'
  const isCompleted = session?.status === 'completed'

  const TABS = [
    { key: 'prep' as const, label: 'Prep' },
    { key: 'positions' as const, label: 'Positions' },
    { key: 'live' as const, label: isLive ? 'Live' : 'Notes', disabled: !isLive && !isCompleted },
    { key: 'summary' as const, label: 'Summary', disabled: !isCompleted },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : session ? (
          <div>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
              <div className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Mediation Session #{session.session_number}</h3>
                  <p className="text-xs text-gray-500">{formatDate(session.session_date)} with {session.mediator_name}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isLive && (
                <div className="mx-4 mb-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-green-700 font-medium">Session In Progress</span>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => !tab.disabled && setActiveTab(tab.key)}
                    disabled={tab.disabled}
                    className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-600'
                        : tab.disabled
                          ? 'border-transparent text-gray-300 cursor-not-allowed'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {/* PREP TAB */}
              {activeTab === 'prep' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Pre-Session Notes</label>
                    <textarea
                      defaultValue={session.pre_session_notes || ''}
                      onBlur={e => handleUpdateNotes('pre_session_notes', e.target.value)}
                      placeholder="Key points to remember, strategy notes, client instructions..."
                      rows={5}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Our Side</p>
                      <div className="flex flex-wrap gap-1">
                        {session.our_attendees?.map((a, i) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{a}</span>
                        ))}
                        {(!session.our_attendees || session.our_attendees.length === 0) && (
                          <span className="text-xs text-gray-400">None listed</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Their Side</p>
                      <div className="flex flex-wrap gap-1">
                        {session.their_attendees?.map((a, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{a}</span>
                        ))}
                        {(!session.their_attendees || session.their_attendees.length === 0) && (
                          <span className="text-xs text-gray-400">None listed</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Session Details</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Location:</span> {session.location_type === 'video' ? 'Video' : session.location_address || 'TBD'}</div>
                      <div><span className="text-gray-500">Cost:</span> {session.total_cost > 0 ? formatCurrency(session.total_cost) : 'N/A'}</div>
                      {session.video_link && <div className="col-span-2"><span className="text-gray-500">Link:</span> <a href={session.video_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{session.video_link}</a></div>}
                    </div>
                  </div>

                  {!isLive && !isCompleted && (
                    <button onClick={handleStartSession} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm hover:bg-green-700">
                      <Play className="w-4 h-4" /> Start Mediation Session
                    </button>
                  )}
                </div>
              )}

              {/* POSITIONS TAB */}
              {activeTab === 'positions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-gray-900">Issue Positions</h4>
                    <button onClick={() => setShowAddPosition(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                      <Plus className="w-3 h-3" /> Add Issue
                    </button>
                  </div>

                  {positions.map(pos => {
                    const priorityInfo = POSITION_PRIORITY_INFO[pos.priority]
                    const catInfo = POSITION_CATEGORY_INFO[pos.issue_category]
                    return (
                      <div key={pos.id} className={`border rounded-lg p-3 ${pos.resolved ? 'bg-green-50 border-green-200' : 'border-gray-200'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-sm text-gray-900">{pos.issue_name}</h5>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{catInfo?.label}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${priorityInfo.bgColor} ${priorityInfo.color}`}>{priorityInfo.label}</span>
                          </div>
                          {pos.resolved && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">Resolved</span>}
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-gray-500">Our Starting</p>
                            <p className="font-medium">{pos.our_starting_position || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Our Target</p>
                            <p className="font-medium text-green-600">{pos.our_target || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Bottom Line</p>
                            <p className="font-medium text-red-600">{pos.our_bottom_line || '—'}</p>
                          </div>
                        </div>

                        {pos.their_known_position && (
                          <div className="mt-2 bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500">Their Known Position</p>
                            <p className="text-xs">{pos.their_known_position}</p>
                          </div>
                        )}

                        {pos.resolved && pos.final_resolution && (
                          <div className="mt-2 bg-green-100 rounded p-2">
                            <p className="text-xs text-green-700">Final Resolution</p>
                            <p className="text-xs font-medium text-green-800">{pos.final_resolution}</p>
                          </div>
                        )}

                        {!pos.resolved && (isLive || !isCompleted) && (
                          <div className="mt-2">
                            <button
                              onClick={() => {
                                const resolution = prompt('Enter final resolution:')
                                if (resolution) handleResolvePosition(pos.id, resolution)
                              }}
                              className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" /> Mark Resolved
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {positions.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">No positions prepared yet. Add issues to track during mediation.</p>
                  )}

                  {showAddPosition && (
                    <AddPositionForm onAdd={handleAddPosition} onCancel={() => setShowAddPosition(false)} />
                  )}
                </div>
              )}

              {/* LIVE/NOTES TAB */}
              {activeTab === 'live' && (
                <div className="space-y-4">
                  {/* Offer Tracker */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm text-gray-900">Offers</h4>
                      {isLive && (
                        <button onClick={() => setShowAddOffer(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                          <Plus className="w-3 h-3" /> Track Offer
                        </button>
                      )}
                    </div>

                    {offers.map(offer => (
                      <div key={offer.id} className="border border-gray-200 rounded-lg p-3 mb-2">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <span className="text-xs font-medium text-gray-500">#{offer.offer_number}</span>
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${offer.offered_by === 'our_client' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {offer.offered_by === 'our_client' ? 'Our offer' : 'Their offer'}
                            </span>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            offer.response === 'accepted' ? 'bg-green-100 text-green-700' :
                            offer.response === 'rejected' ? 'bg-red-100 text-red-700' :
                            offer.response === 'countered' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {offer.response}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{offer.offer_summary}</p>
                        {offer.response_notes && <p className="text-xs text-gray-500 mt-1">{offer.response_notes}</p>}

                        {isLive && offer.response === 'pending' && (
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => handleRespondOffer(offer.id, 'accepted')} className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Accept</button>
                            <button onClick={() => handleRespondOffer(offer.id, 'rejected')} className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" /> Reject</button>
                            <button onClick={() => handleRespondOffer(offer.id, 'countered')} className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Counter</button>
                          </div>
                        )}
                      </div>
                    ))}

                    {showAddOffer && (
                      <AddOfferForm onAdd={handleAddOffer} onCancel={() => setShowAddOffer(false)} />
                    )}
                  </div>

                  {/* Session Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Session Notes</label>
                    <textarea
                      defaultValue={session.session_notes || ''}
                      onBlur={e => handleUpdateNotes('session_notes', e.target.value)}
                      placeholder="Real-time notes during mediation..."
                      rows={10}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  {/* End Session */}
                  {isLive && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-2">End Session</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleCompleteSession('full_settlement')} className="flex items-center justify-center gap-1.5 text-xs border border-green-500 text-green-700 rounded-lg py-2 hover:bg-green-50">
                          <CheckCircle className="w-3.5 h-3.5" /> Full Settlement
                        </button>
                        <button onClick={() => handleCompleteSession('partial_settlement')} className="flex items-center justify-center gap-1.5 text-xs border border-yellow-500 text-yellow-700 rounded-lg py-2 hover:bg-yellow-50">
                          <Clock className="w-3.5 h-3.5" /> Partial Settlement
                        </button>
                        <button onClick={() => handleCompleteSession('no_agreement')} className="flex items-center justify-center gap-1.5 text-xs border border-red-500 text-red-700 rounded-lg py-2 hover:bg-red-50">
                          <XCircle className="w-3.5 h-3.5" /> No Agreement
                        </button>
                        <button onClick={() => handleCompleteSession('continued')} className="flex items-center justify-center gap-1.5 text-xs border border-blue-500 text-blue-700 rounded-lg py-2 hover:bg-blue-50">
                          <ArrowRight className="w-3.5 h-3.5" /> Continued
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUMMARY TAB */}
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  {session.outcome && (
                    <div className={`rounded-lg p-3 ${MEDIATION_OUTCOME_INFO[session.outcome]?.bgColor || 'bg-gray-100'}`}>
                      <p className={`font-semibold ${MEDIATION_OUTCOME_INFO[session.outcome]?.color || 'text-gray-700'}`}>
                        {MEDIATION_OUTCOME_INFO[session.outcome]?.label || session.outcome}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-2">Agreements Reached</h4>
                    {session.agreements_reached && session.agreements_reached.length > 0 ? (
                      <ul className="space-y-1">
                        {session.agreements_reached.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span>{typeof a === 'string' ? a : JSON.stringify(a)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400">No agreements recorded</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-2">Open Issues</h4>
                    {session.open_issues && session.open_issues.length > 0 ? (
                      <ul className="space-y-1">
                        {session.open_issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Clock className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                            <span>{typeof issue === 'string' ? issue : JSON.stringify(issue)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400">All issues resolved</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-1">Next Steps</h4>
                    <p className="text-sm text-gray-700">{session.next_steps || 'No next steps recorded'}</p>
                    {session.follow_up_deadline && (
                      <p className="text-xs text-orange-600 mt-1">Deadline: {formatDate(session.follow_up_deadline)}</p>
                    )}
                  </div>

                  {/* Resolved positions summary */}
                  {positions.filter(p => p.resolved).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-2">Resolved Positions</h4>
                      <div className="space-y-1">
                        {positions.filter(p => p.resolved).map(p => (
                          <div key={p.id} className="bg-green-50 rounded p-2">
                            <p className="text-xs font-medium text-green-800">{p.issue_name}</p>
                            <p className="text-xs text-green-700">{p.final_resolution}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">Session not found</div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// AddPositionForm
// ============================================================================
function AddPositionForm({ onAdd, onCancel }: { onAdd: (data: Record<string, unknown>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    issue_category: 'property' as PositionCategory,
    issue_name: '',
    our_starting_position: '',
    our_target: '',
    our_bottom_line: '',
    their_known_position: '',
    priority: 'medium' as PositionPriority,
    batna: '',
  })

  return (
    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-3">
      <h5 className="font-medium text-sm text-blue-900">Add Position</h5>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Category</label>
          <select value={form.issue_category} onChange={e => setForm({ ...form, issue_category: e.target.value as PositionCategory })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
            {Object.entries(POSITION_CATEGORY_INFO).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Priority</label>
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as PositionPriority })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
            {Object.entries(POSITION_PRIORITY_INFO).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Issue Name</label>
        <input type="text" value={form.issue_name} onChange={e => setForm({ ...form, issue_name: e.target.value })} placeholder="e.g., Family Residence" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Our Starting</label>
          <input type="text" value={form.our_starting_position} onChange={e => setForm({ ...form, our_starting_position: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Our Target</label>
          <input type="text" value={form.our_target} onChange={e => setForm({ ...form, our_target: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bottom Line</label>
          <input type="text" value={form.our_bottom_line} onChange={e => setForm({ ...form, our_bottom_line: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Their Known Position</label>
        <input type="text" value={form.their_known_position} onChange={e => setForm({ ...form, their_known_position: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs text-gray-600 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
        <button onClick={() => form.issue_name && onAdd(form)} disabled={!form.issue_name} className="text-xs text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">Add</button>
      </div>
    </div>
  )
}

// ============================================================================
// AddOfferForm
// ============================================================================
function AddOfferForm({ onAdd, onCancel }: { onAdd: (data: Record<string, unknown>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    offered_by: 'our_client' as 'our_client' | 'opposing',
    offer_summary: '',
  })

  return (
    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-3">
      <h5 className="font-medium text-sm text-blue-900">Track Offer</h5>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Offered By</label>
        <select value={form.offered_by} onChange={e => setForm({ ...form, offered_by: e.target.value as 'our_client' | 'opposing' })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="our_client">Our Client</option>
          <option value="opposing">Opposing</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Offer Summary</label>
        <textarea value={form.offer_summary} onChange={e => setForm({ ...form, offer_summary: e.target.value })} placeholder="Describe the offer..." rows={3} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs text-gray-600 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
        <button onClick={() => form.offer_summary && onAdd(form)} disabled={!form.offer_summary} className="text-xs text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">Track</button>
      </div>
    </div>
  )
}
