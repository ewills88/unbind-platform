'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { authFetch } from '@/lib/supabase/auth-fetch'
import {
  ArrowLeft, ArrowRight, User, FileText, Users, DollarSign,
  Loader2, Check, Save,
} from 'lucide-react'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

const CASE_TYPES = [
  { value: 'divorce', label: 'Divorce' },
  { value: 'legal_separation', label: 'Legal Separation' },
  { value: 'annulment', label: 'Annulment' },
  { value: 'custody_modification', label: 'Custody Modification' },
  { value: 'support_modification', label: 'Support Modification' },
  { value: 'other', label: 'Other' },
]

const ASSET_RANGES = [
  { value: 'under_100k', label: 'Under $100k' },
  { value: '100k_500k', label: '$100k – $500k' },
  { value: '500k_1m', label: '$500k – $1M' },
  { value: 'over_1m', label: 'Over $1M' },
  { value: 'unknown', label: 'Unknown' },
]

const STEPS = [
  { label: 'Client Info', icon: User },
  { label: 'Case Details', icon: FileText },
  { label: 'Opposing Party', icon: Users },
  { label: 'Financial & Notes', icon: DollarSign },
]

interface IntakeFormData {
  client_first_name: string
  client_last_name: string
  client_email: string
  client_phone: string
  client_address: string
  date_of_birth: string
  preferred_contact: string
  case_type: string
  state_of_filing: string
  date_of_marriage: string
  date_of_separation: string
  has_children: boolean
  number_of_children: string
  children_ages: string
  opposing_first_name: string
  opposing_last_name: string
  has_opposing_attorney: boolean
  opposing_attorney_name: string
  opposing_attorney_firm: string
  owns_real_estate: boolean
  has_retirement_accounts: boolean
  has_business_interests: boolean
  estimated_assets: string
  client_annual_income: string
  opposing_annual_income: string
  referral_source: string
  consultation_date: string
  consultation_notes: string
  conflict_check_completed: boolean
  retainer_amount: string
}

const initialFormData: IntakeFormData = {
  client_first_name: '',
  client_last_name: '',
  client_email: '',
  client_phone: '',
  client_address: '',
  date_of_birth: '',
  preferred_contact: 'email',
  case_type: 'divorce',
  state_of_filing: 'CA',
  date_of_marriage: '',
  date_of_separation: '',
  has_children: false,
  number_of_children: '',
  children_ages: '',
  opposing_first_name: '',
  opposing_last_name: '',
  has_opposing_attorney: false,
  opposing_attorney_name: '',
  opposing_attorney_firm: '',
  owns_real_estate: false,
  has_retirement_accounts: false,
  has_business_interests: false,
  estimated_assets: 'unknown',
  client_annual_income: '',
  opposing_annual_income: '',
  referral_source: '',
  consultation_date: '',
  consultation_notes: '',
  conflict_check_completed: false,
  retainer_amount: '',
}

