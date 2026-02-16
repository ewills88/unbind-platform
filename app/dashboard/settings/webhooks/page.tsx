'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, Plus, Trash2, Play, History, X, Copy,
  AlertTriangle, Clock, Loader2, Webhook as WebhookIcon, CheckCircle, XCircle,
} from 'lucide-react'
import { Webhook, WebhookDelivery, WEBHOOK_EVENT_INFO, WebhookEventType } from '@/types/webhooks'

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

export default function WebhooksPage() {
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    loadWebhooks()
  }, [])

  const loadWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks')
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks || [])
      }
    } catch (error) {
      console.error('Error loading webhooks:', error)
    } finally {
      setLoading(false)
    }
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WebhookIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
                  <p className="mt-1 text-gray-600">Send real-time data to external services</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Webhook
              </button>
            </div>
          </div>

          {/* Webhooks List */}
          {webhooks.length > 0 ? (
            <div className="space-y-4">
              {webhooks.map(webhook => (
                <WebhookCard
                  key={webhook.id}
                  webhook={webhook}
                  onUpdate={loadWebhooks}
                  showToast={showToast}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <WebhookIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No webhooks configured</h3>
              <p className="text-gray-500 mb-6">
                Webhooks let you send Unbind data to other apps in real-time
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Create Your First Webhook
              </button>
            </div>
          )}

          {/* Create Modal */}
          {showCreate && (
            <CreateWebhookModal
              onClose={() => setShowCreate(false)}
              onCreated={() => {
                setShowCreate(false)
                loadWebhooks()
                showToast('Webhook created!')
              }}
            />
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}

function WebhookCard({
  webhook,
  onUpdate,
  showToast,
}: {
  webhook: Webhook
  onUpdate: () => void
  showToast: (msg: string) => void
}) {
  const [showDeliveries, setShowDeliveries] = useState(false)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}/test`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showToast(`Test sent! Status: ${data.status} (${data.duration}ms)`)
      } else {
        showToast(`Test failed: ${data.error || 'Unknown error'}`)
      }
    } catch {
      showToast('Test failed.')
    } finally {
      setTesting(false)
    }
  }

  const handleToggle = async (enabled: boolean) => {
    await fetch(`/api/webhooks/${webhook.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: enabled }),
    })
    onUpdate()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this webhook? This cannot be undone.')) return
    await fetch(`/api/webhooks/${webhook.id}`, { method: 'DELETE' })
    onUpdate()
    showToast('Webhook deleted.')
  }

  const loadDeliveries = async () => {
    const res = await fetch(`/api/webhooks/${webhook.id}`)
    if (res.ok) {
      const data = await res.json()
      setDeliveries(data.deliveries || [])
    }
    setShowDeliveries(true)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${webhook.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
          <div>
            <h3 className="font-semibold text-gray-900">{webhook.name}</h3>
            <p className="text-sm text-gray-500 font-mono truncate max-w-md">{webhook.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={webhook.is_active} onCheckedChange={handleToggle} />
          <button onClick={handleTest} disabled={testing} className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={loadDeliveries} className="text-sm text-gray-500 hover:text-gray-700">
            <History className="w-4 h-4" />
          </button>
          <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Events */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {webhook.events.map(event => (
          <span key={event} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {event}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {webhook.last_triggered_at ? formatRelativeTime(webhook.last_triggered_at) : 'Never triggered'}
        </span>
        {webhook.failure_count > 0 && (
          <span className="flex items-center gap-1 text-orange-600">
            <AlertTriangle className="w-3 h-3" />
            {webhook.failure_count} failures
          </span>
        )}
      </div>

      {/* Auto-disabled alert */}
      {!webhook.is_active && webhook.disabled_at && (
        <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-red-700">Auto-disabled due to repeated failures. Fix the endpoint and re-enable.</span>
        </div>
      )}

      {/* Delivery History */}
      {showDeliveries && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Recent Deliveries</h4>
            <button onClick={() => setShowDeliveries(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {deliveries.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {deliveries.map(d => (
                <div key={d.id} className="flex items-center justify-between text-xs py-1.5 px-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    {d.status === 'success' ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : d.status === 'failed' ? (
                      <XCircle className="w-3 h-3 text-red-500" />
                    ) : (
                      <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                    )}
                    <span className="text-gray-700">{d.event_type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500">
                    {d.response_status && <span>{d.response_status}</span>}
                    {d.duration_ms && <span>{d.duration_ms}ms</span>}
                    <span>{formatRelativeTime(d.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No deliveries yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

function CreateWebhookModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [secretKey] = useState(() => crypto.randomUUID())
  const [creating, setCreating] = useState(false)

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    )
  }

  const handleCreate = async () => {
    if (!name || !url || selectedEvents.length === 0) return
    setCreating(true)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, events: selectedEvents, secret_key: secretKey }),
      })
      if (res.ok) {
        onCreated()
      }
    } catch {
      // handled
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create Webhook</h2>
            <p className="text-sm text-gray-500">Send real-time notifications to external services</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <Label htmlFor="wh_name">Name *</Label>
            <input
              id="wh_name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Zapier - New Cases"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="wh_url">Endpoint URL *</Label>
            <input
              id="wh_url"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/..."
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <Label>Secret Key (for signature verification)</Label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={secretKey}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
              />
              <button
                onClick={() => { navigator.clipboard.writeText(secretKey) }}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Verify webhook authenticity via X-Webhook-Signature header.</p>
          </div>

          <div>
            <Label>Events *</Label>
            <p className="text-sm text-gray-500 mb-2">Select which events trigger this webhook</p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {(Object.entries(WEBHOOK_EVENT_INFO) as [WebhookEventType, { label: string; description: string }][]).map(
                ([event, info]) => (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleEvent(event)}
                    className={`flex items-start gap-2 p-3 border rounded-lg text-left transition-colors ${
                      selectedEvents.includes(event)
                        ? 'bg-blue-50 border-blue-500'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{info.label}</p>
                      <p className="text-xs text-gray-500">{info.description}</p>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name || !url || selectedEvents.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Webhook'}
          </button>
        </div>
      </div>
    </div>
  )
}
