'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Heart,
  Users,
  DollarSign,
  Scale,
  Send,
  Loader2,
  Eye,
  AlertCircle,
  MessageSquare,
  Shield,
} from 'lucide-react'
import {
  IntakeWithReview,
  ConflictCheck,
  CasePreview,
  COMPLEXITY_CONFIG,
  getComplexityLevel,
} from '@/types/intake-workflow'
import { IntakeData, STEP_LABELS } from '@/types/intake'
import { DocumentChecklist as DocumentChecklistType } from '@/types/intake-documents'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface IntakeReviewProps {
  intakeId: string
}

export default function IntakeReview({ intakeId }: IntakeReviewProps) {
  const router = useRouter()
  const [intake, setIntake] = useState<IntakeWithReview | null>(null)
  const [documents, setDocuments] = useState<DocumentChecklistType | null>(null)
  const [conflictCheck, setConflictCheck] = useState<ConflictCheck | null>(null)
  const [casePreview, setCasePreview] = useState<CasePreview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'intake' | 'documents' | 'preview'>('intake')
  const [activeSection, setActiveSection] = useState(1)

  // Action states
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRequestingInfo, setIsRequestingInfo] = useState(false)
  const [showInfoRequestModal, setShowInfoRequestModal] = useState(false)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [infoRequestMessage, setInfoRequestMessage] = useState('')
  const [conflictWaiverNotes, setConflictWaiverNotes] = useState('')

  useEffect(() => {
    fetchData()
  }, [intakeId])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch intake
      const intakeRes = await authFetch(`/api/intakes/${intakeId}`)
      if (intakeRes.ok) {
        const data = await intakeRes.json()
        setIntake(data.intake)

        // Generate case preview
        generateCasePreview(data.intake)
      }

      // Fetch documents
      const docsRes = await authFetch(`/api/intakes/${intakeId}/documents`)
      if (docsRes.ok) {
        const data = await docsRes.json()
        setDocuments(data.checklist)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateCasePreview = (intakeData: IntakeWithReview) => {
    const data = intakeData.intake_data as IntakeData
    const personal = data.personal
    const financial = data.financial

    const totalAssets =
      (financial?.estimatedRealEstateValue ?? 0) +
      (financial?.bankAccountsValue ?? 0) +
      (financial?.retirementAccountsValue ?? 0) +
      (financial?.investmentAccountsValue ?? 0) +
      (financial?.vehiclesValue ?? 0)

    const totalDebts =
      (financial?.mortgageBalance ?? 0) +
      (financial?.vehicleLoansBalance ?? 0) +
      (financial?.creditCardBalance ?? 0) +
      (financial?.studentLoansBalance ?? 0)

    const preview: CasePreview = {
      case_number: `${new Date().getFullYear()}-XXXXX`,
      client_name: `${personal?.firstName || ''} ${personal?.lastName || ''}`,
      spouse_name: `${personal?.spouseFirstName || ''} ${personal?.spouseLastName || ''}`,
      case_type: totalAssets > 500000 ? 'High-Asset Divorce' : 'Standard Divorce',
      state_code: data.marriage?.placeOfMarriage?.state || 'CA',
      estimated_timeline: [
        { title: 'Case Opened', estimated_date: new Date().toISOString(), is_milestone: true, category: 'case' },
        { title: 'Initial Consultation', estimated_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), is_milestone: false, category: 'meeting' },
        { title: 'File Petition', estimated_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), is_milestone: true, category: 'filing' },
      ],
      financial_overview: {
        estimated_assets: totalAssets,
        estimated_debts: totalDebts,
        income_difference: Math.abs((financial?.clientAnnualIncome ?? 0) - (financial?.spouseAnnualIncome ?? 0)),
      },
      initial_tasks: [],
      complexity: getComplexityLevel(intakeData.ai_analysis?.complexity_score || 5),
    }

    setCasePreview(preview)
  }

  const runConflictCheck = async () => {
    setIsCheckingConflicts(true)
    try {
      const response = await authFetch(`/api/intakes/${intakeId}/conflict-check`, {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        setConflictCheck(data.conflict_check)
        if (data.has_conflicts) {
          setShowConflictModal(true)
        }
      }
    } catch (error) {
      console.error('Conflict check error:', error)
    } finally {
      setIsCheckingConflicts(false)
    }
  }

  const handleRequestInfo = async () => {
    if (!infoRequestMessage) return

    setIsRequestingInfo(true)
    try {
      const response = await authFetch(`/api/intakes/${intakeId}/request-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: infoRequestMessage }),
      })
      if (response.ok) {
        setShowInfoRequestModal(false)
        router.push('/attorney/intakes')
      }
    } catch (error) {
      console.error('Request info error:', error)
    } finally {
      setIsRequestingInfo(false)
    }
  }

  const handleApprove = async () => {
    // First run conflict check if not done
    if (!conflictCheck) {
      await runConflictCheck()
      return
    }

    // If conflicts exist and not cleared, show modal
    if (conflictCheck.has_conflicts && !conflictCheck.conflict_cleared) {
      setShowConflictModal(true)
      return
    }

    setIsApproving(true)
    try {
      const response = await authFetch(`/api/intakes/${intakeId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflict_cleared: conflictCheck?.conflict_cleared,
          conflict_waiver_notes: conflictWaiverNotes,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        router.push(`/dashboard/cases/${data.case.id}`)
      }
    } catch (error) {
      console.error('Approve error:', error)
    } finally {
      setIsApproving(false)
    }
  }

  const clearConflicts = async () => {
    if (!conflictWaiverNotes) return

    try {
      const response = await authFetch(`/api/intakes/${intakeId}/conflict-check`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waiver_notes: conflictWaiverNotes }),
      })
      if (response.ok) {
        const data = await response.json()
        setConflictCheck(data.conflict_check)
        setShowConflictModal(false)
      }
    } catch (error) {
      console.error('Clear conflicts error:', error)
    }
  }

  if (isLoading || !intake) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const intakeData = intake.intake_data as IntakeData
  const complexity = getComplexityLevel(intake.ai_analysis?.complexity_score || 5)
  const complexityConfig = COMPLEXITY_CONFIG[complexity]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/attorney/intakes')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Review Intake: {intakeData.personal?.firstName} {intakeData.personal?.lastName}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${complexityConfig.color}`}>
                    {complexityConfig.label}
                  </span>
                  {intake.ai_analysis?.flags && intake.ai_analysis.flags.length > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      {intake.ai_analysis.flags.length} flags
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInfoRequestModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
              >
                <MessageSquare className="w-4 h-4" />
                Request Info
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving || isCheckingConflicts}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
              >
                {isApproving || isCheckingConflicts ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {isCheckingConflicts ? 'Checking Conflicts...' : 'Approve & Create Case'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            {(['intake', 'documents', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'intake' && 'Questionnaire'}
                {tab === 'documents' && `Documents (${documents?.uploadedRequired || 0}/${documents?.totalRequired || 0})`}
                {tab === 'preview' && 'Case Preview'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* AI Analysis Summary */}
        {intake.ai_analysis && (
          <div className="bg-white rounded-lg border p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              AI Analysis Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Complexity Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {intake.ai_analysis.complexity_score}/10
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Flags</p>
                <div className="flex flex-wrap gap-1">
                  {intake.ai_analysis.flags?.slice(0, 5).map((flag, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded ${
                        flag.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        flag.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {flag.type.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Recommendations</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {intake.ai_analysis.recommendations?.slice(0, 3).map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'intake' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Section Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border p-4 sticky top-32">
                <h3 className="font-semibold text-gray-900 mb-3">Sections</h3>
                <nav className="space-y-1">
                  {[1, 2, 3, 4, 5].map((step) => {
                    const icons = [User, Heart, Users, DollarSign, Scale]
                    const Icon = icons[step - 1]
                    return (
                      <button
                        key={step}
                        onClick={() => setActiveSection(step)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left ${
                          activeSection === step
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {STEP_LABELS[step]}
                      </button>
                    )
                  })}
                </nav>
              </div>
            </div>

            {/* Section Content */}
            <div className="lg:col-span-3">
              <IntakeSection
                section={activeSection}
                data={intakeData}
                flags={intake.ai_analysis?.flags || []}
              />
            </div>
          </div>
        )}

        {activeTab === 'documents' && documents && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
            <div className="space-y-4">
              {[...documents.required, ...documents.recommended].map((doc) => (
                <div key={doc.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.config.name}</p>
                      <p className="text-sm text-gray-500">{doc.config.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.status === 'verified' && (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Verified
                      </span>
                    )}
                    {doc.status === 'uploaded' && (
                      <span className="flex items-center gap-1 text-blue-600 text-sm">
                        <Eye className="w-4 h-4" />
                        Uploaded
                      </span>
                    )}
                    {doc.status === 'pending' && (
                      <span className="text-gray-500 text-sm">Pending</span>
                    )}
                    {doc.status === 'rejected' && (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" />
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'preview' && casePreview && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Case Preview</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Case Number</p>
                  <p className="text-lg font-medium text-gray-900">{casePreview.case_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Case Type</p>
                  <p className="text-lg font-medium text-gray-900">{casePreview.case_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="text-lg font-medium text-gray-900">{casePreview.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Spouse</p>
                  <p className="text-lg font-medium text-gray-900">{casePreview.spouse_name}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Financial Overview</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Estimated Assets</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${casePreview.financial_overview.estimated_assets.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estimated Debts</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${casePreview.financial_overview.estimated_debts.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Income Difference</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${casePreview.financial_overview.income_difference.toLocaleString()}/yr
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Request Modal */}
      {showInfoRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request More Information</h3>
            <textarea
              value={infoRequestMessage}
              onChange={(e) => setInfoRequestMessage(e.target.value)}
              placeholder="Explain what additional information you need from the client..."
              className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowInfoRequestModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestInfo}
                disabled={!infoRequestMessage || isRequestingInfo}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isRequestingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Modal */}
      {showConflictModal && conflictCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900">Potential Conflicts Found</h3>
            </div>

            <div className="space-y-3 mb-4">
              {conflictCheck.potential_conflicts.map((conflict, i) => (
                <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800">{conflict.description}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Please document conflict waiver or reject the intake if a true conflict exists.
            </p>

            <textarea
              value={conflictWaiverNotes}
              onChange={(e) => setConflictWaiverNotes(e.target.value)}
              placeholder="Enter conflict waiver documentation..."
              className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConflictModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={clearConflicts}
                disabled={!conflictWaiverNotes}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-amber-400"
              >
                Clear Conflicts & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Intake Section Component
function IntakeSection({
  section,
  data,
  flags,
}: {
  section: number
  data: IntakeData
  flags: Array<{ type: string; severity: string; description: string; field?: string }>
}) {
  const renderField = (label: string, value: unknown, fieldPath?: string) => {
    const hasFlag = fieldPath && flags.some(f => f.field === fieldPath)
    return (
      <div className={`p-3 rounded-lg ${hasFlag ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="font-medium text-gray-900">
          {value === undefined || value === null || value === ''
            ? <span className="text-gray-400 italic">Not provided</span>
            : String(value)}
        </p>
        {hasFlag && (
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ {flags.find(f => f.field === fieldPath)?.description}
          </p>
        )}
      </div>
    )
  }

  if (section === 1) {
    const personal = data.personal
    return (
      <div className="bg-white rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold text-gray-900">Personal Information</h3>
        <div className="grid grid-cols-2 gap-4">
          {renderField('First Name', personal?.firstName)}
          {renderField('Last Name', personal?.lastName)}
          {renderField('Date of Birth', personal?.dateOfBirth)}
          {renderField('Email', personal?.email)}
          {renderField('Phone', personal?.phone)}
        </div>
        <h4 className="font-medium text-gray-900 mt-6">Spouse Information</h4>
        <div className="grid grid-cols-2 gap-4">
          {renderField('Spouse First Name', personal?.spouseFirstName)}
          {renderField('Spouse Last Name', personal?.spouseLastName)}
          {renderField('Spouse Email', personal?.spouseEmail)}
          {renderField('Spouse Phone', personal?.spousePhone)}
        </div>
      </div>
    )
  }

  if (section === 2) {
    const marriage = data.marriage
    return (
      <div className="bg-white rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold text-gray-900">Marriage Details</h3>
        <div className="grid grid-cols-2 gap-4">
          {renderField('Date of Marriage', marriage?.dateOfMarriage)}
          {renderField('Date of Separation', marriage?.dateOfSeparation)}
          {renderField('Currently Living Together', marriage?.currentlyLivingTogether ? 'Yes' : 'No')}
          {renderField('Has Prenup', marriage?.hasPrenup ? 'Yes' : 'No')}
        </div>
        {marriage?.domesticViolenceHistory && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-medium text-red-800">⚠️ Domestic Violence History Reported</p>
            <p className="text-sm text-red-700 mt-1">{marriage.domesticViolenceDetails}</p>
          </div>
        )}
      </div>
    )
  }

  if (section === 3) {
    const children = data.children
    return (
      <div className="bg-white rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold text-gray-900">Children & Custody</h3>
        {renderField('Has Minor Children', children?.hasMinorChildren ? 'Yes' : 'No')}
        {children?.hasMinorChildren && children.children && (
          <div className="space-y-4">
            {children.children.map((child, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{child.firstName} {child.lastName}</p>
                <p className="text-sm text-gray-600">Age: {child.age}</p>
              </div>
            ))}
          </div>
        )}
        {renderField('Preferred Custody', children?.preferredCustodyArrangement)}
      </div>
    )
  }

  if (section === 4) {
    const financial = data.financial
    return (
      <div className="bg-white rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold text-gray-900">Financial Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          {renderField('Client Employment', financial?.clientEmploymentStatus)}
          {renderField('Client Annual Income', financial?.clientAnnualIncome ? `$${financial.clientAnnualIncome.toLocaleString()}` : undefined)}
          {renderField('Spouse Employment', financial?.spouseEmploymentStatus)}
          {renderField('Spouse Annual Income', financial?.spouseAnnualIncome ? `$${financial.spouseAnnualIncome.toLocaleString()}` : undefined)}
        </div>
        <h4 className="font-medium text-gray-900">Assets</h4>
        <div className="grid grid-cols-2 gap-4">
          {renderField('Real Estate Value', financial?.estimatedRealEstateValue ? `$${financial.estimatedRealEstateValue.toLocaleString()}` : undefined)}
          {renderField('Bank Accounts', financial?.bankAccountsValue ? `$${financial.bankAccountsValue.toLocaleString()}` : undefined)}
          {renderField('Retirement Accounts', financial?.retirementAccountsValue ? `$${financial.retirementAccountsValue.toLocaleString()}` : undefined)}
        </div>
      </div>
    )
  }

  if (section === 5) {
    const legal = data.legalGoals
    return (
      <div className="bg-white rounded-lg border p-6 space-y-6">
        <h3 className="font-semibold text-gray-900">Legal Goals</h3>
        {renderField('Preferred Approach', legal?.preferredApproach)}
        {renderField('Urgency Level', legal?.urgencyLevel)}
        {renderField('Seeking Spousal Support', legal?.spousalSupportSeeking ? 'Yes' : 'No')}
        {legal?.primaryGoals && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Primary Goals</p>
            <div className="flex flex-wrap gap-2">
              {legal.primaryGoals.map((goal, i) => (
                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded">
                  {goal}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
