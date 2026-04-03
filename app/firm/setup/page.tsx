'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  CreditCard,
  Users,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import {
  FirmPlan,
  FirmMemberRole,
  FIRM_PLAN_INFO,
  FIRM_MEMBER_ROLE_INFO,
  CreateFirmRequest,
} from '@/types/firm'

const STEPS = [
  { label: 'Firm Details', icon: Building2 },
  { label: 'Choose Plan', icon: CreditCard },
  { label: 'Invite Team', icon: Users },
  { label: 'Complete', icon: CheckCircle },
]

interface InviteRow {
  email: string
  role: FirmMemberRole
}

export default function FirmSetupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  // Step 1: Firm details
  const [firmName, setFirmName] = useState('')
  const [firmAddress, setFirmAddress] = useState('')
  const [firmPhone, setFirmPhone] = useState('')
  const [firmEmail, setFirmEmail] = useState('')
  const [firmWebsite, setFirmWebsite] = useState('')

  // Step 2: Plan
  const [selectedPlan, setSelectedPlan] = useState<FirmPlan>('small')

  // Step 3: Invites
  const [invites, setInvites] = useState<InviteRow[]>([
    { email: '', role: 'attorney' },
  ])

  const canGoNext = () => {
    if (currentStep === 0) return firmName.trim().length > 0
    if (currentStep === 1) return !!selectedPlan
    return true
  }

  const addInviteRow = () => {
    setInvites([...invites, { email: '', role: 'attorney' }])
  }

  const removeInviteRow = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index))
  }

  const updateInvite = (index: number, field: keyof InviteRow, value: string) => {
    const updated = [...invites]
    updated[index] = { ...updated[index], [field]: value }
    setInvites(updated)
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Create firm
      const firmPayload: CreateFirmRequest = {
        name: firmName.trim(),
        address: firmAddress.trim() || undefined,
        phone: firmPhone.trim() || undefined,
        email: firmEmail.trim() || undefined,
        website: firmWebsite.trim() || undefined,
        plan: selectedPlan,
      }

      const firmRes = await authFetch('/api/firms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firmPayload),
      })

      if (!firmRes.ok) {
        const err = await firmRes.json()
        throw new Error(err.error || 'Failed to create firm')
      }

      // Send invites (skip empty emails)
      const validInvites = invites.filter(i => i.email.trim())
      for (const invite of validInvites) {
        await authFetch('/api/firms/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: invite.email.trim(),
            role: invite.role,
          }),
        })
      }

      setIsComplete(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (currentStep === 3) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => prev - 1)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Set Up Your Firm</h1>
          <p className="mt-2 text-gray-600">
            Create your firm profile and invite your team
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-10">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isDone = index < currentStep || isComplete
            const isCurrent = index === currentStep && !isComplete

            return (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isDone
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isDone || isCurrent ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-2 mt-[-1rem] ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Firm Details */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Firm Details</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firm Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Smith & Associates"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={firmAddress}
                  onChange={(e) => setFirmAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123 Main St, Suite 100, City, State"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={firmPhone}
                    onChange={(e) => setFirmPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={firmEmail}
                    onChange={(e) => setFirmEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="info@firm.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={firmWebsite}
                  onChange={(e) => setFirmWebsite(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://www.firm.com"
                />
              </div>
            </div>
          )}

          {/* Step 2: Choose Plan */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Choose Your Plan</h2>
              <div className="grid grid-cols-2 gap-4">
                {(Object.entries(FIRM_PLAN_INFO) as [FirmPlan, typeof FIRM_PLAN_INFO[FirmPlan]][]).map(
                  ([plan, info]) => (
                    <button
                      key={plan}
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-6 rounded-xl border-2 text-left transition-all ${
                        selectedPlan === plan
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h3 className="text-lg font-semibold text-gray-900">{info.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{info.description}</p>
                      <p className="mt-4 text-2xl font-bold text-gray-900">
                        {info.price === 0 ? 'Free' : `$${info.price}`}
                        {info.price > 0 && (
                          <span className="text-sm font-normal text-gray-500">/mo</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {info.maxMembers === Infinity
                          ? 'Unlimited members'
                          : `Up to ${info.maxMembers} member${info.maxMembers === 1 ? '' : 's'}`}
                      </p>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Step 3: Invite Team */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Invite Team Members</h2>
              <p className="text-sm text-gray-600">
                Invite your team now or skip this step and add members later.
              </p>
              <div className="space-y-3">
                {invites.map((invite, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="email"
                      value={invite.email}
                      onChange={(e) => updateInvite(index, 'email', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="team@member.com"
                    />
                    <select
                      value={invite.role}
                      onChange={(e) =>
                        updateInvite(index, 'role', e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {(
                        Object.entries(FIRM_MEMBER_ROLE_INFO) as [
                          FirmMemberRole,
                          typeof FIRM_MEMBER_ROLE_INFO[FirmMemberRole]
                        ][]
                      )
                        .filter(([role]) => role !== 'owner')
                        .map(([role, info]) => (
                          <option key={role} value={role}>
                            {info.label}
                          </option>
                        ))}
                    </select>
                    {invites.length > 1 && (
                      <button
                        onClick={() => removeInviteRow(index)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addInviteRow}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add another
              </button>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 3 && !isComplete && (
            <div className="text-center py-8">
              <Building2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Ready to Create Your Firm</h2>
              <p className="text-gray-600 mt-2">
                Review your details and click &ldquo;Create Firm&rdquo; to get started.
              </p>
              <div className="mt-6 text-left bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Firm Name:</span>
                    <span className="font-medium">{firmName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan:</span>
                    <span className="font-medium">{FIRM_PLAN_INFO[selectedPlan].label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Team Invites:</span>
                    <span className="font-medium">
                      {invites.filter(i => i.email.trim()).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success state */}
          {isComplete && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Firm Created Successfully!</h2>
              <p className="text-gray-600 mt-2">
                Your firm is ready. You can manage your team from the dashboard.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Navigation */}
          {!isComplete && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              {currentStep > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={handleNext}
                disabled={!canGoNext() || isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : currentStep === 3 ? (
                  'Create Firm'
                ) : currentStep === 2 ? (
                  <>
                    Review
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
