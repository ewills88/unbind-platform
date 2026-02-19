'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  FileText, FileQuestion, FolderOpen, CheckSquare, Users, Search,
  Plus, Clock, AlertTriangle, Calendar, Hash, Loader2, ChevronDown,
  ArrowUpRight, ArrowDownLeft, MoreVertical, Trash2, Edit, X,
} from 'lucide-react'
import type {
  DiscoveryRequest, DiscoveryType, DiscoveryDirection, DiscoveryStatus,
  DeadlineResult,
} from '@/types/discovery'
import {
  DISCOVERY_TYPE_INFO, DISCOVERY_STATUS_INFO, SERVICE_METHOD_INFO,
  SET_NUMBER_OPTIONS,
} from '@/types/discovery'
import type { ServiceMethod } from '@/types/discovery'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

const TYPE_ICONS: Record<DiscoveryType, React.ReactNode> = {
  interrogatory_form: <FileQuestion className="w-5 h-5 text-blue-500" />,
  interrogatory_special: <FileQuestion className="w-5 h-5 text-blue-600" />,
  rfp: <FolderOpen className="w-5 h-5 text-green-500" />,
  rfa: <CheckSquare className="w-5 h-5 text-purple-500" />,
  subpoena: <FileText className="w-5 h-5 text-orange-500" />,
  deposition_notice: <Users className="w-5 h-5 text-red-500" />,
}

const URGENCY_BORDERS: Record<string, string> = {
  normal: 'border-l-gray-300',
  warning: 'border-l-yellow-400',
  urgent: 'border-l-orange-500',
  overdue: 'border-l-red-500',
}

interface Props {
  caseId: string
  stateCode?: string
}

