'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Filter, Calendar, AlertCircle, CheckCircle2, RefreshCw, List, GitBranch } from 'lucide-react'
import EventCard from './EventCard'
import EventForm from './EventForm'
import TimelineView from './TimelineView'
import {
  CaseEventWithDetails,
  EventType,
  EventStatus,
  CreateEventRequest,
  EVENT_TYPE_CONFIG
} from '@/types/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Profile {
  id: string
  full_name: string
  role: string
}

interface EventListProps {
  caseId: string
  currentUserId: string
}

type ViewMode = 'list' | 'timeline'

export default function EventList({ caseId, currentUserId }: EventListProps) {
  const [events, setEvents] = useState<CaseEventWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CaseEventWithDetails | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teamMembers, setTeamMembers] = useState<Profile[]>([])
  const [caseState, setCaseState] = useState<string>('CA')

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Filters
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all')

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('event_type', typeFilter)

      const response = await fetch(`/api/cases/${caseId}/events?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to load events')
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Error loading events:', err)
      setError('Failed to load events. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [caseId, statusFilter, typeFilter])

  const loadTeamMembers = useCallback(async () => {
    try {
      // Get case details to find attorney and client
      const { data: caseData } = await supabase
        .from('cases')
        .select('attorney_id, client_id, state')
        .eq('id', caseId)
        .single()

      if (caseData) {
        // Set case state for deadline calculations
        if (caseData.state) {
          setCaseState(caseData.state)
        }

        const userIds = [caseData.attorney_id, caseData.client_id].filter(Boolean)

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', userIds)

        setTeamMembers(profiles || [])
      }
    } catch (err) {
      console.error('Error loading team members:', err)
    }
  }, [caseId])

  useEffect(() => {
    loadEvents()
    loadTeamMembers()
  }, [loadEvents, loadTeamMembers])

  const handleCreateEvent = async (data: CreateEventRequest) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/cases/${caseId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to create event')
      }

      await loadEvents()
      setShowForm(false)
    } catch (err) {
      console.error('Error creating event:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateEvent = async (data: CreateEventRequest) => {
    if (!editingEvent) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to update event')
      }

      await loadEvents()
      setEditingEvent(null)
    } catch (err) {
      console.error('Error updating event:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (eventId: string, status: 'completed' | 'cancelled') => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status === 'completed' ? 'completed' : 'upcoming' })
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      await loadEvents()
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to delete event')
      }

      await loadEvents()
    } catch (err) {
      console.error('Error deleting event:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete event')
    }
  }

  // Separate events by status
  const upcomingEvents = events.filter(e => e.status === 'upcoming')
  const completedEvents = events.filter(e => e.status === 'completed')
  const overdueEvents = upcomingEvents.filter(e => new Date(e.event_date) < new Date())
  const futureEvents = upcomingEvents.filter(e => new Date(e.event_date) >= new Date())

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Timeline & Events
        </h3>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Timeline View"
            >
              <GitBranch className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => loadEvents()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </div>

      {/* Filters (only show in list view) */}
      {viewMode === 'list' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as EventType | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
              <option key={type} value={type}>{config.label}</option>
            ))}
          </select>

          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => {
                setStatusFilter('all')
                setTypeFilter('all')
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <TimelineView
          events={events}
          onEventClick={setEditingEvent}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Overdue Events */}
          {overdueEvents.length > 0 && statusFilter !== 'completed' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Overdue ({overdueEvents.length})
              </h4>
              <div className="grid gap-3">
                {overdueEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={setEditingEvent}
                    onDelete={handleDeleteEvent}
                    onStatusChange={handleStatusChange}
                    canDelete={event.created_by === currentUserId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Events */}
          {futureEvents.length > 0 && statusFilter !== 'completed' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Upcoming ({futureEvents.length})
              </h4>
              <div className="grid gap-3">
                {futureEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={setEditingEvent}
                    onDelete={handleDeleteEvent}
                    onStatusChange={handleStatusChange}
                    canDelete={event.created_by === currentUserId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Events */}
          {completedEvents.length > 0 && statusFilter !== 'upcoming' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-green-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed ({completedEvents.length})
              </h4>
              <div className="grid gap-3">
                {completedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={setEditingEvent}
                    onDelete={handleDeleteEvent}
                    onStatusChange={handleStatusChange}
                    canDelete={event.created_by === currentUserId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {events.length === 0 && !loading && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-600 mb-4">
                Add your first event to start tracking deadlines and milestones
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>
          )}
        </>
      )}

      {/* Event Form Modal */}
      {(showForm || editingEvent) && (
        <EventForm
          caseId={caseId}
          event={editingEvent}
          onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
          onClose={() => {
            setShowForm(false)
            setEditingEvent(null)
          }}
          teamMembers={teamMembers}
          isLoading={isSubmitting}
          caseState={caseState}
        />
      )}
    </div>
  )
}
