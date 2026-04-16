'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, Calendar, Loader2 } from 'lucide-react'
import { CalendarInfo } from '@/types/calendar'
import Image from 'next/image'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface ConnectionInfo {
  id: string
  provider: string
  calendar_id: string | null
  calendar_name: string | null
  sync_enabled: boolean
  last_synced_at: string | null
  sync_status: 'active' | 'error' | 'disconnected'
  error_message: string | null
  connected_at: string
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hours ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} days ago`
}

export default function IntegrationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [connection, setConnection] = useState<ConnectionInfo | null>(null)
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    // Check URL params for OAuth result
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'google_connected') {
      showToast('Google Calendar connected successfully!')
    } else if (error) {
      const messages: Record<string, string> = {
        google_denied: 'Google Calendar access was denied.',
        invalid_state: 'Invalid OAuth state. Please try again.',
        state_expired: 'Connection timed out. Please try again.',
        google_failed: 'Failed to connect Google Calendar. Please try again.',
        no_tokens: 'Failed to get access tokens. Please try again.',
        missing_params: 'Missing OAuth parameters. Please try again.',
      }
      showToast(messages[error] || 'An error occurred.')
    }
  }, [searchParams, showToast])

  useEffect(() => {
    loadConnection()
  }, [])

  const loadConnection = async () => {
    try {
      const res = await authFetch('/api/integrations/google/settings')
      if (res.ok) {
        const data = await res.json()
        setConnection(data.connection)

        if (data.connection) {
          loadCalendars()
        }
      }
    } catch (error) {
      console.error('Error loading connection:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCalendars = async () => {
    try {
      const res = await authFetch('/api/integrations/google/calendars')
      if (res.ok) {
        const data = await res.json()
        setCalendars(data.calendars || [])
      }
    } catch (error) {
      console.error('Error loading calendars:', error)
    }
  }

  const handleConnectGoogle = async () => {
    setIsConnecting(true)
    try {
      const res = await authFetch('/api/integrations/google/connect')
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        showToast('Failed to start connection. Check your configuration.')
        setIsConnecting(false)
      }
    } catch {
      showToast('Failed to connect. Please try again.')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Calendar? Synced events will no longer be updated.')) return

    try {
      const res = await authFetch('/api/integrations/google/disconnect', { method: 'DELETE' })
      if (res.ok) {
        setConnection(null)
        setCalendars([])
        showToast('Google Calendar disconnected.')
      }
    } catch {
      showToast('Failed to disconnect.')
    }
  }

  const handleToggleSync = async (enabled: boolean) => {
    try {
      const res = await authFetch('/api/integrations/google/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync_enabled: enabled }),
      })
      if (res.ok) {
        const data = await res.json()
        setConnection(data.connection)
      }
    } catch {
      showToast('Failed to update setting.')
    }
  }

  const handleChangeCalendar = async (calendarId: string) => {
    const cal = calendars.find(c => c.id === calendarId)
    try {
      const res = await authFetch('/api/integrations/google/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendar_id: calendarId,
          calendar_name: cal?.name || calendarId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setConnection(data.connection)
        showToast('Calendar updated.')
      }
    } catch {
      showToast('Failed to update calendar.')
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const res = await authFetch('/api/integrations/google/sync', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        showToast(`Synced ${data.synced} events${data.errors > 0 ? ` (${data.errors} errors)` : ''}.`)
        loadConnection()
      } else {
        showToast('Sync failed.')
      }
    } catch {
      showToast('Sync failed. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-[#0d1526]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0d1526]">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard/settings')}
              className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Integrations</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-300">
                  Connect Unbind to your other tools
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Google Calendar Card */}
            <div className="bg-white dark:bg-[#111827] rounded-lg shadow-sm border border-gray-200 dark:border-[#1f2937]">
              {/* Card Header */}
              <div className="p-6 border-b border-gray-100 dark:border-[#1f2937]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1f2937] rounded-lg flex items-center justify-center">
                      <Image src="/icons/google-calendar.svg" alt="Google Calendar" width={32} height={32} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Google Calendar</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Sync court dates, deadlines, and appointments
                      </p>
                    </div>
                  </div>

                  {connection ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#1f2937] text-gray-600 dark:text-gray-300">
                      Not connected
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                {connection ? (
                  <div className="space-y-5">
                    {/* Sync Status Bar */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0d1526] rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Syncing to: {connection.calendar_name || 'Primary Calendar'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Last synced: {connection.last_synced_at
                            ? formatRelativeTime(connection.last_synced_at)
                            : 'Never'
                          }
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={connection.sync_enabled}
                          onCheckedChange={handleToggleSync}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {connection.sync_enabled ? 'Sync on' : 'Paused'}
                        </span>
                      </div>
                    </div>

                    {/* Error Alert */}
                    {connection.sync_status === 'error' && (
                      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Sync Error</p>
                          <p className="text-sm text-red-600 mt-0.5">{connection.error_message}</p>
                          <button
                            onClick={handleConnectGoogle}
                            className="text-sm text-red-700 underline mt-1 hover:text-red-800"
                          >
                            Reconnect
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Calendar Selector */}
                    {calendars.length > 0 && (
                      <div>
                        <Label htmlFor="calendar_select">Calendar</Label>
                        <select
                          id="calendar_select"
                          value={connection.calendar_id || ''}
                          onChange={(e) => handleChangeCalendar(e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-[#374151] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-sm"
                        >
                          {calendars.map(cal => (
                            <option key={cal.id} value={cal.id}>
                              {cal.name} {cal.primary ? '(Primary)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-[#374151] rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-[#1f2937] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSyncing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        onClick={handleDisconnect}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-[#374151] rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-[#1f2937]"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Connect your Google Calendar to automatically sync:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-400 space-y-1">
                      <li>Court dates and hearings</li>
                      <li>Filing deadlines</li>
                      <li>Client appointments</li>
                      <li>Mediation sessions</li>
                      <li>Team meetings</li>
                    </ul>
                    <button
                      onClick={handleConnectGoogle}
                      disabled={isConnecting}
                      className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Image src="/icons/google-calendar.svg" alt="" width={20} height={20} className="mr-2" />
                          Connect Google Calendar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Microsoft Outlook Placeholder */}
            <div className="bg-white dark:bg-[#111827] rounded-lg shadow-sm border border-gray-200 dark:border-[#1f2937] opacity-60">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1f2937] rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#0078D4" strokeWidth="1.5"/>
                      <path d="M3 8l9 5 9-5" stroke="#0078D4" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Microsoft Outlook</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Coming soon</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QuickBooks Placeholder */}
            <div className="bg-white dark:bg-[#111827] rounded-lg shadow-sm border border-gray-200 dark:border-[#1f2937] opacity-60">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1f2937] rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="#2CA01C" strokeWidth="1.5"/>
                      <path d="M9 12h6M12 9v6" stroke="#2CA01C" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">QuickBooks</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
