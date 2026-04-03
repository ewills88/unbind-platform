'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState, useEffect } from 'react'
import {
  X, FileText, ChevronRight, Loader2,
  DollarSign, AlertCircle, Clock,
} from 'lucide-react'
import {
  FILING_CATEGORY_INFO,
  FILING_METHOD_INFO,
  formatFilingFee,
  type FilingCategory,
  type FilingType,
  type Court,
  type FilingMethod,
} from '@/types/filings'

interface Props {
  caseId: string
  stateCode: string
  onClose: () => void
  onCreated: (filingId: string) => void
}

type Step = 'type' | 'details' | 'confirm'

export default function NewFilingModal({ caseId, stateCode, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>('type')
  const [filingTypes, setFilingTypes] = useState<FilingType[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedType, setSelectedType] = useState<FilingType | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<FilingCategory | 'all'>('all')
  const [filingName, setFilingName] = useState('')
  const [description, setDescription] = useState('')
  const [courtId, setCourtId] = useState('')
  const [filingMethod, setFilingMethod] = useState<FilingMethod>('in_person')
  const [priority, setPriority] = useState('normal')
  const [feeWaiverRequested, setFeeWaiverRequested] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [typesRes, courtsRes] = await Promise.all([
          authFetch(`/api/filing-types?state_code=${stateCode}`),
          authFetch(`/api/courts?state_code=${stateCode}`),
        ])
        if (typesRes.ok) {
          const json = await typesRes.json()
          setFilingTypes(json.data || [])
        }
        if (courtsRes.ok) {
          const json = await courtsRes.json()
          setCourts(json.data || [])
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [stateCode])

  const filteredTypes = categoryFilter === 'all'
    ? filingTypes
    : filingTypes.filter(t => t.category === categoryFilter)

  function selectType(ft: FilingType) {
    setSelectedType(ft)
    setFilingName(ft.filing_name)
    setDescription(ft.description || '')
    setStep('details')
  }

  function handleCustomFiling() {
    setSelectedType(null)
    setFilingName('')
    setDescription('')
    setStep('details')
  }

  async function handleSubmit() {
    if (!filingName.trim()) {
      setError('Filing name is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await authFetch(`/api/cases/${caseId}/filings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filing_type_id: selectedType?.id || null,
          court_id: courtId || null,
          filing_name: filingName,
          description: description || null,
          category: selectedType?.category || 'other',
          filing_method: filingMethod,
          filing_fee: selectedType?.fee_amount || 0,
          fee_waiver_requested: feeWaiverRequested,
          priority,
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Failed to create filing')
        return
      }

      const json = await res.json()
      onCreated(json.data.id)
    } catch {
      setError('Failed to create filing')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">New Court Filing</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-sm">
          <span className={step === 'type' ? 'font-semibold text-blue-600' : 'text-gray-500'}>
            1. Select Type
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className={step === 'details' ? 'font-semibold text-blue-600' : 'text-gray-500'}>
            2. Details
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className={step === 'confirm' ? 'font-semibold text-blue-600' : 'text-gray-500'}>
            3. Confirm
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : step === 'type' ? (
            <div className="space-y-4">
              {/* Category filter */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                    categoryFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {Object.entries(FILING_CATEGORY_INFO).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setCategoryFilter(key as FilingCategory)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                      categoryFilter === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {info.label}
                  </button>
                ))}
              </div>

              {/* Filing types list */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredTypes.map(ft => (
                  <button
                    key={ft.id}
                    onClick={() => selectType(ft)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{ft.filing_name}</p>
                          <span className="text-xs text-gray-500 font-mono">{ft.filing_code}</span>
                        </div>
                        {ft.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ft.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {FILING_CATEGORY_INFO[ft.category]?.label}
                          </span>
                          {ft.fee_amount > 0 && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatFilingFee(ft.fee_amount)}
                            </span>
                          )}
                          {ft.requires_service && (
                            <span className="text-xs text-gray-500">Requires service</span>
                          )}
                          {ft.requires_hearing && (
                            <span className="text-xs text-gray-500">Requires hearing</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 mt-1 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom filing option */}
              <button
                onClick={handleCustomFiling}
                className="w-full text-left p-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <p className="text-sm font-medium text-gray-700">Custom Filing</p>
                <p className="text-xs text-gray-500 mt-0.5">Create a filing not listed above</p>
              </button>
            </div>
          ) : step === 'details' ? (
            <div className="space-y-4">
              {selectedType && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">{selectedType.filing_name}</p>
                  <p className="text-xs text-blue-700 mt-0.5">{selectedType.filing_code}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filing Name *</label>
                <input
                  type="text"
                  value={filingName}
                  onChange={e => setFilingName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter filing name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
                <select
                  value={courtId}
                  onChange={e => setCourtId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select court...</option>
                  {courts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.court_name} — {c.county} County
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filing Method</label>
                  <select
                    value={filingMethod}
                    onChange={e => setFilingMethod(e.target.value as FilingMethod)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(FILING_METHOD_INFO).map(([key, info]) => (
                      <option key={key} value={key}>{info.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {selectedType && selectedType.fee_amount > 0 && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">
                      Filing Fee: {formatFilingFee(selectedType.fee_amount)}
                    </p>
                    {selectedType.fee_waiver_eligible && (
                      <label className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          checked={feeWaiverRequested}
                          onChange={e => setFeeWaiverRequested(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-yellow-800">Request fee waiver</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {selectedType && selectedType.auto_deadlines && selectedType.auto_deadlines.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">Auto-Generated Deadlines:</p>
                  {selectedType.auto_deadlines.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{d.name}: {d.days} {d.is_working_days ? 'working' : 'calendar'} days</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Internal notes"
                />
              </div>
            </div>
          ) : (
            /* Confirm step */
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Filing</p>
                  <p className="text-sm font-medium text-gray-900">{filingName}</p>
                  {selectedType && (
                    <p className="text-xs text-gray-500 font-mono">{selectedType.filing_code}</p>
                  )}
                </div>
                {description && (
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm text-gray-700">{description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Method</p>
                    <p className="text-sm text-gray-700">{FILING_METHOD_INFO[filingMethod]?.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Priority</p>
                    <p className="text-sm text-gray-700 capitalize">{priority}</p>
                  </div>
                </div>
                {selectedType && selectedType.fee_amount > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">Fee</p>
                    <p className="text-sm text-gray-700">
                      {formatFilingFee(selectedType.fee_amount)}
                      {feeWaiverRequested && ' (waiver requested)'}
                    </p>
                  </div>
                )}
                {courtId && (
                  <div>
                    <p className="text-xs text-gray-500">Court</p>
                    <p className="text-sm text-gray-700">
                      {courts.find(c => c.id === courtId)?.court_name || 'Selected'}
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={step === 'type' ? onClose : () => setStep(step === 'confirm' ? 'details' : 'type')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {step === 'type' ? 'Cancel' : 'Back'}
          </button>
          {step === 'type' ? null : step === 'details' ? (
            <button
              onClick={() => {
                if (!filingName.trim()) {
                  setError('Filing name is required')
                  return
                }
                setError(null)
                setStep('confirm')
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Review
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Filing
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