export default function CaseDiscoveryTab({ caseId, stateCode }: Props) {
  const [discoveries, setDiscoveries] = useState<DiscoveryRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showExtensionModal, setShowExtensionModal] = useState<string | null>(null)

  const fetchDiscoveries = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/discovery`)
      if (res.ok) {
        const json = await res.json()
        setDiscoveries(json.data || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    fetchDiscoveries()
  }, [fetchDiscoveries])

  const filteredDiscoveries = discoveries.filter(d =>
    filter === 'all' || d.direction === filter
  )

  const overdueCount = discoveries.filter(d => d.urgency === 'overdue').length
  const urgentCount = discoveries.filter(d => d.urgency === 'urgent').length

  async function handleDelete(id: string) {
    if (!confirm('Delete this discovery request?')) return
    const res = await fetch(`/api/discovery/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDiscoveries(prev => prev.filter(d => d.id !== id))
    }
  }

  async function handleStatusChange(id: string, status: DiscoveryStatus) {
    const res = await fetch(`/api/discovery/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      fetchDiscoveries()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Discovery</h2>
          <p className="text-gray-500 text-sm mt-1">
            Track interrogatories, document requests, admissions, and more
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Discovery
        </button>
      </div>

      {/* Alerts */}
      {overdueCount > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Overdue Discovery</p>
            <p className="text-sm text-red-700">
              You have {overdueCount} overdue discovery response{overdueCount > 1 ? 's' : ''}.
              Immediate action required.
            </p>
          </div>
        </div>
      )}

      {urgentCount > 0 && overdueCount === 0 && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-800">Urgent Deadlines</p>
            <p className="text-sm text-orange-700">
              {urgentCount} discovery response{urgentCount > 1 ? 's' : ''} due within 3 days.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'incoming', 'outgoing'] as const).map((f) => {
          const count = f === 'all'
            ? discoveries.length
            : discoveries.filter(d => d.direction === f).length
          const labels = { all: 'All', incoming: 'Received', outgoing: 'Sent' }
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {labels[f]} ({count})
            </button>
          )
        })}
      </div>

      {/* Discovery list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredDiscoveries.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 rounded-lg bg-white">
          <Search className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-900">No discovery yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Track interrogatories, document requests, and admissions
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Add First Discovery
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDiscoveries.map(discovery => (
            <DiscoveryCard
              key={discovery.id}
              discovery={discovery}
              expanded={expandedId === discovery.id}
              onToggle={() => setExpandedId(expandedId === discovery.id ? null : discovery.id)}
              onDelete={() => handleDelete(discovery.id)}
              onStatusChange={(status) => handleStatusChange(discovery.id, status)}
              onRequestExtension={() => setShowExtensionModal(discovery.id)}
            />
          ))}
        </div>
      )}

      {/* Add Discovery Modal */}
      {showAddModal && (
        <AddDiscoveryModal
          caseId={caseId}
          stateCode={stateCode}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false)
            fetchDiscoveries()
          }}
        />
      )}

      {/* Extension Modal */}
      {showExtensionModal && (
        <ExtensionModal
          discoveryId={showExtensionModal}
          discovery={discoveries.find(d => d.id === showExtensionModal)!}
          onClose={() => setShowExtensionModal(null)}
          onGranted={() => {
            setShowExtensionModal(null)
            fetchDiscoveries()
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Discovery Card
// ============================================================================

function DiscoveryCard({
  discovery,
  expanded,
  onToggle,
  onDelete,
  onStatusChange,
  onRequestExtension,
}: {
  discovery: DiscoveryRequest
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onStatusChange: (status: DiscoveryStatus) => void
  onRequestExtension: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const statusInfo = DISCOVERY_STATUS_INFO[discovery.status] || DISCOVERY_STATUS_INFO.pending
  const effectiveDueDate = discovery.effective_due_date || discovery.response_due_date

  return (
    <div className={`bg-white border rounded-lg border-l-4 ${URGENCY_BORDERS[discovery.urgency || 'normal']}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Type icon */}
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
              {TYPE_ICONS[discovery.discovery_type]}
            </div>

            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">{discovery.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded border ${
                  discovery.direction === 'incoming'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {discovery.direction === 'incoming' ? (
                    <span className="flex items-center gap-1"><ArrowDownLeft className="w-3 h-3" /> Received</span>
                  ) : (
                    <span className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> Sent</span>
                  )}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded border ${statusInfo.bgColor} ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>

              {/* Metadata row */}
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 flex-wrap">
                {discovery.served_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Served: {formatDate(discovery.served_date)}
                  </span>
                )}

                {discovery.direction === 'incoming' && effectiveDueDate && (
                  <span className={`flex items-center gap-1 ${
                    discovery.urgency === 'overdue' ? 'text-red-600 font-semibold' :
                    discovery.urgency === 'urgent' ? 'text-orange-600 font-semibold' :
                    discovery.urgency === 'warning' ? 'text-yellow-600 font-medium' :
                    ''
                  }`}>
                    <Clock className="w-3 h-3" />
                    Due: {formatDate(effectiveDueDate)}
                    {discovery.days_until_due !== undefined && discovery.days_until_due !== null && (
                      <span className="ml-1">
                        ({discovery.days_until_due < 0
                          ? `${Math.abs(discovery.days_until_due)}d overdue`
                          : discovery.days_until_due === 0
                          ? 'Due today!'
                          : `${discovery.days_until_due}d`
                        })
                      </span>
                    )}
                  </span>
                )}

                {discovery.item_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {discovery.item_count} items
                  </span>
                )}
              </div>

              {/* Extension note */}
              {discovery.extensions && discovery.extensions.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Extension granted — Original due {formatDate(discovery.response_due_date!)}
                </p>
              )}

              {/* RFA deemed admitted warning */}
              {discovery.discovery_type === 'rfa' && discovery.direction === 'incoming'
                && discovery.status !== 'responded' && (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded px-2 py-1 mt-2 w-fit">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  <span className="text-xs text-red-700 font-medium">
                    DEEMED ADMITTED if no response by due date
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {discovery.direction === 'incoming' && discovery.status !== 'responded' && (
              <button
                onClick={onRequestExtension}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Extension
              </button>
            )}

            <button
              onClick={onToggle}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    {discovery.status === 'pending' && (
                      <button
                        onClick={() => { onStatusChange('in_progress'); setShowMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit className="w-3.5 h-3.5" /> Mark In Progress
                      </button>
                    )}
                    {discovery.status !== 'responded' && (
                      <button
                        onClick={() => { onStatusChange('responded'); setShowMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Mark Responded
                      </button>
                    )}
                    <button
                      onClick={() => { onDelete(); setShowMenu(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 text-sm space-y-2">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <div>
              <span className="text-gray-500">Type:</span>{' '}
              <span className="text-gray-900">{DISCOVERY_TYPE_INFO[discovery.discovery_type]?.label}</span>
            </div>
            <div>
              <span className="text-gray-500">Set:</span>{' '}
              <span className="text-gray-900">{discovery.set_number}</span>
            </div>
            {discovery.service_method && (
              <div>
                <span className="text-gray-500">Service:</span>{' '}
                <span className="text-gray-900">{SERVICE_METHOD_INFO[discovery.service_method]?.label}</span>
              </div>
            )}
            {discovery.propounding_party && (
              <div>
                <span className="text-gray-500">Propounding:</span>{' '}
                <span className="text-gray-900">{discovery.propounding_party}</span>
              </div>
            )}
            {discovery.responding_party && (
              <div>
                <span className="text-gray-500">Responding:</span>{' '}
                <span className="text-gray-900">{discovery.responding_party}</span>
              </div>
            )}
            {discovery.actual_response_date && (
              <div>
                <span className="text-gray-500">Responded:</span>{' '}
                <span className="text-gray-900">{formatDate(discovery.actual_response_date)}</span>
              </div>
            )}
          </div>
          {discovery.notes && (
            <div className="pt-2 border-t border-gray-200">
              <span className="text-gray-500">Notes:</span>{' '}
              <span className="text-gray-700">{discovery.notes}</span>
            </div>
          )}
          {discovery.extensions && discovery.extensions.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <span className="text-gray-500 font-medium">Extensions:</span>
              {discovery.extensions.map((ext) => (
                <div key={ext.id} className="ml-4 mt-1 text-xs text-gray-600">
                  +{ext.requested_extension_days} days → {formatDate(ext.new_due_date)}
                  {ext.granted_by && <span> (granted by {ext.granted_by})</span>}
                  {ext.reason && <span> — {ext.reason}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Add Discovery Modal
// ============================================================================

function AddDiscoveryModal({
  caseId,
  stateCode,
  onClose,
  onCreated,
}: {
  caseId: string
  stateCode?: string
  onClose: () => void
  onCreated: () => void
}) {
  const [direction, setDirection] = useState<DiscoveryDirection>('incoming')
  const [discoveryType, setDiscoveryType] = useState<DiscoveryType>('interrogatory_form')
  const [setNumber, setSetNumber] = useState('Set One')
  const [servedDate, setServedDate] = useState(new Date().toISOString().split('T')[0])
  const [serviceMethod, setServiceMethod] = useState<ServiceMethod>('electronic')
  const [itemCount, setItemCount] = useState(0)
  const [propoundingParty, setPropoundingParty] = useState('')
  const [respondingParty, setRespondingParty] = useState('')
  const [notes, setNotes] = useState('')

  const [deadline, setDeadline] = useState<DeadlineResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Auto-calculate deadline
  useEffect(() => {
    if (direction === 'incoming' && servedDate && serviceMethod) {
      const timer = setTimeout(async () => {
        setCalculating(true)
        try {
          const res = await fetch('/api/discovery/calculate-deadline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              state_code: stateCode || 'CA',
              discovery_type: discoveryType,
              served_date: servedDate,
              service_method: serviceMethod,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            setDeadline(data)
          }
        } catch {
          // silently handle
        } finally {
          setCalculating(false)
        }
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setDeadline(null)
    }
  }, [direction, discoveryType, servedDate, serviceMethod, stateCode])

  async function handleSubmit() {
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/cases/${caseId}/discovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discovery_type: discoveryType,
          direction,
          set_number: setNumber,
          served_date: servedDate,
          service_method: serviceMethod,
          item_count: itemCount,
          propounding_party: propoundingParty || undefined,
          responding_party: respondingParty || undefined,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create')
      }

      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setSubmitting(false)
    }
  }

  const discoveryTypes: { value: DiscoveryType; label: string }[] = [
    { value: 'interrogatory_form', label: 'Form Interrogatories' },
    { value: 'interrogatory_special', label: 'Special Interrogatories' },
    { value: 'rfp', label: 'Request for Production (RFP)' },
    { value: 'rfa', label: 'Request for Admissions (RFA)' },
    { value: 'subpoena', label: 'Subpoena Duces Tecum' },
    { value: 'deposition_notice', label: 'Notice of Deposition' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Add Discovery</h3>
            {stateCode && (
              <p className="text-xs text-gray-500 mt-0.5">
                State: {stateCode} — deadlines calculated automatically
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Direction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Direction</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                direction === 'incoming' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  checked={direction === 'incoming'}
                  onChange={() => setDirection('incoming')}
                  className="text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <ArrowDownLeft className="w-4 h-4" /> Received
                  </span>
                  <p className="text-xs text-gray-500">We must respond</p>
                </div>
              </label>
              <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                direction === 'outgoing' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  checked={direction === 'outgoing'}
                  onChange={() => setDirection('outgoing')}
                  className="text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4" /> Sent
                  </span>
                  <p className="text-xs text-gray-500">We propounded</p>
                </div>
              </label>
            </div>
          </div>

          {/* Type and Set */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={discoveryType}
                onChange={(e) => setDiscoveryType(e.target.value as DiscoveryType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {discoveryTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Set Number</label>
              <select
                value={setNumber}
                onChange={(e) => setSetNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SET_NUMBER_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Service details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Served</label>
              <input
                type="date"
                value={servedDate}
                onChange={(e) => setServedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method of Service</label>
              <select
                value={serviceMethod}
                onChange={(e) => setServiceMethod(e.target.value as ServiceMethod)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(Object.entries(SERVICE_METHOD_INFO) as [ServiceMethod, { label: string }][]).map(
                  ([key, info]) => (
                    <option key={key} value={key}>{info.label}</option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Item count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Requests/Interrogatories
            </label>
            <input
              type="number"
              min="0"
              value={itemCount || ''}
              onChange={(e) => setItemCount(parseInt(e.target.value) || 0)}
              placeholder="e.g., 35"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Propounding Party</label>
              <input
                type="text"
                value={propoundingParty}
                onChange={(e) => setPropoundingParty(e.target.value)}
                placeholder="Who sent it"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responding Party</label>
              <input
                type="text"
                value={respondingParty}
                onChange={(e) => setRespondingParty(e.target.value)}
                placeholder="Who must respond"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Calculated deadline */}
          {direction === 'incoming' && (
            <div className={`border-2 rounded-lg p-4 ${
              calculating
                ? 'border-gray-300 bg-gray-50'
                : deadline?.isRFADeemedAdmitted
                ? 'border-red-500 bg-red-50'
                : deadline
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50'
            }`}>
              {calculating ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating deadline...
                </div>
              ) : deadline ? (
                <div className="flex items-start gap-3">
                  <Calendar className={`w-5 h-5 shrink-0 mt-0.5 ${
                    deadline.isRFADeemedAdmitted ? 'text-red-600' : 'text-blue-600'
                  }`} />
                  <div>
                    <p className="font-semibold text-gray-900">
                      Response Due: {formatDate(deadline.dueDate)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {deadline.baseDays} days base + {deadline.additionalDays} days for {serviceMethod} service
                    </p>
                    {deadline.statutoryReference && (
                      <p className="text-xs text-gray-500 mt-1">{deadline.statutoryReference}</p>
                    )}
                    {deadline.warnings.map((w, i) => (
                      <p key={i} className="text-sm text-red-600 mt-2 font-medium">{w}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Enter service date and method to calculate deadline
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg sticky bottom-0">
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
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Add Discovery'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Extension Modal
// ============================================================================

function ExtensionModal({
  discoveryId,
  discovery,
  onClose,
  onGranted,
}: {
  discoveryId: string
  discovery: DiscoveryRequest
  onClose: () => void
  onGranted: () => void
}) {
  const [extensionDays, setExtensionDays] = useState(14)
  const [reason, setReason] = useState('')
  const [grantedBy, setGrantedBy] = useState('')
  const [granted, setGranted] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const currentDueDate = discovery.extended_due_date || discovery.response_due_date
  const newDueDate = currentDueDate
    ? new Date(new Date(currentDueDate).getTime() + extensionDays * 86400000)
        .toISOString().split('T')[0]
    : null

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Please provide a reason for the extension')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/discovery/${discoveryId}/extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extension_days: extensionDays,
          reason,
          granted,
          granted_by: grantedBy || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create extension')
      }

      onGranted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create extension')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Request Extension</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="text-gray-500">Current due date</p>
            <p className="font-medium text-gray-900">
              {currentDueDate ? formatDate(currentDueDate) : 'Not set'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Extension Days</label>
            <input
              type="number"
              min="1"
              value={extensionDays}
              onChange={(e) => setExtensionDays(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {newDueDate && (
              <p className="text-xs text-blue-600 mt-1">
                New due date: {formatDate(newDueDate)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for extension request..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Granted By</label>
            <input
              type="text"
              value={grantedBy}
              onChange={(e) => setGrantedBy(e.target.value)}
              placeholder="e.g., Opposing Counsel, Court Order"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={granted}
              onChange={(e) => setGranted(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="text-sm text-gray-700">Extension already granted</span>
          </label>
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
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Extension'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
