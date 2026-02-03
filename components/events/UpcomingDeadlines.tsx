'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  AlertTriangle,
  ChevronRight,
  Clock,
  AlertCircle,
  Bell,
  CheckCircle2,
} from 'lucide-react'
import { UpcomingEvent, OverdueEvent, EVENT_TYPE_CONFIG } from '@/types/events'
import { formatShortDate } from '@/lib/dates'

interface UpcomingDeadlinesProps {
  limit?: number
  showViewAll?: boolean
}

type UrgencyGroup = 'overdue' | 'urgent' | 'soon' | 'normal'

interface GroupedEvent {
  event: UpcomingEvent | OverdueEvent
  urgency: UrgencyGroup
  daysLabel: string
  isOverdue: boolean
}

const URGENCY_CONFIG: Record<UrgencyGroup, {
  label: string
  bgColor: string
  textColor: string
  borderColor: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  overdue: {
    label: 'Overdue',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: AlertCircle,
  },
  urgent: {
    label: 'This Week',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
  },
  soon: {
    label: 'Next 2 Weeks',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: Clock,
  },
  normal: {
    label: 'Upcoming',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    icon: Calendar,
  },
}

export default function UpcomingDeadlines({
  limit = 10,
  showViewAll = true,
}: UpcomingDeadlinesProps) {
  const router = useRouter()
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [overdueEvents, setOverdueEvents] = useState<OverdueEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
  }, [limit])

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/events/upcoming?limit=${limit}`)

      if (!response.ok) {
        throw new Error('Failed to load events')
      }

      const data = await response.json()
      setUpcomingEvents(data.events || [])
      setOverdueEvents(data.overdue || [])
    } catch (err) {
      console.error('Error loading upcoming events:', err)
      setError('Failed to load deadlines')
    } finally {
      setLoading(false)
    }
  }

  // Process and group events by urgency
  const groupedEvents: GroupedEvent[] = [
    // Add overdue events first
    ...overdueEvents.map((event): GroupedEvent => ({
      event,
      urgency: 'overdue',
      daysLabel: `${event.days_overdue} day${event.days_overdue === 1 ? '' : 's'} overdue`,
      isOverdue: true,
    })),
    // Add upcoming events with urgency classification
    ...upcomingEvents.map((event): GroupedEvent => {
      const days = event.days_until
      let urgency: UrgencyGroup
      let daysLabel: string

      if (days === 0) {
        urgency = 'urgent'
        daysLabel = 'Today'
      } else if (days === 1) {
        urgency = 'urgent'
        daysLabel = 'Tomorrow'
      } else if (days <= 7) {
        urgency = 'urgent'
        daysLabel = `${days} days`
      } else if (days <= 14) {
        urgency = 'soon'
        daysLabel = `${days} days`
      } else {
        urgency = 'normal'
        daysLabel = `${days} days`
      }

      return {
        event,
        urgency,
        daysLabel,
        isOverdue: false,
      }
    }),
  ]

  // Group events by urgency level
  const eventsByUrgency = groupedEvents.reduce(
    (acc, item) => {
      if (!acc[item.urgency]) acc[item.urgency] = []
      acc[item.urgency].push(item)
      return acc
    },
    {} as Record<UrgencyGroup, GroupedEvent[]>
  )

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
        </div>
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={loadEvents}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const hasEvents = groupedEvents.length > 0

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
        </div>
        <div className="flex items-center gap-2">
          {overdueEvents.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              {overdueEvents.length} overdue
            </span>
          )}
          {upcomingEvents.filter(e => e.days_until <= 3).length > 0 && overdueEvents.length === 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
              <Bell className="w-3 h-3" />
              {upcomingEvents.filter(e => e.days_until <= 3).length} urgent
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {!hasEvents ? (
        <div className="p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No upcoming deadlines</p>
          <p className="text-gray-500 text-xs mt-1">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {/* Render each urgency group */}
          {(['overdue', 'urgent', 'soon', 'normal'] as UrgencyGroup[]).map((urgency) => {
            const items = eventsByUrgency[urgency]
            if (!items || items.length === 0) return null

            const config = URGENCY_CONFIG[urgency]
            const UrgencyIcon = config.icon

            return (
              <div key={urgency}>
                {/* Group header */}
                <div className={`px-4 py-2 ${config.bgColor} flex items-center gap-2`}>
                  <UrgencyIcon className={`w-4 h-4 ${config.textColor}`} />
                  <span className={`text-sm font-medium ${config.textColor}`}>
                    {config.label} ({items.length})
                  </span>
                </div>

                {/* Events in group */}
                {items.map(({ event, daysLabel, isOverdue }) => {
                  const typeConfig = EVENT_TYPE_CONFIG[event.event_type]
                  const eventId = isOverdue
                    ? (event as OverdueEvent).event_id
                    : (event as UpcomingEvent).event_id

                  return (
                    <button
                      key={eventId}
                      onClick={() => router.push(`/dashboard/cases/${event.case_id}?tab=events`)}
                      className={`w-full p-4 hover:bg-gray-50 transition-colors text-left group ${
                        isOverdue ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                              {typeConfig.label}
                            </span>
                            <span className={`text-xs font-semibold ${
                              isOverdue
                                ? 'text-red-600'
                                : urgency === 'urgent'
                                ? 'text-orange-600'
                                : urgency === 'soon'
                                ? 'text-yellow-600'
                                : 'text-gray-500'
                            }`}>
                              {daysLabel}
                            </span>
                          </div>
                          <p className={`text-sm font-medium truncate ${
                            isOverdue ? 'text-red-900' : 'text-gray-900'
                          }`}>
                            {event.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {event.client_name}
                            {event.case_number && ` - ${event.case_number}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {formatShortDate(event.event_date)}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      {showViewAll && hasEvents && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => router.push('/dashboard/calendar')}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View full calendar
          </button>
        </div>
      )}
    </div>
  )
}
