'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bell, ArrowLeft } from 'lucide-react'
import {
  NotificationTriggerType,
  NotificationPreferencesMap,
  EmailFrequency,
  NOTIFICATION_TYPE_INFO,
  EMAIL_FREQUENCY_OPTIONS,
  getDefaultPreferences,
} from '@/types/notifications'

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
]

interface PrefsState {
  email_enabled: boolean
  app_notifications_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  timezone: string
  preferences: NotificationPreferencesMap
  frequency: EmailFrequency
}

export default function NotificationSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<PrefsState>({
    email_enabled: true,
    app_notifications_enabled: true,
    quiet_hours_start: '',
    quiet_hours_end: '',
    timezone: 'America/Los_Angeles',
    preferences: getDefaultPreferences(),
    frequency: 'instant',
  })

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const res = await fetch('/api/settings/notifications')
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setPrefs({
          email_enabled: data.email_enabled ?? true,
          app_notifications_enabled: data.app_notifications_enabled ?? true,
          quiet_hours_start: data.quiet_hours_start || '',
          quiet_hours_end: data.quiet_hours_end || '',
          timezone: data.timezone || 'America/Los_Angeles',
          preferences: (data.preferences && Object.keys(data.preferences).length > 0)
            ? data.preferences
            : getDefaultPreferences(),
          frequency: data.frequency || 'instant',
        })
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_enabled: prefs.email_enabled,
          app_notifications_enabled: prefs.app_notifications_enabled,
          quiet_hours_start: prefs.quiet_hours_start || null,
          quiet_hours_end: prefs.quiet_hours_end || null,
          timezone: prefs.timezone,
          preferences: prefs.preferences,
          frequency: prefs.frequency,
        }),
      })

      if (res.ok) {
        showToast('Notification preferences saved!')
      } else {
        showToast('Error saving preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      showToast('Error saving preferences')
    } finally {
      setSaving(false)
    }
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const updateTypePreference = (
    type: NotificationTriggerType,
    channel: 'email' | 'push',
    value: boolean
  ) => {
    setPrefs(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [type]: {
          ...(prev.preferences[type] || { email: true, push: true }),
          [channel]: value,
        },
      },
    }))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard/settings')}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
                <p className="mt-1 text-gray-600">
                  Control how and when you receive notifications
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Section 1: Global Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Global Settings</h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email_enabled" className="text-base">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <Switch
                    id="email_enabled"
                    checked={prefs.email_enabled}
                    onCheckedChange={(checked) => setPrefs({ ...prefs, email_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push_enabled" className="text-base">Push Notifications</Label>
                    <p className="text-sm text-gray-500">Receive in-app and browser notifications</p>
                  </div>
                  <Switch
                    id="push_enabled"
                    checked={prefs.app_notifications_enabled}
                    onCheckedChange={(checked) => setPrefs({ ...prefs, app_notifications_enabled: checked })}
                  />
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <Label className="text-base mb-3 block">Email Frequency</Label>
                  <div className="space-y-3">
                    {EMAIL_FREQUENCY_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-start gap-3 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="frequency"
                          value={option.value}
                          checked={prefs.frequency === option.value}
                          onChange={() => setPrefs({ ...prefs, frequency: option.value })}
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{option.label}</span>
                          <p className="text-sm text-gray-500">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Quiet Hours */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Quiet Hours</h2>
              <p className="text-sm text-gray-500 mb-6">
                Emails will be deferred until quiet hours end. Leave empty to disable.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quiet_start">Start Time</Label>
                  <input
                    id="quiet_start"
                    type="time"
                    value={prefs.quiet_hours_start}
                    onChange={(e) => setPrefs({ ...prefs, quiet_hours_start: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="quiet_end">End Time</Label>
                  <input
                    id="quiet_end"
                    type="time"
                    value={prefs.quiet_hours_end}
                    onChange={(e) => setPrefs({ ...prefs, quiet_hours_end: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={prefs.timezone}
                    onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {US_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Per-Type Preferences */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Notification Types</h2>
              <p className="text-sm text-gray-500 mb-6">
                Choose which notifications you want to receive for each channel
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-sm font-medium text-gray-500 pb-3 pr-4">Type</th>
                      <th className="text-center text-sm font-medium text-gray-500 pb-3 px-4 w-24">Email</th>
                      <th className="text-center text-sm font-medium text-gray-500 pb-3 px-4 w-24">Push</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(NOTIFICATION_TYPE_INFO) as [NotificationTriggerType, typeof NOTIFICATION_TYPE_INFO[NotificationTriggerType]][]).map(
                      ([type, info]) => {
                        const typePref = prefs.preferences[type] || { email: info.defaultEmail, push: info.defaultPush }
                        return (
                          <tr key={type} className="border-b border-gray-100 last:border-0">
                            <td className="py-4 pr-4">
                              <div className="text-sm font-medium text-gray-900">{info.label}</div>
                              <div className="text-xs text-gray-500">{info.description}</div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={typePref.email}
                                disabled={!prefs.email_enabled}
                                onChange={(e) => updateTypePreference(type, 'email', e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-40"
                              />
                            </td>
                            <td className="py-4 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={typePref.push}
                                disabled={!prefs.app_notifications_enabled}
                                onChange={(e) => updateTypePreference(type, 'push', e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-40"
                              />
                            </td>
                          </tr>
                        )
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
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
