'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import {
  Bell,
  Calendar,
  MessageSquare,
  FileText,
  AlertCircle,
  CheckCheck,
  Filter,
} from 'lucide-react'
import { AppNotification } from '@/types/events'
import { formatDistanceToNow, format } from 'date-fns'
import { authFetch } from '@/lib/supabase/auth-fetch'


const NOTIFICATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  reminder: Calendar,
  message: MessageSquare,
  document: FileText,
  system: AlertCircle,
}

type FilterType = 'all' | 'unread' | 'reminder' | 'message' | 'document' | 'system'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const unreadOnly = filter === 'unread'
      const response = await authFetch(`/api/notifications?limit=50&unread_only=${unreadOnly}`)

      if (response.ok) {
        const data = await response.json()
        let filtered = data.notifications || []

        // Apply type filter
        if (filter !== 'all' && filter !== 'unread') {
          filtered = filtered.filter((n: AppNotification) => n.notification_type === filter)
        }

        setNotifications(filtered)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await authFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds })
      })

      setNotifications(prev =>
        prev.map(n =>
          notificationIds.includes(n.id) ? { ...n, is_read: true } : n
        )
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await authFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true })
      })

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.is_read) {
      markAsRead([notification.id])
    }

    if (notification.action_url) {
      router.push(notification.action_url)
    } else if (notification.case_id) {
      router.push(`/dashboard/cases/${notification.case_id}?tab=events`)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0d1526]">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-300">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            {[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread' },
              { value: 'reminder', label: 'Reminders' },
              { value: 'message', label: 'Messages' },
              { value: 'document', label: 'Documents' },
              { value: 'system', label: 'System' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as FilterType)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                  filter === f.value
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-[#1f2937]">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No notifications</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {filter === 'unread'
                  ? "You've read all your notifications"
                  : 'Notifications will appear here'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-[#1f2937] divide-y divide-gray-100 dark:divide-[#1f2937]">
              {notifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.notification_type] || Bell
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        !notification.is_read ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          !notification.is_read ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${
                            !notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          {' · '}
                          {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
