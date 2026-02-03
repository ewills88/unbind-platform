'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Calendar, User, FileText, Sparkles, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { CreateEventRequest, EventType, CaseEventWithDetails, EVENT_TYPE_CONFIG } from '@/types/events'

interface Profile {
  id: string
  full_name: string
  role: string
}

interface SuggestedEvent {
  event_type: EventType
  title: string
  calculated_date: string
  formatted_date: string
  description: string
  days_from_trigger: number
  is_working_days: boolean
  selected?: boolean
}

interface EventFormProps {
  caseId: string
  event?: CaseEventWithDetails | null
  onSubmit: (data: CreateEventRequest) => Promise<void>
  onClose: () => void
  teamMembers?: Profile[]
  isLoading?: boolean
  caseState?: string
}

// Event types that can trigger deadline calculations
const TRIGGER_EVENT_TYPES: Record<string, string> = {
  petition_filed: 'Petition Filed',
  response_filed: 'Response Filed',
  discovery_served: 'Discovery Served',
  trial_date_set: 'Trial Date Set',
  mediation_ordered: 'Mediation Ordered',
  separation_date: 'Separation Date',
  note_of_issue_filed: 'Note of Issue Filed',
}

export default function EventForm({
  caseId,
  event,
  onSubmit,
  onClose,
  teamMembers = [],
  isLoading = false,
  caseState = 'CA'
}: EventFormProps) {
  const [formData, setFormData] = useState<CreateEventRequest>({
    event_type: 'other',
    title: '',
    description: '',
    event_date: '',
    all_day: false,
    assigned_to: undefined
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Smart deadline suggestions
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestedEvents, setSuggestedEvents] = useState<SuggestedEvent[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [createRelatedDeadlines, setCreateRelatedDeadlines] = useState(true)
  const [triggerEventType, setTriggerEventType] = useState<string>('')

  // Populate form when editing
  useEffect(() => {
    if (event) {
      const eventDate = new Date(event.event_date)
      setFormData({
        event_type: event.event_type,
        title: event.title,
        description: event.description || '',
        event_date: eventDate.toISOString().slice(0, 16),
        all_day: event.all_day,
        assigned_to: event.assigned_to || undefined
      })
    } else {
      // Default to tomorrow at 9am for new events
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      setFormData(prev => ({
        ...prev,
        event_date: tomorrow.toISOString().slice(0, 16)
      }))
    }
  }, [event])

  // Fetch deadline suggestions when trigger event type and date are set
  const fetchSuggestions = useCallback(async () => {
    if (!triggerEventType || !formData.event_date) return

    setLoadingSuggestions(true)
    try {
      const response = await fetch(`/api/cases/${caseId}/events/calculate-deadline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger_event_type: triggerEventType,
          trigger_date: new Date(formData.event_date).toISOString(),
          state_code: caseState,
        })
      })

      if (response.ok) {
        const data = await response.json()
        const suggestions = (data.suggested_events || []).map((s: SuggestedEvent) => ({
          ...s,
          selected: true // Default all to selected
        }))
        setSuggestedEvents(suggestions)
        if (suggestions.length > 0) {
          setShowSuggestions(true)
        }
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err)
    } finally {
      setLoadingSuggestions(false)
    }
  }, [caseId, triggerEventType, formData.event_date, caseState])

  // Watch for trigger event type changes
  useEffect(() => {
    if (triggerEventType && formData.event_date) {
      fetchSuggestions()
    }
  }, [triggerEventType, formData.event_date, fetchSuggestions])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (!formData.event_date) {
      newErrors.event_date = 'Date is required'
    }
    if (!formData.event_type) {
      newErrors.event_type = 'Event type is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    try {
      // Create the main event
      await onSubmit({
        ...formData,
        event_date: new Date(formData.event_date).toISOString()
      })

      // Create related deadline events if selected
      if (createRelatedDeadlines && suggestedEvents.length > 0) {
        const selectedSuggestions = suggestedEvents.filter(s => s.selected)

        for (const suggestion of selectedSuggestions) {
          try {
            await fetch(`/api/cases/${caseId}/events`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_type: suggestion.event_type,
                title: suggestion.title,
                description: suggestion.description,
                event_date: suggestion.calculated_date,
                all_day: true,
              })
            })
          } catch (err) {
            console.error('Error creating suggested event:', err)
          }
        }
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const toggleSuggestionSelection = (index: number) => {
    setSuggestedEvents(prev => prev.map((s, i) =>
      i === index ? { ...s, selected: !s.selected } : s
    ))
  }

  const eventTypes = Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {event ? 'Edit Event' : 'Add Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {eventTypes.map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, event_type: type }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    formData.event_type === type
                      ? `${config.bgColor} ${config.color} border-current`
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
            {errors.event_type && (
              <p className="mt-1 text-sm text-red-600">{errors.event_type}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Response Filing Deadline"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add details about this event..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="event_date"
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.event_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.event_date && (
                <p className="mt-1 text-sm text-red-600">{errors.event_date}</p>
              )}
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={formData.all_day}
                  onChange={(e) => setFormData(prev => ({ ...prev, all_day: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">All day event</span>
              </label>
            </div>
          </div>

          {/* Assignee */}
          {teamMembers.length > 0 && (
            <div>
              <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-1">
                Assign To (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  id="assigned_to"
                  value={formData.assigned_to || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    assigned_to: e.target.value || undefined
                  }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Smart Deadline Suggestions (only for new events) */}
          {!event && (
            <div className="border border-blue-200 rounded-lg bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Smart Deadline Suggestions</span>
              </div>

              <div className="mb-3">
                <label className="block text-sm text-blue-800 mb-1">
                  Is this a trigger event?
                </label>
                <select
                  value={triggerEventType}
                  onChange={(e) => setTriggerEventType(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not a trigger event</option>
                  {Object.entries(TRIGGER_EVENT_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-blue-700 mt-1">
                  Select if this event triggers automatic deadlines (e.g., Petition Filed)
                </p>
              </div>

              {loadingSuggestions && (
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  Calculating deadlines...
                </div>
              )}

              {suggestedEvents.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      className="flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
                    >
                      {showSuggestions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {suggestedEvents.length} related deadlines found
                    </button>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createRelatedDeadlines}
                        onChange={(e) => setCreateRelatedDeadlines(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-blue-800">Create selected</span>
                    </label>
                  </div>

                  {showSuggestions && (
                    <div className="space-y-2 mt-3">
                      {suggestedEvents.map((suggestion, index) => {
                        const typeConfig = EVENT_TYPE_CONFIG[suggestion.event_type]
                        return (
                          <div
                            key={index}
                            onClick={() => toggleSuggestionSelection(index)}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              suggestion.selected
                                ? 'border-blue-400 bg-white'
                                : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 ${
                              suggestion.selected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300'
                            }`}>
                              {suggestion.selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                                  {typeConfig.label}
                                </span>
                                <span className="text-xs text-gray-500">
                                  +{suggestion.days_from_trigger} {suggestion.is_working_days ? 'business' : ''} days
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">{suggestion.title}</p>
                              <p className="text-sm text-gray-600">{suggestion.formatted_date}</p>
                              {suggestion.description && (
                                <p className="text-xs text-gray-500 mt-1">{suggestion.description}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {triggerEventType && !loadingSuggestions && suggestedEvents.length === 0 && (
                <p className="text-sm text-blue-700">
                  No deadline rules found for {TRIGGER_EVENT_TYPES[triggerEventType]} in {caseState}.
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  {event ? 'Update Event' : 'Create Event'}
                  {!event && createRelatedDeadlines && suggestedEvents.filter(s => s.selected).length > 0 && (
                    <span className="bg-blue-500 px-1.5 py-0.5 rounded text-xs">
                      +{suggestedEvents.filter(s => s.selected).length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
