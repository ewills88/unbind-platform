'use client'

import { useState, useMemo } from 'react'
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  Calendar,
  Gavel,
  FileText,
  Flag,
  Users,
  Timer,
} from 'lucide-react'
import { CaseEventWithDetails, EventType, EVENT_TYPE_CONFIG, EVENT_STATUS_CONFIG } from '@/types/events'
import { getRelativeTime, isOverdue, getDaysUntil, formatShortDate } from '@/lib/dates'

interface TimelineViewProps {
  events: CaseEventWithDetails[]
  onEventClick?: (event: CaseEventWithDetails) => void
}

// Get icon for event type
const getEventIcon = (eventType: EventType) => {
  switch (eventType) {
    case 'court_date':
      return Gavel
    case 'filing_deadline':
      return FileText
    case 'milestone':
      return Flag
    case 'meeting':
      return Users
    case 'waiting_period':
      return Timer
    case 'task':
      return CheckCircle2
    default:
      return Calendar
  }
}

interface TimelineEvent extends CaseEventWithDetails {
  position: 'past' | 'current' | 'future'
  isOverdue: boolean
  relativeTime: string
}

export default function TimelineView({
  events,
  onEventClick,
}: TimelineViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Process and sort events for timeline display
  const timelineEvents = useMemo(() => {
    return events
      .map((event): TimelineEvent => {
        const eventIsOverdue = isOverdue(event.event_date, event.status)
        const daysUntil = getDaysUntil(event.event_date)

        let position: 'past' | 'current' | 'future'
        if (event.status === 'completed') {
          position = 'past'
        } else if (daysUntil === 0) {
          position = 'current'
        } else if (daysUntil < 0) {
          position = 'past'
        } else {
          position = 'future'
        }

        return {
          ...event,
          position,
          isOverdue: eventIsOverdue,
          relativeTime: getRelativeTime(event.event_date),
        }
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
  }, [events])

  // Find index of first non-past event for "current" marker
  const currentIndex = useMemo(() => {
    const idx = timelineEvents.findIndex(e => e.position !== 'past' || e.isOverdue)
    return idx === -1 ? timelineEvents.length : idx
  }, [timelineEvents])

  if (events.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No events on timeline</h3>
        <p className="text-gray-600">Add events to see your case timeline</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Desktop: Horizontal Timeline */}
      <div className="hidden lg:block overflow-x-auto pb-4">
        <div className="min-w-[800px] px-8">
          {/* Timeline Line */}
          <div className="relative h-2 bg-gray-200 rounded-full mb-8 mt-8">
            {/* Progress bar showing completed portion */}
            <div
              className="absolute h-2 bg-green-500 rounded-full"
              style={{
                width: `${Math.min(100, (currentIndex / Math.max(1, timelineEvents.length)) * 100)}%`
              }}
            />

            {/* Event nodes */}
            {timelineEvents.map((event, index) => {
              const leftPercent = (index / Math.max(1, timelineEvents.length - 1)) * 100
              const EventIcon = getEventIcon(event.event_type)
              const typeConfig = EVENT_TYPE_CONFIG[event.event_type]

              return (
                <div
                  key={event.id}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${leftPercent}%`, top: '-12px' }}
                >
                  {/* Node */}
                  <button
                    onClick={() => onEventClick?.(event)}
                    className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all hover:scale-110 ${
                      event.status === 'completed'
                        ? 'bg-green-500 border-green-200'
                        : event.isOverdue
                        ? 'bg-red-500 border-red-200 animate-pulse'
                        : event.position === 'current'
                        ? 'bg-blue-500 border-blue-200'
                        : 'bg-gray-300 border-gray-100'
                    }`}
                  >
                    {event.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : event.isOverdue ? (
                      <AlertCircle className="w-4 h-4 text-white" />
                    ) : (
                      <EventIcon className="w-4 h-4 text-white" />
                    )}
                  </button>

                  {/* Label - alternating above/below */}
                  <div
                    className={`absolute w-32 text-center ${
                      index % 2 === 0 ? 'bottom-12' : 'top-10'
                    }`}
                    style={{ left: '-48px' }}
                  >
                    <p className="text-xs text-gray-500">{formatShortDate(event.event_date)}</p>
                    <p className={`text-sm font-medium truncate ${
                      event.isOverdue ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {event.title}
                    </p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${typeConfig.bgColor} ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile: Vertical Timeline */}
      <div className="lg:hidden">
        <div className="relative pl-8">
          {/* Vertical line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200">
            {/* Progress line */}
            <div
              className="w-0.5 bg-green-500"
              style={{
                height: `${Math.min(100, (currentIndex / Math.max(1, timelineEvents.length)) * 100)}%`
              }}
            />
          </div>

          {/* Events */}
          <div className="space-y-4">
            {timelineEvents.map((event) => {
              const typeConfig = EVENT_TYPE_CONFIG[event.event_type]
              const isExpanded = expandedId === event.id

              return (
                <div key={event.id} className="relative">
                  {/* Node */}
                  <div
                    className={`absolute -left-5 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      event.status === 'completed'
                        ? 'bg-green-500 border-green-200'
                        : event.isOverdue
                        ? 'bg-red-500 border-red-200 animate-pulse'
                        : event.position === 'current'
                        ? 'bg-blue-500 border-blue-200'
                        : 'bg-gray-300 border-gray-100'
                    }`}
                  >
                    {event.status === 'completed' ? (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    ) : event.isOverdue ? (
                      <AlertCircle className="w-3 h-3 text-white" />
                    ) : (
                      <Circle className="w-3 h-3 text-white" />
                    )}
                  </div>

                  {/* Card */}
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded ? null : event.id)
                      if (onEventClick) onEventClick(event)
                    }}
                    className={`w-full text-left bg-white rounded-lg border p-3 transition-all ${
                      event.isOverdue
                        ? 'border-red-200 bg-red-50'
                        : event.position === 'current'
                        ? 'border-blue-200 bg-blue-50'
                        : event.status === 'completed'
                        ? 'border-green-200 bg-green-50 opacity-75'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                          {event.status !== 'upcoming' && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EVENT_STATUS_CONFIG[event.status].bgColor} ${EVENT_STATUS_CONFIG[event.status].color}`}>
                              {EVENT_STATUS_CONFIG[event.status].label}
                            </span>
                          )}
                        </div>
                        <h4 className={`text-sm font-semibold ${
                          event.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}>
                          {event.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{formatShortDate(event.event_date)}</span>
                          <span className={`${
                            event.isOverdue ? 'text-red-600 font-medium' :
                            event.position === 'current' ? 'text-blue-600 font-medium' :
                            ''
                          }`}>
                            ({event.relativeTime})
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} />
                    </div>

                    {/* Expanded details */}
                    {isExpanded && event.description && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">{event.description}</p>
                        {event.assignee && (
                          <p className="text-xs text-gray-500 mt-2">
                            Assigned to: {event.assignee.full_name}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-gray-200">
        <span className="text-sm text-gray-500">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-600">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-gray-600">Overdue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-gray-300" />
          <span className="text-xs text-gray-600">Upcoming</span>
        </div>
      </div>
    </div>
  )
}
