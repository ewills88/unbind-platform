'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, DollarSign, Briefcase, Bell, Loader2, Save, AlertCircle, Check, Palette,
} from 'lucide-react'
import type { AllFirmSettings } from '@/types/admin'
import { US_TIMEZONES, BILLING_INCREMENT_OPTIONS, CASE_NUMBER_FORMAT_OPTIONS } from '@/types/admin'

type SettingsTab = 'profile' | 'billing' | 'cases' | 'notifications'

const TABS: { key: SettingsTab; label: string; icon: typeof Building2 }[] = [
  { key: 'profile', label: 'Firm Profile', icon: Building2 },
  { key: 'billing', label: 'Billing', icon: DollarSign },
  { key: 'cases', label: 'Cases', icon: Briefcase },
  { key: 'notifications', label: 'Notifications', icon: Bell },
]

export default function AdminSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<AllFirmSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.status === 401) { router.push('/login'); return }
      if (res.status === 403) { setError('Access denied'); setLoading(false); return }
      if (!res.ok) throw new Error('Failed to load settings')
      const data = await res.json()
      setSettings(data.data)
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveSection = async (section: string, updates: any) => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, updates }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      setSettings(prev => prev ? { ...prev, [section]: data.data } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = (section: keyof AllFirmSettings, field: string, value: any) => {
    setSettings(prev => {
      if (!prev) return prev
      return { ...prev, [section]: { ...prev[section], [field]: value } }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Failed to load settings'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Firm Settings</h1>
          <p className="text-gray-600 mt-1">Configure your firm profile and preferences</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <Check className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input type="text" value={settings.profile.business_name || ''} onChange={e => updateField('profile', 'business_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
                <input type="text" value={settings.profile.legal_name || ''} onChange={e => updateField('profile', 'legal_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bar Number</label>
                <input type="text" value={settings.profile.bar_number || ''} onChange={e => updateField('profile', 'bar_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <select value={settings.profile.business_type} onChange={e => updateField('profile', 'business_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="solo">Solo Practice</option>
                  <option value="partnership">Partnership</option>
                  <option value="llc">LLC</option>
                  <option value="corporation">Corporation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email</label>
                <input type="email" value={settings.profile.primary_email || ''} onChange={e => updateField('profile', 'primary_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Phone</label>
                <input type="tel" value={settings.profile.primary_phone || ''} onChange={e => updateField('profile', 'primary_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input type="url" value={settings.profile.website_url || ''} onChange={e => updateField('profile', 'website_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                <input type="tel" value={settings.profile.fax_number || ''} onChange={e => updateField('profile', 'fax_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                <input type="text" value={settings.profile.address_line1 || ''} onChange={e => updateField('profile', 'address_line1', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input type="text" value={settings.profile.address_line2 || ''} onChange={e => updateField('profile', 'address_line2', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={settings.profile.city || ''} onChange={e => updateField('profile', 'city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input type="text" value={settings.profile.state || ''} onChange={e => updateField('profile', 'state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <input type="text" value={settings.profile.zip_code || ''} onChange={e => updateField('profile', 'zip_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Localization & Branding</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select value={settings.profile.timezone} onChange={e => updateField('profile', 'timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  {US_TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                <select value={settings.profile.date_format} onChange={e => updateField('profile', 'date_format', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                  <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                  <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.profile.primary_color} onChange={e => updateField('profile', 'primary_color', e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer" />
                  <input type="text" value={settings.profile.primary_color} onChange={e => updateField('profile', 'primary_color', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
                <select value={settings.profile.time_format} onChange={e => updateField('profile', 'time_format', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="12h">12-hour</option>
                  <option value="24h">24-hour</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => saveSection('profile', settings.profile)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {tab === 'billing' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Billing Defaults</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Hourly Rate ($)</label>
                <input type="number" value={settings.billing.default_hourly_rate || ''} onChange={e => updateField('billing', 'default_hourly_rate', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Increment</label>
                <select value={settings.billing.default_billing_increment} onChange={e => updateField('billing', 'default_billing_increment', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  {BILLING_INCREMENT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Due Days</label>
                <input type="number" value={settings.billing.invoice_due_days} onChange={e => updateField('billing', 'invoice_due_days', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
                <input type="text" value={settings.billing.invoice_prefix} onChange={e => updateField('billing', 'invoice_prefix', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Payment & Trust</h3>
            <div className="space-y-3">
              {[
                { field: 'accept_credit_cards', label: 'Accept Credit Cards' },
                { field: 'accept_ach', label: 'Accept ACH Transfers' },
                { field: 'accept_checks', label: 'Accept Checks' },
                { field: 'round_up_billing', label: 'Round Up Time Entries' },
                { field: 'trust_account_required', label: 'Require Trust Account' },
                { field: 'late_fee_enabled', label: 'Enable Late Fees' },
              ].map(item => (
                <label key={item.field} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox"
                    checked={!!(settings.billing as unknown as Record<string, boolean>)[item.field]}
                    onChange={e => updateField('billing', item.field, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Invoice Text</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Instructions</label>
                <textarea rows={3} value={settings.billing.payment_instructions || ''} onChange={e => updateField('billing', 'payment_instructions', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Footer</label>
                <textarea rows={2} value={settings.billing.invoice_footer || ''} onChange={e => updateField('billing', 'invoice_footer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => saveSection('billing', settings.billing)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Billing Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Cases Tab */}
      {tab === 'cases' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Case Numbering</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                <input type="text" value={settings.cases.case_number_prefix} onChange={e => updateField('cases', 'case_number_prefix', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select value={settings.cases.case_number_format} onChange={e => updateField('cases', 'case_number_format', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  {CASE_NUMBER_FORMAT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label} ({opt.example})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Case Defaults</h3>
            <div className="space-y-3">
              {[
                { field: 'require_retainer', label: 'Require Retainer for New Cases' },
                { field: 'auto_create_tasks', label: 'Auto-Create Tasks from Templates' },
                { field: 'conflict_check_enabled', label: 'Enable Conflict Check' },
                { field: 'intake_form_enabled', label: 'Enable Client Intake Form' },
              ].map(item => (
                <label key={item.field} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox"
                    checked={!!(settings.cases as unknown as Record<string, boolean>)[item.field]}
                    onChange={e => updateField('cases', item.field, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
              {settings.cases.require_retainer && (
                <div className="ml-7">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Retainer Amount ($)</label>
                  <input type="number" value={settings.cases.default_retainer_amount || ''} onChange={e => updateField('cases', 'default_retainer_amount', parseFloat(e.target.value) || null)}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => saveSection('cases', settings.cases)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Case Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Email Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                <input type="text" value={settings.notifications.email_from_name || ''} onChange={e => updateField('notifications', 'email_from_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Address</label>
                <input type="email" value={settings.notifications.email_from_address || ''} onChange={e => updateField('notifications', 'email_from_address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reply-To</label>
                <input type="email" value={settings.notifications.email_reply_to || ''} onChange={e => updateField('notifications', 'email_reply_to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Reminder (hours before)</label>
                <input type="number" value={settings.notifications.appointment_reminder_hours} onChange={e => updateField('notifications', 'appointment_reminder_hours', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Notification Toggles</h3>
            <div className="space-y-3">
              {[
                { field: 'task_reminder_enabled', label: 'Task Reminders' },
                { field: 'invoice_reminder_enabled', label: 'Invoice Reminders' },
                { field: 'client_portal_notifications', label: 'Client Portal Notifications' },
                { field: 'team_notifications', label: 'Team Notifications' },
                { field: 'daily_digest_enabled', label: 'Daily Digest Email' },
                { field: 'sms_enabled', label: 'SMS Notifications' },
              ].map(item => (
                <label key={item.field} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox"
                    checked={!!(settings.notifications as unknown as Record<string, boolean>)[item.field]}
                    onChange={e => updateField('notifications', item.field, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => saveSection('notifications', settings.notifications)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Notification Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
