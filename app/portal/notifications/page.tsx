'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, MessageSquare, FileText, CheckSquare, Calendar,
  CreditCard, Briefcase, Clock, Loader2, CheckCheck,
  AlertCircle, ChevronRight,
} from 'lucide-react'
import { ClientNotification } from '@/types/portal'
import { authFetch } from '@/lib/supabase/auth-fetch'

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CATEGORY_ICONS: Record<string, typeof Bell> = {
  message: MessageSquare,
  document: FileText,
  task: CheckSquare,
  appointment: Calendar,
  payment: CreditCard,
  case_update: Briefcase,
  deadline: Clock,
  system: Bell,
}

const CATEGORY_COLORS: Record<string, string> = {
  message: 'text-blue-500 bg-blue-50',
  document: 'text-purple-500 bg-purple-50',
  task: 'text-orange-500 bg-orange-50',
  appointment: 'text-green-500 bg-green-50',
  payment: 'text-emerald-500 bg-emerald-50',
  case_update: 'text-indigo-500 bg-indigo-50',
  deadline: 'text-red-500 bg-red-50',
  system: 'text-gray-500 bg-gray-50',
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'message', label: 'Messages' },
  { key: 'document', label: 'Documents' },
  { key: 'task', label: 'Tasks' },
  { key: 'appointment', label: 'Appointments' },
  { key: 'payment', label: 'Payments' },
]

export default function PortalNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<ClientNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await authFetch('/api/portal/notifications')
      if (res.status === 401) {
        router.push('/portal/login')
        return
      }
      if (!res.ok) throw new Error('Failed to load notifications')
      const data = await res.json()
      setNotifications(data.data || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Notifications error:', err)
      setError('Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await authFetch('/api/portal/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      fetchNotifications()
    } catch (err) {
      console.error('Mark all read error:', err)
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await authFetch('/api/portal/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id] }),
      })
      fetchNotifications()
    } catch (err) {
      console.error('Mark read error:', err)
    }
  }

  const handleClick = (notification: ClientNotification) => {
    if (!notification.is_read) {
      handleMarkRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.is_read
    return n.category === filter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {FILTER_OPTIONS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
            {f.key === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">
            {filter === 'all' ? 'No notifications' : `No ${filter} notifications`}
          </p>
          <p className="text-sm mt-1">
            {filter === 'all' ? "You're all caught up!" : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map(notification => {
            const CategoryIcon = CATEGORY_ICONS[notification.category] || Bell
            const categoryColor = CATEGORY_COLORS[notification.category] || CATEGORY_COLORS.system

            return (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                  notification.is_read
                    ? 'bg-white border-gray-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${categoryColor}`}>
                    <CategoryIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${notification.is_read ? 'font-medium text-gray-900' : 'font-semibold text-gray-900'}`}>
                        {notification.title}
                      </p>
                      {notification.priority === 'urgent' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                          Urgent
                        </span>
                      )}
                      {notification.action_required && !notification.action_completed && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                          Action Required
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>

                    <p className="text-xs text-gray-400 mt-1.5">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.is_read && (
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                    )}
                    {notification.link && (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
