'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import {
  ArrowLeft, Plus, Loader2, AlertTriangle, Clock,
  FileText, ChevronDown, ChevronUp, X, Save, Trash2,
  Download,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type {
  DiscoveryRequest, DiscoveryItem, DiscoveryItemStatus,
  ObjectionTemplate, DiscoveryType,
} from '@/types/discovery'
import {
  DISCOVERY_TYPE_INFO, ITEM_STATUS_INFO, OBJECTION_TYPE_LABELS,
  getItemTypeLabel,
} from '@/types/discovery'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function DiscoveryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.caseId as string
  const discoveryId = params.discoveryId as string

  const [discovery, setDiscovery] = useState<DiscoveryRequest | null>(null)
  const [items, setItems] = useState<DiscoveryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showAddItems, setShowAddItems] = useState(false)
  const [stateCode, _setStateCode] = useState('CA')

  const fetchData = useCallback(async () => {
    try {
      const [discRes, itemsRes] = await Promise.all([
        fetch(`/api/discovery/${discoveryId}`),
        fetch(`/api/discovery/${discoveryId}/items`),
      ])

      if (discRes.ok) {
        const discData = await discRes.json()
        setDiscovery(discData.data)
      }
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json()
        setItems(itemsData.data || [])
      }

      // Get case state_code
      const caseRes = await fetch(`/api/cases/${caseId}/events?limit=0`)
      if (caseRes.ok) {
        // state_code will come from case context; fallback CA
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [discoveryId, caseId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredItems = items.filter(item =>
    filterStatus === 'all' || item.status === filterStatus
  )

  const statusCounts = {
    all: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    drafted: items.filter(i => i.status === 'drafted').length,
    reviewed: items.filter(i => i.status === 'reviewed').length,
    finalized: items.filter(i => i.status === 'finalized').length,
  }

  const completionPercent = items.length > 0
    ? Math.round((statusCounts.finalized / items.length) * 100)
    : 0

  async function handleBulkStatus(status: DiscoveryItemStatus) {
    const res = await fetch('/api/discovery/items/bulk?action=bulk_status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: selectedItems, status }),
    })
    if (res.ok) {
      setSelectedItems([])
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <button
                onClick={() => router.push(`/dashboard/cases/${caseId}`)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Case
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{discovery?.title}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span>{DISCOVERY_TYPE_INFO[discovery?.discovery_type as DiscoveryType]?.label}</span>
                {discovery?.served_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Served: {formatDate(discovery.served_date)}
                  </span>
                )}
                {discovery?.direction === 'incoming' && discovery?.effective_due_date && (
                  <span className={`flex items-center gap-1 font-medium ${
                    discovery.urgency === 'overdue' ? 'text-red-600' :
                    discovery.urgency === 'urgent' ? 'text-orange-600' :
                    'text-gray-700'
                  }`}>
                    Due: {formatDate(discovery.effective_due_date)}
                    {discovery.days_until_due !== undefined && (
                      <span>({discovery.days_until_due < 0
                        ? `${Math.abs(discovery.days_until_due)}d overdue`
                        : `${discovery.days_until_due}d`
                      })</span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/dashboard/cases/${caseId}/discovery/${discoveryId}/generate`)}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Generate Document
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900 text-sm">Response Progress</span>
              <span className="text-sm text-gray-500">
                {statusCounts.finalized} of {items.length} finalized
              </span>
            </div>
            <Progress value={completionPercent} className="h-2.5" />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>{statusCounts.pending} pending</span>
              <span>{statusCounts.drafted} drafted</span>
              <span>{statusCounts.reviewed} reviewed</span>
              <span>{statusCounts.finalized} finalized</span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {(Object.entries(statusCounts) as [string, number][]).map(([key, count]) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterStatus === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {key === 'all' ? 'All' : key.charAt(0).toUpperCase() + key.slice(1)} ({count})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {selectedItems.length > 0 && (
                <>
                  <span className="text-xs text-gray-500">{selectedItems.length} selected</span>
                  <button
                    onClick={() => handleBulkStatus('drafted')}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Mark Drafted
                  </button>
                  <button
                    onClick={() => handleBulkStatus('finalized')}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Mark Finalized
                  </button>
                  <button
                    onClick={() => setSelectedItems([])}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </>
              )}
              <button
                onClick={() => setShowAddItems(true)}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add Items
              </button>
            </div>
          </div>

          {/* Items */}
          {items.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-900">No items yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add individual interrogatories or requests to track responses
              </p>
              <button
                onClick={() => setShowAddItems(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Add Items
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="pt-5">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id])
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id))
                        }
                      }}
                      className="rounded text-blue-600"
                    />
                  </div>
                  <div className="flex-1">
                    <DiscoveryItemEditor
                      item={item}
                      discoveryType={discovery?.discovery_type as DiscoveryType}
                      stateCode={stateCode}
                      onUpdate={fetchData}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Items Modal */}
      {showAddItems && (
        <AddItemsModal
          discoveryId={discoveryId}
          existingCount={items.length}
          onClose={() => setShowAddItems(false)}
          onCreated={() => {
            setShowAddItems(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Discovery Item Editor
// ============================================================================

function DiscoveryItemEditor({
  item,
  discoveryType,
  stateCode,
  onUpdate,
}: {
  item: DiscoveryItem
  discoveryType: DiscoveryType
  stateCode: string
  onUpdate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [response, setResponse] = useState(item.response_text || '')
  const [objections, setObjections] = useState<string[]>(item.objection_type || [])
  const [objectionText, setObjectionText] = useState(item.objection_text || '')
  const [status, setStatus] = useState<DiscoveryItemStatus>(item.status)
  const [saving, setSaving] = useState(false)
  const [showObjectionPicker, setShowObjectionPicker] = useState(false)
  const [dirty, setDirty] = useState(false)

  const statusInfo = ITEM_STATUS_INFO[status]

  useEffect(() => {
    const changed =
      response !== (item.response_text || '') ||
      objectionText !== (item.objection_text || '') ||
      status !== item.status ||
      JSON.stringify(objections) !== JSON.stringify(item.objection_type || [])
    setDirty(changed)
  }, [response, objectionText, objections, status, item])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/discovery/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_text: response,
          objection_text: objectionText,
          objection_type: objections,
          status,
        }),
      })
      if (res.ok) {
        setDirty(false)
        onUpdate()
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  function handleAddObjection(template: ObjectionTemplate) {
    if (!objections.includes(template.objection_type)) {
      setObjections([...objections, template.objection_type])
    }
    const newText = objectionText
      ? `${objectionText}\n\n${template.objection_text}`
      : template.objection_text
    setObjectionText(newText)
    setShowObjectionPicker(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
            {item.item_number}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 line-clamp-1">{item.request_text || 'No request text'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          {dirty && <span className="w-2 h-2 rounded-full bg-orange-400" title="Unsaved changes" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Request text */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {getItemTypeLabel(discoveryType)} No. {item.item_number}
            </label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-800 whitespace-pre-wrap">
              {item.request_text || 'No request text provided'}
            </div>
          </div>

          {/* Status selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
            <div className="flex gap-2">
              {(Object.entries(ITEM_STATUS_INFO) as [DiscoveryItemStatus, typeof ITEM_STATUS_INFO[DiscoveryItemStatus]][]).map(
                ([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setStatus(key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      status === key
                        ? `${info.bgColor} ${info.color} ring-1 ring-current`
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {info.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Objections */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Objections
              </label>
              <button
                onClick={() => setShowObjectionPicker(true)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Objection
              </button>
            </div>

            {objections.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {objections.map(obj => (
                  <span
                    key={obj}
                    className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded cursor-pointer hover:bg-orange-100"
                    onClick={() => setObjections(objections.filter(o => o !== obj))}
                  >
                    {OBJECTION_TYPE_LABELS[obj] || obj}
                    <X className="w-3 h-3" />
                  </span>
                ))}
              </div>
            )}

            {(objections.length > 0 || objectionText) && (
              <textarea
                value={objectionText}
                onChange={(e) => setObjectionText(e.target.value)}
                placeholder="Objection text..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            )}
          </div>

          {/* Response */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {discoveryType === 'rfa' ? 'Response (Admit / Deny / Lack Information)' : 'Response'}
            </label>

            {discoveryType === 'rfa' && (
              <div className="flex gap-2 mb-2">
                {[
                  { label: 'Admit', value: 'ADMITTED.' },
                  { label: 'Deny', value: 'DENIED.' },
                  { label: 'Lack Info', value: 'RESPONDING PARTY LACKS SUFFICIENT INFORMATION OR KNOWLEDGE TO ADMIT OR DENY THIS REQUEST.' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setResponse(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      response === opt.value
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder={
                discoveryType === 'rfp'
                  ? 'Responding party will produce all non-privileged responsive documents...'
                  : 'Type your response here...'
              }
              rows={discoveryType === 'rfa' ? 3 : 5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Response
            </button>
          </div>
        </div>
      )}

      {/* Objection Picker Modal */}
      {showObjectionPicker && (
        <ObjectionPickerModal
          stateCode={stateCode}
          onSelect={handleAddObjection}
          onClose={() => setShowObjectionPicker(false)}
        />
      )}
    </div>
  )
}

// ============================================================================
// Objection Picker Modal
// ============================================================================

function ObjectionPickerModal({
  stateCode,
  onSelect,
  onClose,
}: {
  stateCode: string
  onSelect: (template: ObjectionTemplate) => void
  onClose: () => void
}) {
  const [templates, setTemplates] = useState<ObjectionTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/discovery/objection-templates?state_code=${stateCode}`)
        if (res.ok) {
          const data = await res.json()
          setTemplates(data.data || [])
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [stateCode])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Add Objection</h3>
            <p className="text-sm text-gray-500">Select a standard objection ({stateCode})</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No templates found for {stateCode}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <p className="font-semibold text-sm text-gray-900 capitalize mb-1">
                    {OBJECTION_TYPE_LABELS[t.objection_type] || t.objection_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-3">{t.objection_text}</p>
                  {t.statutory_reference && (
                    <p className="text-xs text-blue-600 mt-2">{t.statutory_reference}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Add Items Modal (manual entry)
// ============================================================================

function AddItemsModal({
  discoveryId,
  existingCount,
  onClose,
  onCreated,
}: {
  discoveryId: string
  existingCount: number
  onClose: () => void
  onCreated: () => void
}) {
  const [items, setItems] = useState<{ item_number: number; request_text: string }[]>([
    { item_number: existingCount + 1, request_text: '' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function addRow() {
    const nextNum = items.length > 0 ? items[items.length - 1].item_number + 1 : existingCount + 1
    setItems([...items, { item_number: nextNum, request_text: '' }])
  }

  function removeRow(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function updateRow(index: number, text: string) {
    const updated = [...items]
    updated[index].request_text = text
    setItems(updated)
  }

  async function handleSubmit() {
    const validItems = items.filter(i => i.request_text.trim())
    if (validItems.length === 0) {
      setError('Add at least one item with request text')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/discovery/${discoveryId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validItems),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add items')
      }

      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add items')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add Discovery Items</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {items.map((item, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0 mt-1">
                {item.item_number}
              </div>
              <textarea
                value={item.request_text}
                onChange={(e) => updateRow(index, e.target.value)}
                placeholder={`Enter request/interrogatory #${item.item_number}...`}
                rows={3}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {items.length > 1 && (
                <button
                  onClick={() => removeRow(index)}
                  className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 mt-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addRow}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" /> Add another item
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Add {items.filter(i => i.request_text.trim()).length} Item{items.filter(i => i.request_text.trim()).length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
