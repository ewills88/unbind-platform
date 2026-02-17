'use client'

import { useState, useEffect } from 'react'
import {
  X, Send, Loader2, ChevronRight, ChevronLeft,
  AlertTriangle, DollarSign, FileText, CheckCircle2,
  Info, Lock,
} from 'lucide-react'
import {
  EFILING_PROVIDER_INFO,
  formatEFilingFee,
  type EFilingPaymentAccount,
} from '@/types/efiling'

interface Props {
  caseId: string
  filingId: string
  filingName: string
  firmId: string
  stateCode: string
  onClose: () => void
  onSubmitted: () => void
}

interface FilingCodeOption {
  code: string
  name: string
  description?: string
  fee?: number
  efiling_code?: string
  efiling_description?: string
}

interface CourtOption {
  id: string
  court_name: string
  county: string
  efiling_enabled: boolean
  efiling_provider: string | null
}

interface CredentialInfo {
  id: string
  provider: string
  display_name: string | null
  is_active: boolean
  last_verified_at: string | null
  last_error: string | null
  payment_accounts: EFilingPaymentAccount[]
}

export default function EFilingSubmitModal({
  caseId, filingId, filingName, firmId, stateCode, onClose, onSubmitted
}: Props) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data
  const [credentials, setCredentials] = useState<CredentialInfo[]>([])
  const [courts, setCourts] = useState<CourtOption[]>([])
  const [filingCodes, setFilingCodes] = useState<FilingCodeOption[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [courtLocationCode, setCourtLocationCode] = useState('')
  const [caseNumber, setCaseNumber] = useState('')
  const [filingCode, setFilingCode] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')

  const activeCredential = credentials.find(c => c.is_active)
  const paymentAccounts = activeCredential?.payment_accounts || []

  // Load initial data
  useEffect(() => {
    async function load() {
      try {
        const [credsRes, courtsRes] = await Promise.all([
          fetch(`/api/efiling/credentials?firm_id=${firmId}`),
          fetch(`/api/courts?state_code=${stateCode}`),
        ])

        if (credsRes.ok) {
          const json = await credsRes.json()
          setCredentials(json.data || [])
          // Auto-select default payment account
          const active = (json.data || []).find((c: CredentialInfo) => c.is_active)
          if (active?.payment_accounts?.length > 0) {
            const defaultAcc = active.payment_accounts.find((a: EFilingPaymentAccount) => a.is_default)
            if (defaultAcc) setPaymentAccountId(defaultAcc.account_id_at_provider)
          }
        }
        if (courtsRes.ok) {
          const json = await courtsRes.json()
          setCourts((json.data || []).filter((c: CourtOption) => c.efiling_enabled))
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [firmId, stateCode])

  // Load filing codes when court selected
  useEffect(() => {
    if (!courtLocationCode || !firmId) return

    async function loadCodes() {
      try {
        const res = await fetch(
          `/api/efiling/codes?firm_id=${firmId}&court_location_code=${courtLocationCode}&type=filing`
        )
        if (res.ok) {
          const json = await res.json()
          setFilingCodes(json.data || [])
        }
      } catch {
        // Ignore
      }
    }
    loadCodes()
  }, [courtLocationCode, firmId])

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/efiling/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filing_id: filingId,
          court_location_code: courtLocationCode,
          case_number: caseNumber || null,
          filing_code: filingCode,
          payment_account_id: paymentAccountId,
          documents: [],
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to submit filing')
        return
      }

      onSubmitted()
    } catch {
      setError('Failed to submit filing')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
        </div>
      </div>
    )
  }

  // No credentials configured
  if (!activeCredential) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">E-Filing Not Configured</h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">No E-Filing Credentials</p>
              <p className="text-xs text-yellow-700 mt-1">
                E-filing credentials haven&apos;t been set up for your firm.
                Configure them in Settings &gt; Integrations.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" /> Submit E-Filing
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{filingName} &middot; Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2 px-6 py-3 bg-gray-50">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-blue-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1: Court & Filing Code */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-blue-700">
                  Using {activeCredential.display_name || EFILING_PROVIDER_INFO[activeCredential.provider as keyof typeof EFILING_PROVIDER_INFO]?.label || activeCredential.provider}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Court *</label>
                <select
                  value={courtLocationCode}
                  onChange={e => {
                    setCourtLocationCode(e.target.value)
                    setFilingCode('')
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select e-filing court...</option>
                  {courts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.court_name} — {c.county} County
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Number (if existing case)</label>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={e => setCaseNumber(e.target.value)}
                  placeholder="Enter court case number"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank for new case filings</p>
              </div>

              {courtLocationCode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filing Type *</label>
                  {filingCodes.length > 0 ? (
                    <select
                      value={filingCode}
                      onChange={e => setFilingCode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select filing type...</option>
                      {filingCodes.map(fc => (
                        <option key={fc.code || fc.efiling_code} value={fc.code || fc.efiling_code}>
                          {fc.name || fc.efiling_description} {fc.fee ? `($${fc.fee})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500">Loading filing codes...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Documents */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
              <p className="text-sm text-gray-500">
                Documents attached to this filing will be submitted electronically.
              </p>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{filingName}</p>
                    <p className="text-xs text-gray-500">Primary filing document</p>
                  </div>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Lead Document</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  All documents attached to this filing will be included in the submission.
                  The court will review and process all documents together.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Payment & Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Payment & Review</h3>

              {/* Payment account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Account *</label>
                <select
                  value={paymentAccountId}
                  onChange={e => setPaymentAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select payment method...</option>
                  {paymentAccounts.map(acc => (
                    <option key={acc.account_id_at_provider} value={acc.account_id_at_provider}>
                      {acc.account_name || acc.account_type}
                      {acc.last_four && ` (****${acc.last_four})`}
                      {acc.is_default ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filing summary */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Filing Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Filing:</span>
                    <p className="font-medium text-gray-900">{filingName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Court:</span>
                    <p className="font-medium text-gray-900">
                      {courts.find(c => c.id === courtLocationCode)?.court_name || courtLocationCode}
                    </p>
                  </div>
                  {caseNumber && (
                    <div>
                      <span className="text-gray-500">Case #:</span>
                      <p className="font-medium text-gray-900">{caseNumber}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Filing Code:</span>
                    <p className="font-medium text-gray-900 font-mono">{filingCode}</p>
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <Lock className="w-4 h-4 text-yellow-600 mt-0.5" />
                <p className="text-xs text-yellow-800">
                  By submitting, you authorize the filing fee to be charged to the selected payment method.
                  This action cannot be undone once processing begins.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {step > 1 && <ChevronLeft className="w-4 h-4" />}
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!courtLocationCode || !filingCode)}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !paymentAccountId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Filing
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
