'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft, FileText, Clock, CheckCircle2,
  AlertTriangle, Loader2, Calendar, DollarSign,
  MapPin, ExternalLink, XCircle, Send,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import {
  FILING_STATUS_INFO,
  FILING_CATEGORY_INFO,
  FILING_METHOD_INFO,
  DEADLINE_STATUS_INFO,
  DEADLINE_PRIORITY_INFO,
  formatFilingFee,
  formatDeadlineCountdown,
  getDeadlineUrgency,
  getDeadlineUrgencyColor,
  type FilingStatus,
  type CaseFiling,
  type FilingDeadline,
  type ServiceRecord,
  type FilingDocument,
  type Court,
  type FilingType,
} from '@/types/filings'
import ServiceRecordForm from './ServiceRecordForm'
import EFilingSubmitModal from './EFilingSubmitModal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface FilingDetailData extends Omit<CaseFiling, 'filing_type' | 'court' | 'documents' | 'service_records' | 'deadlines'> {
  filing_type: FilingType | null
  court: Court | null
  documents: FilingDocument[]
  service_records: ServiceRecord[]
  deadlines: FilingDeadline[]
}

interface Props {
  caseId: string
  filingId: string
  spouseName?: string
  onBack: () => void
}

type TabKey = 'overview' | 'deadlines' | 'service' | 'documents'

