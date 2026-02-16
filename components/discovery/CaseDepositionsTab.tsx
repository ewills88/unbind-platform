'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, Plus, Calendar, MapPin, Video, Clock, Loader2,
  ChevronDown, ChevronUp, Trash2, X, FileText, AlertCircle,
  CheckCircle, MessageSquare, Mic,
} from 'lucide-react'
import type {
  Deposition, DeponentType, DepositionLocationType, DepositionStatus,
  DepositionTopic, DepositionExhibit, DepositionTestimonyNote,
  TestimonyNoteType,
} from '@/types/discovery'
import {
  DEPOSITION_STATUS_INFO, DEPONENT_TYPE_INFO,
  LOCATION_TYPE_INFO, NOTE_TYPE_INFO,
} from '@/types/discovery'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

interface Props {
  caseId: string
}

export default function CaseDepositionsTab({ caseId }: Props) {
  const [depositions, setDepositions] = useState<Deposition[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<Deposition | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchDepositions = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/depositions`)
      if (res.ok) {
        const d = await res.json()
        setDepositions(d.data || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { fetchDepositions() }, [fetchDepositions])

  async function fetchDetail(id: string) {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/depositions/${id}`)
      if (res.ok) {
        const d = await res.json()
        setDetailData(d.data)
      }
    } catch {
      // silently handle
    } finally {
      setLoadingDetail(false)
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      setDetailData(null)
    } else {
      setExpandedId(id)
      fetchDetail(id)
    }
  }

  async function handleStatusChange(id: string, status: DepositionStatus) {
    try {
      await fetch(`/api/depositions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchDepositions()
      if (expandedId === id) fetchDetail(id)
    } catch {
      // silently handle
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this deposition?')) return
    try {
      await fetch(`/api/depositions/${id}`, { method: 'DELETE' })
      if (expandedId === id) {
        setExpandedId(null)
        setDetailData(null)
      }
      fetchDepositions()
    } catch {
      // silently handle
    }
  }

  const upcoming = depositions.filter(d =>
    ['scheduled', 'confirmed'].includes(d.status) && d.scheduled_date
  )
  const past = depositions.filter(d =>
    ['completed', 'cancelled', 'postponed'].includes(d.status) || d.status === 'in_progress'
  )

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
          <h2 className="text-lg font-semibold text-gray-900">Depositions</h2>
          <p className="text-sm text-gray-500">{depositions.length} total</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Schedule Deposition
        </button>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Upcoming ({upcoming.length})
          </h3>
          <div className="space-y-3">
            {upcoming.map(dep => (
              <DepositionCard
                key={dep.id}
                deposition={dep}
                expanded={expandedId === dep.id}
                detailData={expandedId === dep.id ? detailData : null}
                loadingDetail={expandedId === dep.id && loadingDetail}
                onToggle={() => toggleExpand(dep.id)}
                onStatusChange={handleStatusChange}
                onDelete={() => handleDelete(dep.id)}
                onRefresh={() => { fetchDepositions(); if (expandedId === dep.id) fetchDetail(dep.id) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past / In Progress */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Past / Other ({past.length})
          </h3>
          <div className="space-y-3">
            {past.map(dep => (
              <DepositionCard
                key={dep.id}
                deposition={dep}
                expanded={expandedId === dep.id}
                detailData={expandedId === dep.id ? detailData : null}
                loadingDetail={expandedId === dep.id && loadingDetail}
                onToggle={() => toggleExpand(dep.id)}
                onStatusChange={handleStatusChange}
                onDelete={() => handleDelete(dep.id)}
                onRefresh={() => { fetchDepositions(); if (expandedId === dep.id) fetchDetail(dep.id) }}
              />
            ))}
          </div>
        </div>
      )}

      {depositions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No depositions scheduled</p>
          <p className="text-sm mt-1">Schedule a deposition to start tracking prep, exhibits, and notes.</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <ScheduleDepositionModal
          caseId={caseId}
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); fetchDepositions() }}
        />
      )}
    </div>
  )
}

// ============================================================================
// DepositionCard
// ============================================================================
interface CardProps {
  deposition: Deposition
  expanded: boolean
  detailData: Deposition | null
  loadingDetail: boolean
  onToggle: () => void
  onStatusChange: (id: string, status: DepositionStatus) => void
  onDelete: () => void
  onRefresh: () => void
}

function DepositionCard({
  deposition, expanded, detailData, loadingDetail,
  onToggle, onStatusChange, onDelete, onRefresh,
}: CardProps) {
  const statusInfo = DEPOSITION_STATUS_INFO[deposition.status]
  const typeInfo = DEPONENT_TYPE_INFO[deposition.deponent_type]
  const locInfo = LOCATION_TYPE_INFO[deposition.location_type]

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Summary row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="shrink-0">
          {deposition.location_type === 'remote' ? (
            <Video className="w-5 h-5 text-blue-500" />
          ) : (
            <Users className="w-5 h-5 text-gray-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{deposition.deponent_name}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
            <span>{typeInfo?.label}</span>
            {deposition.scheduled_date && (
              <>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDateTime(deposition.scheduled_date)}
                </span>
              </>
            )}
            {deposition.location && (
              <>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {deposition.location}
                </span>
              </>
            )}
          </div>
        </div>

        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusInfo.bgColor} ${statusInfo.color}`}>
          {statusInfo.label}
        </span>

        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {loadingDetail ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : detailData ? (
            <>
              {/* Info grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Location Type</p>
                  <p className="font-medium">{locInfo?.label}</p>
                </div>
                {detailData.court_reporter && (
                  <div>
                    <p className="text-gray-500 text-xs">Court Reporter</p>
                    <p className="font-medium">{detailData.court_reporter}</p>
                  </div>
                )}
                {detailData.videographer && (
                  <div>
                    <p className="text-gray-500 text-xs">Videographer</p>
                    <p className="font-medium">{detailData.videographer}</p>
                  </div>
                )}
                {detailData.duration_hours && (
                  <div>
                    <p className="text-gray-500 text-xs">Duration</p>
                    <p className="font-medium">{detailData.duration_hours} hours</p>
                  </div>
                )}
                {detailData.video_link && (
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs">Video Link</p>
                    <a href={detailData.video_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate block">
                      {detailData.video_link}
                    </a>
                  </div>
                )}
              </div>

              {/* Prep Topics */}
              <TopicsSection
                depositionId={detailData.id}
                topics={detailData.topics || []}
                onRefresh={onRefresh}
              />

              {/* Exhibits */}
              <ExhibitsSection
                depositionId={detailData.id}
                exhibits={detailData.exhibits || []}
                onRefresh={onRefresh}
              />

              {/* Testimony Notes */}
              <NotesSection
                depositionId={detailData.id}
                notes={detailData.testimony_notes || []}
                onRefresh={onRefresh}
              />

              {/* Summary */}
              {detailData.summary && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Summary</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{detailData.summary}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <select
                  value={deposition.status}
                  onChange={(e) => onStatusChange(deposition.id, e.target.value as DepositionStatus)}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  {Object.entries(DEPOSITION_STATUS_INFO).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <div className="flex-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Topics Section
// ============================================================================
function TopicsSection({
  depositionId, topics, onRefresh,
}: { depositionId: string; topics: DepositionTopic[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newTopic, setNewTopic] = useState('')
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [saving, setSaving] = useState(false)

  async function addTopic() {
    if (!newTopic.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/depositions/${depositionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'add_topic', topic: newTopic.trim(), priority: newPriority }),
      })
      setNewTopic('')
      setShowAdd(false)
      onRefresh()
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  async function toggleCovered(topicId: string, covered: boolean) {
    try {
      await fetch(`/api/depositions/${depositionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'update_topic', topic_id: topicId, covered }),
      })
      onRefresh()
    } catch {
      // silently handle
    }
  }

  async function deleteTopic(topicId: string) {
    try {
      await fetch(`/api/depositions/${depositionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'delete_topic', topic_id: topicId }),
      })
      onRefresh()
    } catch {
      // silently handle
    }
  }

  const priorityColors = { high: 'text-red-600', medium: 'text-yellow-600', low: 'text-gray-500' }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
          <MessageSquare className="w-3 h-3" /> Prep Topics ({topics.length})
        </p>
        <button onClick={() => setShowAdd(true)} className="text-xs text-blue-600 hover:text-blue-700">+ Add</button>
      </div>
      {topics.map(t => (
        <div key={t.id} className="flex items-center gap-2 text-sm py-1">
          <input
            type="checkbox"
            checked={t.covered}
            onChange={(e) => toggleCovered(t.id, e.target.checked)}
            className="rounded"
          />
          <span className={`flex-1 ${t.covered ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.topic}</span>
          <span className={`text-xs ${priorityColors[t.priority]}`}>{t.priority}</span>
          <button onClick={() => deleteTopic(t.id)} className="text-gray-400 hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {showAdd && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
            placeholder="Topic..."
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
            onKeyDown={e => e.key === 'Enter' && addTopic()}
          />
          <select value={newPriority} onChange={e => setNewPriority(e.target.value as 'high' | 'medium' | 'low')} className="text-xs border border-gray-300 rounded px-1 py-1">
            <option value="high">High</option>
            <option value="medium">Med</option>
            <option value="low">Low</option>
          </select>
          <button onClick={addTopic} disabled={saving} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? '...' : 'Add'}
          </button>
          <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500">Cancel</button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Exhibits Section
// ============================================================================
function ExhibitsSection({
  depositionId, exhibits, onRefresh,
}: { depositionId: string; exhibits: DepositionExhibit[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)

  async function addExhibit() {
    if (!newNumber.trim() || !newDesc.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/depositions/${depositionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'add_exhibit', exhibit_number: newNumber.trim(), description: newDesc.trim() }),
      })
      setNewNumber('')
      setNewDesc('')
      setShowAdd(false)
      onRefresh()
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  async function deleteExhibit(exhibitId: string) {
    try {
      await fetch(`/api/depositions/${depositionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'delete_exhibit', exhibit_id: exhibitId }),
      })
      onRefresh()
    } catch {
      // silently handle
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
          <FileText className="w-3 h-3" /> Exhibits ({exhibits.length})
        </p>
        <button onClick={() => setShowAdd(true)} className="text-xs text-blue-600 hover:text-blue-700">+ Add</button>
      </div>
      {exhibits.length > 0 && (
        <div className="border border-gray-200 rounded text-sm">
          {exhibits.map((ex, i) => (
            <div key={ex.id} className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
              <span className="font-mono text-xs text-gray-500 w-12">Ex. {ex.exhibit_number}</span>
              <span className="flex-1 text-gray-700">{ex.description}</span>
              <button onClick={() => deleteExhibit(ex.id)} className="text-gray-400 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {showAdd && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newNumber}
            onChange={e => setNewNumber(e.target.value)}
            placeholder="#"
            className="w-16 text-sm border border-gray-300 rounded px-2 py-1"
          />
          <input
            type="text"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description..."
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
            onKeyDown={e => e.key === 'Enter' && addExhibit()}
          />
          <button onClick={addExhibit} disabled={saving} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? '...' : 'Add'}
          </button>
          <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500">Cancel</button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Testimony Notes Section
// ============================================================================
function NotesSection({
  depositionId, notes, onRefresh,
}: { depositionId: string; notes: DepositionTestimonyNote[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState<TestimonyNoteType>('general')
  const [importance, setImportance] = useState<'high' | 'normal' | 'low'>('normal')
  const [pageLine, setPageLine] = useState('')
  const [saving, setSaving] = useState(false)

  async function addNote() {
    if (!noteText.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/depositions/${depositionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _action: 'add_note',
          note_text: noteText.trim(),
          note_type: noteType,
          importance,
          page_line: pageLine || null,
        }),
      })
      setNoteText('')
      setPageLine('')
      onRefresh()
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  async function deleteNote(noteId: string) {
    try {
      await fetch(`/api/depositions/${depositionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'delete_note', note_id: noteId }),
      })
      onRefresh()
    } catch {
      // silently handle
    }
  }

  const importanceIcons = {
    high: <AlertCircle className="w-3 h-3 text-red-500" />,
    normal: null,
    low: null,
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
          <Mic className="w-3 h-3" /> Testimony Notes ({notes.length})
        </p>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-blue-600 hover:text-blue-700">
          {showAdd ? 'Close' : '+ Add'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Note..."
            rows={2}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={pageLine}
              onChange={e => setPageLine(e.target.value)}
              placeholder="Page:Line"
              className="w-24 text-xs border border-gray-300 rounded px-2 py-1"
            />
            <select value={noteType} onChange={e => setNoteType(e.target.value as TestimonyNoteType)} className="text-xs border border-gray-300 rounded px-1 py-1">
              {Object.entries(NOTE_TYPE_INFO).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select value={importance} onChange={e => setImportance(e.target.value as 'high' | 'normal' | 'low')} className="text-xs border border-gray-300 rounded px-1 py-1">
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <div className="flex-1" />
            <button onClick={addNote} disabled={saving || !noteText.trim()} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? '...' : 'Add Note'}
            </button>
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div className="space-y-1">
          {notes.map(n => {
            const typeInfo = NOTE_TYPE_INFO[n.note_type]
            return (
              <div key={n.id} className="flex items-start gap-2 text-sm py-1.5 px-2 rounded hover:bg-gray-50 group">
                {importanceIcons[n.importance]}
                <span className={`text-xs px-1.5 py-0.5 rounded ${typeInfo?.color || 'text-gray-600'} bg-gray-100 shrink-0`}>
                  {typeInfo?.label || n.note_type}
                </span>
                {n.page_line && (
                  <span className="text-xs font-mono text-gray-400 shrink-0">{n.page_line}</span>
                )}
                <span className="flex-1 text-gray-700">{n.note_text}</span>
                <button
                  onClick={() => deleteNote(n.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Schedule Deposition Modal
// ============================================================================
function ScheduleDepositionModal({
  caseId, onClose, onCreated,
}: { caseId: string; onClose: () => void; onCreated: () => void }) {
  const [deponentName, setDeponentName] = useState('')
  const [deponentType, setDeponentType] = useState<DeponentType>('party')
  const [deponentRole, setDeponentRole] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [durationHours, setDurationHours] = useState('7')
  const [location, setLocation] = useState('')
  const [locationType, setLocationType] = useState<DepositionLocationType>('in_person')
  const [videoLink, setVideoLink] = useState('')
  const [courtReporter, setCourtReporter] = useState('')
  const [videographer, setVideographer] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!deponentName.trim()) return

    setSaving(true)
    try {
      const scheduledDateTime = scheduledDate
        ? `${scheduledDate}T${scheduledTime}:00`
        : null

      const res = await fetch(`/api/cases/${caseId}/depositions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deponent_name: deponentName.trim(),
          deponent_type: deponentType,
          deponent_role: deponentRole || null,
          scheduled_date: scheduledDateTime,
          location: location || null,
          location_type: locationType,
          video_link: videoLink || null,
          court_reporter: courtReporter || null,
          videographer: videographer || null,
          duration_hours: parseFloat(durationHours) || null,
          notes: notes || null,
        }),
      })

      if (res.ok) {
        onCreated()
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Schedule Deposition</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deponent Name *</label>
            <input
              type="text"
              value={deponentName}
              onChange={e => setDeponentName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deponent Type</label>
              <select
                value={deponentType}
                onChange={e => setDeponentType(e.target.value as DeponentType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {Object.entries(DEPONENT_TYPE_INFO).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role / Title</label>
              <input
                type="text"
                value={deponentRole}
                onChange={e => setDeponentRole(e.target.value)}
                placeholder="e.g. Petitioner, CPA"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Type</label>
              <select
                value={locationType}
                onChange={e => setLocationType(e.target.value as DepositionLocationType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {Object.entries(LOCATION_TYPE_INFO).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
              <input
                type="number"
                value={durationHours}
                onChange={e => setDurationHours(e.target.value)}
                step="0.5"
                min="0.5"
                max="14"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location / Address</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. 123 Main St, Suite 400"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {(locationType === 'remote' || locationType === 'hybrid') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Video Conference Link</label>
              <input
                type="url"
                value={videoLink}
                onChange={e => setVideoLink(e.target.value)}
                placeholder="https://zoom.us/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Court Reporter</label>
              <input
                type="text"
                value={courtReporter}
                onChange={e => setCourtReporter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Videographer</label>
              <input
                type="text"
                value={videographer}
                onChange={e => setVideographer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !deponentName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Scheduling...' : 'Schedule Deposition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
