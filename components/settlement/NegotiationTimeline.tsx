'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Send, Download, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle,
  Users, Phone, MessageSquare, Plus, X, Calendar, ArrowRight, Flag,
  Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { NegotiationEvent, NegotiationEventType, NegotiationParty } from '@/types/settlement'
import { EVENT_TYPE_INFO } from '@/types/settlement'

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

const EVENT_ICONS: Record<string, { icon: typeof Send; color: string; bg: string }> = {
  proposal_sent: { icon: Send, color: 'text-blue-500', bg: 'bg-blue-100' },
  proposal_received: { icon: Download, color: 'text-green-500', bg: 'bg-green-100' },
  counter_offer: { icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-100' },
  terms_accepted: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  accepted: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  terms_rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' },
  mediation_scheduled: { icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-100' },
  mediation_completed: { icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
  mediation: { icon: Users, color: 'text-teal-500', bg: 'bg-teal-100' },
  settlement_reached: { icon: Flag, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  attorney_conference: { icon: Phone, color: 'text-gray-500', bg: 'bg-gray-100' },
  client_meeting: { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-50' },
  negotiation_stalled: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
  conference: { icon: Phone, color: 'text-indigo-500', bg: 'bg-indigo-100' },
}

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'proposal_sent', label: 'Sent' },
  { value: 'proposal_received', label: 'Received' },
  { value: 'counter_offer', label: 'Counters' },
  { value: 'mediation_completed', label: 'Mediation' },
  { value: 'attorney_conference', label: 'Conferences' },
]

interface Props {
  caseId: string
}

export default function NegotiationTimeline({ caseId }: Props) {
  const [events, setEvents] = useState<NegotiationEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const url = filter === 'all'
        ? `/api/cases/${caseId}/negotiation-timeline`
        : `/api/cases/${caseId}/negotiation-timeline?filter=${filter}`
      const res = await fetch(url)
      if (res.ok) {
        const d = await res.json()
        setEvents(d.data || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [caseId, filter])

  useEffect(() => { fetchEvents() }, [fetchEvents])

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
          <h2 className="text-lg font-semibold text-gray-900">Negotiation Timeline</h2>
          <p className="text-sm text-gray-500">Track all offers, responses, and key events</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {events.length > 0 ? (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {events.map(event => {
              const iconInfo = EVENT_ICONS[event.event_type] || { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-100' }
              const Icon = iconInfo.icon
              const isExpanded = expandedId === event.id
              const eventInfo = EVENT_TYPE_INFO[event.event_type]

              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconInfo.bg} ${event.is_milestone ? 'ring-4 ring-yellow-300' : ''}`}>
                    <Icon className={`w-5 h-5 ${iconInfo.color}`} />
                  </div>

                  {/* Card */}
                  <div className={`flex-1 bg-white border rounded-lg p-4 ${event.is_milestone ? 'border-yellow-400 border-2' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 text-sm">{event.title}</h3>
                          {event.is_milestone && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Milestone</span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${eventInfo?.bgColor || 'bg-gray-100'} ${eventInfo?.color || 'text-gray-600'}`}>
                            {eventInfo?.label || event.event_type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDateTime(event.event_date)}
                          {event.from_party && event.from_party !== 'both' && (
                            <span className="ml-2">
                              &middot; {event.from_party === 'our_client' ? 'Our side' : event.from_party === 'opposing' ? 'Opposing' : event.from_party}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : event.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {event.description && (
                      <p className="text-sm text-gray-700 mt-2">{event.description}</p>
                    )}

                    {event.movement_summary && (
                      <div className="bg-blue-50 rounded p-2 mt-2">
                        <p className="text-xs font-medium text-blue-800">
                          Movement: {event.movement_summary}
                        </p>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        {event.key_changes && Object.keys(event.key_changes).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">Key Changes:</p>
                            {Object.entries(event.key_changes).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-700">
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {event.next_steps && (
                          <div className="bg-yellow-50 rounded p-2">
                            <p className="text-xs">
                              <span className="font-medium">Next Steps:</span> {event.next_steps}
                            </p>
                            {event.deadline && (
                              <p className="text-xs text-orange-600 mt-1">
                                Deadline: {formatDate(event.deadline)}
                              </p>
                            )}
                          </div>
                        )}

                        {event.participants && event.participants.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Users className="w-3 h-3" />
                            <span>{event.participants.join(', ')}</span>
                          </div>
                        )}

                        {event.notes && (
                          <p className="text-xs text-gray-500 italic">{event.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No negotiation events yet</p>
          <p className="text-sm mt-1">Timeline events are automatically created when proposals are sent or received.</p>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <AddTimelineEventModal
          caseId={caseId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            fetchEvents()
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Add Timeline Event Modal
// ============================================================================
function AddTimelineEventModal({
  caseId,
  onClose,
  onAdded,
}: {
  caseId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    event_type: 'attorney_conference' as NegotiationEventType,
    event_date: new Date().toISOString().slice(0, 16),
    title: '',
    description: '',
    from_party: 'both' as NegotiationParty,
    movement_summary: '',
    next_steps: '',
    deadline: '',
    is_milestone: false,
  })

  const EVENT_TYPE_OPTIONS: { value: NegotiationEventType; label: string }[] = [
    { value: 'proposal_sent', label: 'Proposal Sent' },
    { value: 'proposal_received', label: 'Proposal Received' },
    { value: 'counter_offer', label: 'Counter-Offer' },
    { value: 'terms_accepted', label: 'Terms Accepted' },
    { value: 'terms_rejected', label: 'Terms Rejected' },
    { value: 'mediation_scheduled', label: 'Mediation Scheduled' },
    { value: 'mediation_completed', label: 'Mediation Completed' },
    { value: 'attorney_conference', label: 'Attorney Conference' },
    { value: 'client_meeting', label: 'Client Meeting' },
    { value: 'settlement_reached', label: 'Settlement Reached' },
    { value: 'negotiation_stalled', label: 'Negotiation Stalled' },
  ]

  async function handleSubmit() {
    if (!formData.title.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/cases/${caseId}/negotiation-timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          deadline: formData.deadline || null,
        }),
      })
      onAdded()
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
          <h3 className="font-semibold text-gray-900">Add Timeline Event</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
              <select
                value={formData.event_type}
                onChange={e => setFormData({ ...formData, event_type: e.target.value as NegotiationEventType })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {EVENT_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={formData.event_date}
                onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of event"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed notes..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Party</label>
            <select
              value={formData.from_party}
              onChange={e => setFormData({ ...formData, from_party: e.target.value as NegotiationParty })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="both">Both Parties</option>
              <option value="our_client">Our Client</option>
              <option value="opposing">Opposing</option>
              <option value="mediator">Mediator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Movement Summary</label>
            <input
              type="text"
              value={formData.movement_summary}
              onChange={e => setFormData({ ...formData, movement_summary: e.target.value })}
              placeholder="e.g., H moved $25k on house, W reduced support ask by $500/mo"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Next Steps</label>
            <textarea
              value={formData.next_steps}
              onChange={e => setFormData({ ...formData, next_steps: e.target.value })}
              placeholder="What needs to happen next..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action Deadline (optional)</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={e => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.is_milestone}
              onChange={e => setFormData({ ...formData, is_milestone: e.target.checked })}
              className="rounded"
            />
            Mark as milestone event
          </label>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.title.trim() || saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
