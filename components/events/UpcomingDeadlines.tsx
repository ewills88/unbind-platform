'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Calendar,
  AlertTriangle,
  ChevronRight,
  Clock,
  AlertCircle,
  Bell,
  CheckCircle2,
} from 'lucide-react'
import { EVENT_TYPE_CONFIG } from '@/types/events'
import { formatShortDate } from '@/lib/dates'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface UpcomingDeadlinesProps {
  limit?: number
  showViewAll?: boolean
}

interface DeadlineEvent {
  id: string
  case_id: string
  title: string
  event_date: string
  event_type: string
  client_name: string
  case_number: string | null
  days_until: number
  is_overdue: boolean
}

type UrgencyGroup = 'overdue' | 'urgent' | 'soon' | 'normal'

interface GroupedEvent {
  event: DeadlineEvent
  urgency: UrgencyGroup
  daysLabel: string
}

const URGENCY_CONFIG: Record<UrgencyGroup, {
  label: string
  bgColor: string
  textColor: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  overdue: {
    label: 'Overdue',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    icon: AlertCircle,
  },
  urgent: {
    label: 'This Week',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    icon: AlertTriangle,
  },
  soon: {
    label: 'Next 2 Weeks',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    icon: Clock,
  },
  normal: {
    label: 'Upcoming',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    icon: Calendar,
  },
}

export default function UpcomingDeadlines({
  limit = 10,
  showViewAll = true,
}: UpcomingDeadlinesProps) {
  const router = useRouter()
  const [events, setEvents] = useState<DeadlineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
  }, [limit])

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get cases for this attorney to find their events
      const { data: cases } = await supabase
        .from('cases')
        .select('id, client_name, case_number')
        .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)

      if (!cases || cases.length === 0) {
        setEvents([])
        return
      }

      const caseIds = cases.map(c => c.id)
      const caseMap = new Map(cases.map(c => [c.id, c]))

      // Get events from the past 30 days (for overdue) through the future
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: eventData } = await supabase
        .from('events')
        .select('id, case_id, title, start_time, event_type')
        .in('case_id', caseIds)
        .gte('start_time', thirtyDaysAgo.toISOString())
        .order('start_time', { ascending: true })
        .limit(limit + 20) // fetch extra to account for overdue

      if (!eventData) {
        setEvents([])
        return
      }

      const now = new Date()
      const deadlineEvents: DeadlineEvent[] = eventData.map(e => {
        const eventDate = new Date(e.start_time)
        const diffMs = eventDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        const caseInfo = caseMap.get(e.case_id)

        return {
          id: e.id,
          case_id: e.case_id,
          title: e.title,
          event_date: e.start_time,
          event_type: e.event_type || 'deadline',
          client_name: caseInfo?.client_name || '',
          case_number: caseInfo?.case_number || null,
          days_until: diffDays,
          is_overdue: diffDays < 0,
        }
      })

      // Sort: overdue first (most overdue at top), then upcoming by soonest
      deadlineEvents.sort((a, b) => {
        if (a.is_overdue && !b.is_overdue) return -1
        if (!a.is_overdue && b.is_overdue) return 1
        return a.days_until - b.days_until
      })

      setEvents(deadlineEvents.slice(0, limit + 10))
    } catch (err) {
      console.error('Error loading upcoming events:', err)
      setError('Failed to load deadlines')
    } finally {
      setLoading(false)
    }
  }

  // Group events by urgency
  const groupedEvents: GroupedEvent[] = events.map((event): GroupedEvent => {
    const days = event.days_until
    let urgency: UrgencyGroup
    let daysLabel: string

    if (event.is_overdue) {
      urgency = 'overdue'
      const overdueDays = Math.abs(days)
      daysLabel = `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`
    } else if (days === 0) {
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

    return { event, urgency, daysLabel }
  })

  const eventsByUrgency = groupedEvents.reduce(
    (acc, item) => {
      if (!acc[item.urgency]) acc[item.urgency] = []
      acc[item.urgency].push(item)
      return acc
    },
    {} as Record<UrgencyGroup, GroupedEvent[]>
  )

  const overdueCount = eventsByUrgency['overdue']?.length || 0
  const urgentCount = eventsByUrgency['urgent']?.length || 0

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
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              {overdueCount} overdue
            </span>
          )}
          {urgentCount > 0 && overdueCount === 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
              <Bell className="w-3 h-3" />
              {urgentCount} urgent
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
          {(['overdue', 'urgent', 'soon', 'normal'] as UrgencyGroup[]).map((urgency) => {
            const items = eventsByUrgency[urgency]
            if (!items || items.length === 0) return null

            const config = URGENCY_CONFIG[urgency]
            const UrgencyIcon = config.icon

            return (
              <div key={urgency}>
                <div className={`px-4 py-2 ${config.bgColor} flex items-center gap-2`}>
                  <UrgencyIcon className={`w-4 h-4 ${config.textColor}`} />
                  <span className={`text-sm font-medium ${config.textColor}`}>
                    {config.label} ({items.length})
                  </span>
                </div>

                {items.map(({ event, daysLabel }) => {
                  const typeConfig = EVENT_TYPE_CONFIG[event.event_type as keyof typeof EVENT_TYPE_CONFIG] || {
                    label: event.event_type,
                    bgColor: 'bg-gray-100',
                    color: 'text-gray-700',
                  }

                  return (
                    <button
                      key={event.id}
                      onClick={() => router.push(`/dashboard/cases/${event.case_id}?tab=events`)}
                      className={`w-full p-4 hover:bg-gray-50 transition-colors text-left group ${
                        event.is_overdue ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                              {typeConfig.label}
                            </span>
                            <span className={`text-xs font-semibold ${
                              event.is_overdue
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
                            event.is_overdue ? 'text-red-900' : 'text-gray-900'
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
