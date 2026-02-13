'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

interface Props {
  userId: string | null
}

export default function PushNotificationSetup({ userId }: Props) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [showBanner, setShowBanner] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) return

    setPermission(Notification.permission)

    // Show banner if permission not yet decided and not dismissed
    if (Notification.permission === 'default') {
      const dismissed = localStorage.getItem('push-notification-dismissed')
      if (!dismissed) {
        // Delay showing to avoid overwhelming on first visit
        const timer = setTimeout(() => setShowBanner(true), 5000)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    setSubscribing(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setShowBanner(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId,
        }),
      })

      setShowBanner(false)
    } catch (error) {
      console.error('Push subscription failed:', error)
    } finally {
      setSubscribing(false)
    }
  }

  const dismiss = () => {
    setShowBanner(false)
    localStorage.setItem('push-notification-dismissed', 'true')
  }

  if (!showBanner) return null

  return (
    <div className="fixed top-16 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-2xl p-4 border border-gray-200 z-50 animate-in slide-in-from-top-4 lg:top-4">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 rounded"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex gap-3">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          {permission === 'denied' ? (
            <BellOff className="w-6 h-6 text-blue-600" />
          ) : (
            <Bell className="w-6 h-6 text-blue-600" />
          )}
        </div>
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-gray-900 mb-1">Stay Updated</h3>
          <p className="text-sm text-gray-600 mb-3">
            Get notified about new messages, tasks, and case updates.
          </p>
          {permission === 'denied' ? (
            <p className="text-xs text-gray-500">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={subscribe}
                disabled={subscribing}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {subscribing ? 'Enabling...' : 'Enable Notifications'}
              </button>
              <button
                onClick={dismiss}
                className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Not now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