export default function NewIntakePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<IntakeFormData>(initialFormData)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (field: keyof IntakeFormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validateStep = (): boolean => {
    const errs: Record<string, string> = {}

    if (step === 0) {
      if (!form.client_first_name.trim()) errs.client_first_name = 'Required'
      if (!form.client_last_name.trim()) errs.client_last_name = 'Required'
      if (!form.client_email.trim()) errs.client_email = 'Required'
      else if (!/\S+@\S+\.\S+/.test(form.client_email)) errs.client_email = 'Invalid email'
      if (!form.client_phone.trim()) errs.client_phone = 'Required'
    }

    if (step === 1) {
      if (!form.case_type) errs.case_type = 'Required'
      if (!form.state_of_filing) errs.state_of_filing = 'Required'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const nextStep = () => {
    if (validateStep()) setStep(s => Math.min(s + 1, 3))
  }

  const prevStep = () => setStep(s => Math.max(s - 1, 0))

  const handleSave = async (convertToCase: boolean) => {
    if (!validateStep()) return
    setSaving(true)

    try {
      const payload = {
        ...form,
        number_of_children: form.number_of_children ? parseInt(form.number_of_children) : null,
        retainer_amount: form.retainer_amount ? parseFloat(form.retainer_amount) : null,
        date_of_birth: form.date_of_birth || null,
        date_of_marriage: form.date_of_marriage || null,
        date_of_separation: form.date_of_separation || null,
        consultation_date: form.consultation_date || null,
        status: convertToCase ? 'converted' : 'pending',
        convert_to_case: convertToCase,
      }

      const res = await authFetch('/api/dashboard/intakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save intake')
      }

      const data = await res.json()

      if (convertToCase && data.case_id) {
        router.push(`/dashboard/cases/${data.case_id}`)
      } else {
        router.push('/dashboard/intake')
      }
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = (field: string) =>
    `w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
      errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/dashboard/intake')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Intakes
            </button>
            <h1 className="text-2xl font-bold text-gray-900">New Client Intake</h1>
            <p className="mt-1 text-gray-500 text-sm">Capture client information to open a new case.</p>
          </div>

          {/* Step Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {STEPS.map((s, i) => {
                const Icon = s.icon
                const isActive = i === step
                const isDone = i < step

                return (
                  <button
                    key={s.label}
                    onClick={() => { if (i < step) setStep(i) }}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                      isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'
                    } ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isActive ? 'bg-blue-100 text-blue-600' :
                      isDone ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Error */}
          {errors._form && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors._form}
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {/* Step 1: Client Info */}
            {step === 0 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Client Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input type="text" value={form.client_first_name} onChange={e => update('client_first_name', e.target.value)} className={fieldClass('client_first_name')} placeholder="Jane" />
                    {errors.client_first_name && <p className="text-red-500 text-xs mt-1">{errors.client_first_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input type="text" value={form.client_last_name} onChange={e => update('client_last_name', e.target.value)} className={fieldClass('client_last_name')} placeholder="Smith" />
                    {errors.client_last_name && <p className="text-red-500 text-xs mt-1">{errors.client_last_name}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={form.client_email} onChange={e => update('client_email', e.target.value)} className={fieldClass('client_email')} placeholder="jane@email.com" />
                    {errors.client_email && <p className="text-red-500 text-xs mt-1">{errors.client_email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input type="tel" value={form.client_phone} onChange={e => update('client_phone', e.target.value)} className={fieldClass('client_phone')} placeholder="(555) 123-4567" />
                    {errors.client_phone && <p className="text-red-500 text-xs mt-1">{errors.client_phone}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input type="text" value={form.client_address} onChange={e => update('client_address', e.target.value)} className={fieldClass('client_address')} placeholder="123 Main St, City, State ZIP" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} className={fieldClass('date_of_birth')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact</label>
                    <div className="flex gap-4 pt-2">
                      {['email', 'phone', 'text'].map(method => (
                        <label key={method} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="preferred_contact" value={method} checked={form.preferred_contact === method} onChange={e => update('preferred_contact', e.target.value)} className="text-blue-600 focus:ring-blue-500" />
                          <span className="text-sm text-gray-700 capitalize">{method}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Case Details */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Case Details</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Case Type *</label>
                    <select value={form.case_type} onChange={e => update('case_type', e.target.value)} className={fieldClass('case_type')}>
                      {CASE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {errors.case_type && <p className="text-red-500 text-xs mt-1">{errors.case_type}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State of Filing *</label>
                    <select value={form.state_of_filing} onChange={e => update('state_of_filing', e.target.value)} className={fieldClass('state_of_filing')}>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.state_of_filing && <p className="text-red-500 text-xs mt-1">{errors.state_of_filing}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Marriage</label>
                    <input type="date" value={form.date_of_marriage} onChange={e => update('date_of_marriage', e.target.value)} className={fieldClass('date_of_marriage')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Separation</label>
                    <input type="date" value={form.date_of_separation} onChange={e => update('date_of_separation', e.target.value)} className={fieldClass('date_of_separation')} />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${form.has_children ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}>
                      <div className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
                    </div>
                    <input type="checkbox" checked={form.has_children} onChange={e => update('has_children', e.target.checked)} className="sr-only" />
                    <span className="text-sm font-medium text-gray-700">Has Minor Children?</span>
                  </label>
                </div>

                {form.has_children && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-blue-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of Children</label>
                      <input type="number" min="1" max="20" value={form.number_of_children} onChange={e => update('number_of_children', e.target.value)} className={fieldClass('number_of_children')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ages</label>
                      <input type="text" value={form.children_ages} onChange={e => update('children_ages', e.target.value)} className={fieldClass('children_ages')} placeholder="e.g. 8, 11, 14" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Opposing Party */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Opposing Party</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input type="text" value={form.opposing_first_name} onChange={e => update('opposing_first_name', e.target.value)} className={fieldClass('opposing_first_name')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input type="text" value={form.opposing_last_name} onChange={e => update('opposing_last_name', e.target.value)} className={fieldClass('opposing_last_name')} />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${form.has_opposing_attorney ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}>
                      <div className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
                    </div>
                    <input type="checkbox" checked={form.has_opposing_attorney} onChange={e => update('has_opposing_attorney', e.target.checked)} className="sr-only" />
                    <span className="text-sm font-medium text-gray-700">Do they have an attorney?</span>
                  </label>
                </div>

                {form.has_opposing_attorney && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-blue-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Attorney Name</label>
                      <input type="text" value={form.opposing_attorney_name} onChange={e => update('opposing_attorney_name', e.target.value)} className={fieldClass('opposing_attorney_name')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Attorney Firm</label>
                      <input type="text" value={form.opposing_attorney_firm} onChange={e => update('opposing_attorney_firm', e.target.value)} className={fieldClass('opposing_attorney_firm')} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Financial + Notes */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Financial Overview & Notes</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { field: 'owns_real_estate' as const, label: 'Owns Real Estate?' },
                    { field: 'has_retirement_accounts' as const, label: 'Retirement Accounts?' },
                    { field: 'has_business_interests' as const, label: 'Business Interests?' },
                  ].map(({ field, label }) => (
                    <label key={field} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={form[field] as boolean} onChange={e => update(field, e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Marital Assets</label>
                    <select value={form.estimated_assets} onChange={e => update('estimated_assets', e.target.value)} className={fieldClass('estimated_assets')}>
                      {ASSET_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Annual Income</label>
                    <input type="text" value={form.client_annual_income} onChange={e => update('client_annual_income', e.target.value)} className={fieldClass('client_annual_income')} placeholder="$75,000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opposing Annual Income</label>
                    <input type="text" value={form.opposing_annual_income} onChange={e => update('opposing_annual_income', e.target.value)} className={fieldClass('opposing_annual_income')} placeholder="$90,000" />
                  </div>
                </div>

                <hr className="border-gray-200" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Referral Source</label>
                    <input type="text" value={form.referral_source} onChange={e => update('referral_source', e.target.value)} className={fieldClass('referral_source')} placeholder="e.g. Google, referral from..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Date</label>
                    <input type="date" value={form.consultation_date} onChange={e => update('consultation_date', e.target.value)} className={fieldClass('consultation_date')} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Notes</label>
                  <textarea value={form.consultation_notes} onChange={e => update('consultation_notes', e.target.value)} rows={4} className={fieldClass('consultation_notes')} placeholder="Key details from initial consultation..." />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={form.conflict_check_completed} onChange={e => update('conflict_check_completed', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Conflict Check Completed</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retainer Amount</label>
                    <input type="number" step="0.01" min="0" value={form.retainer_amount} onChange={e => update('retainer_amount', e.target.value)} className={fieldClass('retainer_amount')} placeholder="5000.00" />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              {step > 0 ? (
                <button onClick={prevStep} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : <div />}

              {step < 3 ? (
                <button onClick={nextStep} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save as Draft
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save + Open Case
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
