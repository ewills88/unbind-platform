'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '@/components/layout/Sidebar'
import { CalendarView, EventForm } from '@/components/events'
import { CaseEventWithDetails, CreateEventRequest } from '@/types/events'
import { format } from 'date-fns'
import { authFetch } from '@/lib/supabase/auth-fetch'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Profile {
  id: string
  full_name: string
  role: string
}

interface CaseOption {
  id: string
  client_name: string
  case_number: string | null
  state: string | null
}

export default function CalendarPage() {
  const router = useRouter()
  const [events, setEvents] = useState<CaseEventWithDetails[]>([])
  const [cases, setCases] = useState<CaseOption[]>([])
  const [loading, setLoading] = useState(true)
  
  // Event form state
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CaseEventWithDetails | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [teamMembers, setTeamMembers] = useState<Profile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      
      // Get user's cases
      const { data: casesData } = await supabase
        .from('cases')
        .select('id, client_name, case_number, state')
        .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('client_name')

      setCases(casesData || [])

      // Get all events across all cases
      const caseIds = (casesData || []).map(c => c.id)
      if (caseIds.length > 0) {
        const { data: eventsData } = await supabase
          .from('case_events')
          .select(`
            *,
            assignee:assigned_to(id, full_name, role),
            creator:created_by(id, full_name),
            case:case_id(id, case_number, client_name)
          `)
          .in('case_id', caseIds)
          .order('event_date', { ascending: true })

        setEvents(eventsData || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadTeamMembers = useCallback(async (caseId: string) => {
    try {
      const { data: caseData } = await supabase
        .from('cases')
        .select('attorney_id, client_id')
        .eq('id', caseId)
        .single()

      if (caseData) {
        const userIds = [caseData.attorney_id, caseData.client_id].filter(Boolean)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', userIds)

        setTeamMembers(profiles || [])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }, [])

  const handleEventClick = (event: CaseEventWithDetails) => {
    setEditingEvent(event)
    setSelectedCaseId(event.case_id)
    loadTeamMembers(event.case_id)
  }

  const handleAddEvent = (date: Date) => {
    setSelectedDate(date)
    setEditingEvent(null)
    setShowEventForm(true)
  }

  const handleCaseSelect = (caseId: string) => {
    setSelectedCaseId(caseId)
    loadTeamMembers(caseId)
  }

  const handleCreateEvent = async (data: CreateEventRequest) => {
    if (!selectedCaseId) return

    setIsSubmitting(true)
    try {
      const response = await authFetch(`/api/cases/${selectedCaseId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      await loadData()
      setShowEventForm(false)
      setSelectedDate(null)
    } catch (error) {
      console.error('Error creating event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateEvent = async (data: CreateEventRequest) => {
    if (!editingEvent) return

    setIsSubmitting(true)
    try {
      const response = await authFetch(`/api/events/${editingEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to update event')
      }

      await loadData()
      setEditingEvent(null)
    } catch (error) {
      console.error('Error updating event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCase = cases.find(c => c.id === selectedCaseId)

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <p className="mt-1 text-gray-600">
              View and manage events across all your cases
            </p>
          </div>

          {/* Calendar */}
          <CalendarView
            events={events}
            onEventClick={handleEventClick}
            onAddEvent={handleAddEvent}
          />
        </div>
      </main>

      {/* Add Event — Case Selection Modal */}
      {showEventForm && !editingEvent && !selectedCaseId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Add Event - {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
              </h2>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a case for this event
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => handleCaseSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a case...</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.client_name} {c.case_number && `(${c.case_number})`}
                  </option>
                ))}
              </select>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setShowEventForm(false)
                    setSelectedDate(null)
                  }}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Event — EventForm (has its own modal) */}
      {showEventForm && !editingEvent && selectedCaseId && (
        <EventForm
          caseId={selectedCaseId}
          event={null}
          onSubmit={handleCreateEvent}
          onClose={() => {
            setShowEventForm(false)
            setSelectedDate(null)
            setSelectedCaseId('')
          }}
          teamMembers={teamMembers}
          isLoading={isSubmitting}
          caseState={selectedCase?.state || 'CA'}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EventForm
          caseId={editingEvent.case_id}
          event={editingEvent}
          onSubmit={handleUpdateEvent}
          onClose={() => setEditingEvent(null)}
          teamMembers={teamMembers}
          isLoading={isSubmitting}
          caseState={selectedCase?.state || 'CA'}
        />
      )}
    </div>
  )
}
