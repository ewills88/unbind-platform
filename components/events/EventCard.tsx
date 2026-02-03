'use client'

import { useState } from 'react'
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit,
  Trash2,
  User
} from 'lucide-react'
import { CaseEventWithDetails, EVENT_TYPE_CONFIG, EVENT_STATUS_CONFIG } from '@/types/events'

interface EventCardProps {
  event: CaseEventWithDetails
  onEdit?: (event: CaseEventWithDetails) => void
  onDelete?: (eventId: string) => void
  onStatusChange?: (eventId: string, status: 'completed' | 'cancelled') => void
  canEdit?: boolean
  canDelete?: boolean
}

export default function EventCard({
  event,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit = true,
  canDelete = false
}: EventCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const typeConfig = EVENT_TYPE_CONFIG[event.event_type]
  const statusConfig = EVENT_STATUS_CONFIG[event.status]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getDaysUntil = () => {
    const now = new Date()
    const eventDate = new Date(event.event_date)
    const diffTime = eventDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} days overdue`, urgent: true }
    } else if (diffDays === 0) {
      return { text: 'Today', urgent: true }
    } else if (diffDays === 1) {
      return { text: 'Tomorrow', urgent: true }
    } else if (diffDays <= 7) {
      return { text: `${diffDays} days`, urgent: true }
    } else {
      return { text: `${diffDays} days`, urgent: false }
    }
  }

  const daysInfo = event.status === 'upcoming' ? getDaysUntil() : null

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow ${
      event.status === 'completed' ? 'opacity-75' : ''
    }`}>
      <div className="flex items-start justify-between gap-3">
        {/* Event Type Badge & Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>

          <h3 className={`text-base font-semibold text-gray-900 ${
            event.status === 'completed' ? 'line-through' : ''
          }`}>
            {event.title}
          </h3>

          {event.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>

        {/* Actions Menu */}
        {(canEdit || canDelete || onStatusChange) && event.status !== 'cancelled' && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                  {event.status === 'upcoming' && onStatusChange && (
                    <button
                      onClick={() => {
                        onStatusChange(event.id, 'completed')
                        setShowMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Mark Complete
                    </button>
                  )}
                  {event.status === 'completed' && onStatusChange && (
                    <button
                      onClick={() => {
                        onStatusChange(event.id, 'cancelled')
                        setShowMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4 text-gray-500" />
                      Revert to Upcoming
                    </button>
                  )}
                  {canEdit && onEdit && (
                    <button
                      onClick={() => {
                        onEdit(event)
                        setShowMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                      Edit Event
                    </button>
                  )}
                  {canDelete && onDelete && (
                    <button
                      onClick={() => {
                        onDelete(event.id)
                        setShowMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Event
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Date & Time */}
      <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(event.event_date)}</span>
        </div>
        {!event.all_day && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{formatTime(event.event_date)}</span>
          </div>
        )}
        {event.all_day && (
          <span className="text-gray-500 text-xs">(All day)</span>
        )}
      </div>

      {/* Days Until / Assignee */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        {daysInfo && (
          <span className={`text-sm font-medium ${
            daysInfo.urgent ? 'text-orange-600' : 'text-gray-600'
          }`}>
            {daysInfo.text}
          </span>
        )}
        {event.status === 'completed' && event.completed_at && (
          <span className="text-sm text-green-600">
            Completed {formatDate(event.completed_at)}
          </span>
        )}
        {event.assignee && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{event.assignee.full_name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