export default function FilingDetail({ caseId, filingId, spouseName, onBack }: Props) {
  const [filing, setFiling] = useState<FilingDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [updating, setUpdating] = useState(false)
  const [showEFileModal, setShowEFileModal] = useState(false)
  const [firmId, setFirmId] = useState<string | null>(null)

  async function loadFiling() {
    try {
      const res = await fetch(`/api/cases/${caseId}/filings/${filingId}`)
      if (res.ok) {
        const json = await res.json()
        setFiling(json.data)
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiling()
    // Fetch firm ID for e-filing
    async function loadFirmId() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('current_firm_id')
            .eq('id', user.id)
            .single()
          if (data?.current_firm_id) setFirmId(data.current_firm_id)
        }
      } catch {
        // Ignore
      }
    }
    loadFirmId()
  }, [caseId, filingId])

  async function updateStatus(newStatus: FilingStatus) {
    if (!filing) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/filings/${filingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        await loadFiling()
      }
    } catch {
      // Ignore
    } finally {
      setUpdating(false)
    }
  }

  async function completeDeadline(deadlineId: string) {
    try {
      await fetch(`/api/cases/${caseId}/filings/${filingId}/deadlines`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline_id: deadlineId, action: 'complete' }),
      })
      await loadFiling()
    } catch {
      // Ignore
    }
  }

  async function waiveDeadline(deadlineId: string) {
    try {
      await fetch(`/api/cases/${caseId}/filings/${filingId}/deadlines`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline_id: deadlineId, action: 'waive' }),
      })
      await loadFiling()
    } catch {
      // Ignore
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!filing) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Filing not found.</p>
        <button onClick={onBack} className="text-blue-600 hover:underline mt-2 text-sm">
          Back to filings
        </button>
      </div>
    )
  }

  const statusInfo = FILING_STATUS_INFO[filing.status as FilingStatus]
  const categoryInfo = FILING_CATEGORY_INFO[filing.category as keyof typeof FILING_CATEGORY_INFO]

  // Status transition actions
  const statusActions: Record<string, { label: string; next: FilingStatus; color: string }[]> = {
    draft: [
      { label: 'Mark Ready to File', next: 'ready', color: 'bg-blue-600 hover:bg-blue-700' },
    ],
    ready: [
      { label: 'Mark as Filed', next: 'filed', color: 'bg-purple-600 hover:bg-purple-700' },
      { label: 'Back to Draft', next: 'draft', color: 'bg-gray-500 hover:bg-gray-600' },
    ],
    filed: [
      { label: 'Mark as Served', next: 'served', color: 'bg-indigo-600 hover:bg-indigo-700' },
      { label: 'Mark Completed', next: 'completed', color: 'bg-green-600 hover:bg-green-700' },
      { label: 'Mark Rejected', next: 'rejected', color: 'bg-red-600 hover:bg-red-700' },
    ],
    served: [
      { label: 'Mark Completed', next: 'completed', color: 'bg-green-600 hover:bg-green-700' },
    ],
    rejected: [
      { label: 'Back to Draft', next: 'draft', color: 'bg-gray-500 hover:bg-gray-600' },
    ],
    withdrawn: [],
    completed: [],
  }

  const actions = statusActions[filing.status] || []
  const overdueDeadlines = (filing.deadlines || []).filter(
    d => d.status === 'upcoming' && new Date(d.deadline_date) < new Date()
  )

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'deadlines', label: `Deadlines (${filing.deadlines?.length || 0})` },
    { key: 'service', label: `Service (${filing.service_records?.length || 0})` },
    { key: 'documents', label: `Documents (${filing.documents?.length || 0})` },
  ]

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" /> Back to filings
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">{filing.filing_name}</h2>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                {statusInfo?.label || filing.status}
              </span>
            </div>
            {filing.filing_code && (
              <p className="text-sm text-gray-500 font-mono mt-0.5">{filing.filing_code}</p>
            )}
            {filing.description && (
              <p className="text-sm text-gray-600 mt-2">{filing.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* E-File button when ready and court supports e-filing */}
            {filing.status === 'ready' && filing.court?.efiling_enabled && firmId && (
              <button
                onClick={() => setShowEFileModal(true)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> E-File
              </button>
            )}
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => updateStatus(action.next)}
                disabled={updating}
                className={`px-3 py-1.5 text-white rounded-lg text-sm font-medium ${action.color} disabled:opacity-50`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overdue warning */}
        {overdueDeadlines.length > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">
              {overdueDeadlines.length} overdue deadline{overdueDeadlines.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Rejection reason */}
        {filing.status === 'rejected' && filing.rejection_reason && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
            <p className="text-sm text-red-700 mt-1">{filing.rejection_reason}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Filing Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Filing Details</h3>
            <InfoRow label="Category" value={categoryInfo?.label || filing.category} />
            <InfoRow label="Method" value={FILING_METHOD_INFO[filing.filing_method as keyof typeof FILING_METHOD_INFO]?.label || filing.filing_method} />
            <InfoRow label="Case Number" value={filing.case_number || 'Not assigned'} />
            {filing.filing_number && <InfoRow label="Filing Number" value={filing.filing_number} />}
            {filing.confirmation_number && <InfoRow label="Confirmation #" value={filing.confirmation_number} />}
            <InfoRow label="Created" value={new Date(filing.created_at).toLocaleDateString()} />
            {filing.filed_date && (
              <InfoRow label="Filed" value={new Date(filing.filed_date).toLocaleDateString()} />
            )}
          </div>

          {/* Fee & Court */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Fees
              </h3>
              <InfoRow label="Filing Fee" value={formatFilingFee(filing.filing_fee)} />
              <InfoRow label="Fee Paid" value={filing.fee_paid ? 'Yes' : 'No'} />
              {filing.fee_waiver_requested && (
                <InfoRow
                  label="Fee Waiver"
                  value={filing.fee_waiver_granted === true ? 'Granted' : filing.fee_waiver_granted === false ? 'Denied' : 'Requested'}
                />
              )}
            </div>

            {filing.court && (
              <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Court
                </h3>
                <p className="text-sm text-gray-900">{filing.court.court_name}</p>
                {filing.court.address && (
                  <p className="text-xs text-gray-500">{filing.court.address}, {filing.court.city} {filing.court.zip}</p>
                )}
                {filing.court.phone && (
                  <p className="text-xs text-gray-500">{filing.court.phone}</p>
                )}
                {filing.court.filing_hours && (
                  <p className="text-xs text-gray-500">Hours: {filing.court.filing_hours}</p>
                )}
                {filing.court.efiling_enabled && filing.court.efiling_url && (
                  <a
                    href={filing.court.efiling_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> E-Filing Portal
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Hearing Info */}
          {filing.hearing_date && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Hearing
              </h3>
              <InfoRow label="Date" value={new Date(filing.hearing_date).toLocaleString()} />
              {filing.hearing_location && <InfoRow label="Location" value={filing.hearing_location} />}
              {filing.hearing_notes && <InfoRow label="Notes" value={filing.hearing_notes} />}
            </div>
          )}

          {/* Notes */}
          {filing.notes && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{filing.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'deadlines' && (
        <div className="space-y-3">
          {(filing.deadlines || []).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No deadlines for this filing.</p>
            </div>
          ) : (
            (filing.deadlines || []).map(deadline => {
              const statusInfo = DEADLINE_STATUS_INFO[deadline.status as keyof typeof DEADLINE_STATUS_INFO]
              const priorityInfo = DEADLINE_PRIORITY_INFO[deadline.priority as keyof typeof DEADLINE_PRIORITY_INFO]
              const urgency = deadline.status === 'upcoming' ? getDeadlineUrgency(deadline.deadline_date) : 'normal'
              const urgencyColor = getDeadlineUrgencyColor(urgency)

              return (
                <div
                  key={deadline.id}
                  className={`p-4 rounded-lg border ${
                    deadline.status === 'completed' || deadline.status === 'waived'
                      ? 'bg-gray-50 border-gray-200'
                      : urgencyColor
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {deadline.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                      ) : deadline.status === 'waived' ? (
                        <XCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                      ) : urgency === 'overdue' ? (
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${
                          deadline.status === 'completed' || deadline.status === 'waived'
                            ? 'text-gray-500 line-through'
                            : 'text-gray-900'
                        }`}>
                          {deadline.deadline_name}
                        </p>
                        {deadline.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{deadline.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {new Date(deadline.deadline_date).toLocaleDateString()}
                          </span>
                          {deadline.status === 'upcoming' && (
                            <span className={`text-xs font-medium ${
                              urgency === 'overdue' ? 'text-red-600' :
                              urgency === 'critical' ? 'text-orange-600' :
                              urgency === 'soon' ? 'text-yellow-600' :
                              'text-gray-500'
                            }`}>
                              {formatDeadlineCountdown(deadline.deadline_date)}
                            </span>
                          )}
                          {deadline.original_date && (
                            <span className="text-xs text-gray-400 line-through">
                              Originally: {new Date(deadline.original_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityInfo?.color || ''}`}>
                        {priorityInfo?.label}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo?.color || ''}`}>
                        {statusInfo?.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions for upcoming deadlines */}
                  {(deadline.status === 'upcoming' || deadline.status === 'extended') && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => completeDeadline(deadline.id)}
                        className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                      >
                        Mark Complete
                      </button>
                      <button
                        onClick={() => waiveDeadline(deadline.id)}
                        className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                      >
                        Waive
                      </button>
                    </div>
                  )}

                  {deadline.calculation_rule && (
                    <p className="text-xs text-gray-400 mt-2 italic">{deadline.calculation_rule}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'service' && (
        <ServiceRecordForm
          caseId={caseId}
          filingId={filingId}
          spouseName={spouseName}
          existingRecords={filing.service_records || []}
          onCreated={loadFiling}
        />
      )}

      {activeTab === 'documents' && (
        <div className="space-y-3">
          {(filing.documents || []).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No documents attached to this filing.</p>
            </div>
          ) : (
            (filing.documents || []).map(doc => (
              <div key={doc.id} className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.document_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{doc.document_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.is_conformed && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Conformed</span>
                  )}
                  {doc.page_count && (
                    <span className="text-xs text-gray-400">{doc.page_count} pages</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* E-Filing Submit Modal */}
      {showEFileModal && firmId && filing.court && (
        <EFilingSubmitModal
          caseId={caseId}
          filingId={filingId}
          filingName={filing.filing_name}
          firmId={firmId}
          stateCode={filing.court.state_code}
          onClose={() => setShowEFileModal(false)}
          onSubmitted={() => {
            setShowEFileModal(false)
            loadFiling()
          }}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  )
}
