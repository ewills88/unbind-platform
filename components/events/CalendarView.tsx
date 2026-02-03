'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
} from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import { CaseEventWithDetails, EVENT_TYPE_CONFIG } from '@/types/events'

interface CalendarViewProps {
  events: CaseEventWithDetails[]
  onEventClick?: (event: CaseEventWithDetails) => void
  onDateClick?: (date: Date) => void
  onAddEvent?: (date: Date) => void
}

export default function CalendarView({
  events,
  onEventClick,
  onDateClick,
  onAddEvent,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CaseEventWithDetails[]> = {}

    events.forEach((event) => {
      const dateKey = format(new Date(event.event_date), 'yyyy-MM-dd')
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })

    return grouped
  }, [events])

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => setCurrentMonth(new Date())

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    onDateClick?.(date)
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate[dateKey] || []
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isDayToday = isToday(day)

          return (
            <div
              key={index}
              onClick={() => handleDateClick(day)}
              className={`min-h-[100px] border-b border-r border-gray-100 p-1 cursor-pointer transition-colors ${
                !isCurrentMonth ? 'bg-gray-50' : 'hover:bg-gray-50'
              } ${isSelected ? 'bg-blue-50' : ''}`}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${
                    isDayToday
                      ? 'bg-blue-600 text-white font-semibold'
                      : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && onAddEvent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddEvent(day)
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const typeConfig = EVENT_TYPE_CONFIG[event.event_type]
                  const isOverdue = event.status === 'upcoming' && new Date(event.event_date) < new Date()

                  return (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate transition-colors ${
                        event.status === 'completed'
                          ? 'bg-gray-100 text-gray-500 line-through'
                          : isOverdue
                          ? 'bg-red-100 text-red-700'
                          : `${typeConfig.bgColor} ${typeConfig.color}`
                      }`}
                    >
                      {!event.all_day && (
                        <span className="font-medium">
                          {format(new Date(event.event_date), 'h:mm a')}
                        </span>
                      )}{' '}
                      {event.title}
                    </button>
                  )
                })}
                {dayEvents.length > 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDateClick(day)
                    }}
                    className="w-full text-left px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                  >
                    +{dayEvents.length - 3} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Date Events Panel */}
      {selectedDate && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            {onAddEvent && (
              <button
                onClick={() => onAddEvent(selectedDate)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            )}
          </div>

          {(() => {
            const dateKey = format(selectedDate, 'yyyy-MM-dd')
            const dayEvents = eventsByDate[dateKey] || []

            if (dayEvents.length === 0) {
              return (
                <p className="text-sm text-gray-500 text-center py-4">
                  No events scheduled for this day
                </p>
              )
            }

            return (
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const typeConfig = EVENT_TYPE_CONFIG[event.event_type]
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        {event.status === 'completed' && (
                          <span className="text-xs text-green-600">Completed</span>
                        )}
                      </div>
                      <p className={`font-medium text-gray-900 ${event.status === 'completed' ? 'line-through' : ''}`}>
                        {event.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {event.all_day
                          ? 'All day'
                          : format(new Date(event.event_date), 'h:mm a')}
                        {event.assignee && ` · ${event.assignee.full_name}`}
                      </p>
                    </button>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
