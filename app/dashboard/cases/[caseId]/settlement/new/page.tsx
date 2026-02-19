'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import {
  ArrowLeft, ArrowRight, FileText, Home, DollarSign, Users,
  Calendar, List, CheckCircle, Loader2, Plus, X, Trash2,
} from 'lucide-react'
import {
  SUPPORT_TYPE_INFO, SCHEDULE_TYPE_INFO, LEGAL_CUSTODY_INFO,
  PHYSICAL_CUSTODY_INFO, OTHER_TERM_CATEGORIES, TERMINATION_EVENTS,
  formatCurrency, calculateSupportNPV, calculateAllocation,
} from '@/types/settlement'
import type {
  SpousalSupportType, ScheduleType, LegalCustodyType,
  PhysicalCustodyType, DecisionType, OtherTermCategory,
  PropertyAllocation, StepDownEntry,
} from '@/types/settlement'

const STEPS = [
  { number: 1, title: 'Basic Info', icon: FileText },
  { number: 2, title: 'Property', icon: Home },
  { number: 3, title: 'Spousal Support', icon: DollarSign },
  { number: 4, title: 'Child Support', icon: Users },
  { number: 5, title: 'Custody', icon: Calendar },
  { number: 6, title: 'Other Terms', icon: List },
  { number: 7, title: 'Review', icon: CheckCircle },
]

interface PropertyRow {
  id: string
  item_type: 'asset' | 'debt'
  description: string
  category: string
  gross_value: number
  encumbrance: number
  net_value: number
  characterization: string
  allocated_to: PropertyAllocation
  allocation_percentage: number
  husband_receives: number
  wife_receives: number
  asset_id?: string | null
  debt_id?: string | null
}

interface OtherTermRow {
  id: string
  category: OtherTermCategory
  term_title: string
  term_description: string
  responsible_party: string
  amount: number | null
}

export default function NewProposalPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.caseId as string

  const [step, setStep] = useState(1)
  const [proposalId, setProposalId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState<Record<string, string> | null>(null)

  // Step 1: Basic info
  const [title, setTitle] = useState('')
  const [createdByParty, setCreatedByParty] = useState('our_client')
  const [coverLetter, setCoverLetter] = useState('')

  // Step 2: Property
  const [propertyItems, setPropertyItems] = useState<PropertyRow[]>([])
  const [_showAddProperty, _setShowAddProperty] = useState(false)

  // Step 3: Spousal support
  const [supportType, setSupportType] = useState<SpousalSupportType>('none')
  const [supportPayor, setSupportPayor] = useState('husband')
  const [supportAmount, setSupportAmount] = useState(0)
  const [supportDuration, setSupportDuration] = useState(36)
  const [supportDurationDesc, setSupportDurationDesc] = useState('')
  const [stepDowns, setStepDowns] = useState<StepDownEntry[]>([])
  const [terminationEvents, setTerminationEvents] = useState<string[]>(['payee_remarriage', 'death_either'])
  const [colaProvision, setColaProvision] = useState(false)
  const [securityType, setSecurityType] = useState('none')
  const [securityAmount, setSecurityAmount] = useState(0)
  const [modifiable, setModifiable] = useState(true)

  // Step 4: Child support
  const [csPayor, setCsPayor] = useState('husband')
  const [guidelineAmount, setGuidelineAmount] = useState(0)
  const [proposedAmount, setProposedAmount] = useState(0)
  const [deviationType, setDeviationType] = useState('none')
  const [deviationReason, setDeviationReason] = useState('')
  const [healthInsProvider, setHealthInsProvider] = useState('husband')
  const [healthInsCost, setHealthInsCost] = useState(0)
  const [medicalSplit, setMedicalSplit] = useState('50/50')
  const [childcareCost, setChildcareCost] = useState(0)
  const [childcareSplit, setChildcareSplit] = useState('50/50')
  const [extraCap, setExtraCap] = useState(0)
  const [extraSplit, _setExtraSplit] = useState('50/50')

  // Step 5: Custody
  const [legalCustody, setLegalCustody] = useState<LegalCustodyType>('joint')
  const [physicalCustody, setPhysicalCustody] = useState<PhysicalCustodyType>('joint')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('week_on_week_off')
  const [scheduleDesc, _setScheduleDesc] = useState('')
  const [husbandPct, setHusbandPct] = useState(50)
  const [wifePct, setWifePct] = useState(50)
  const [exchangeDay, setExchangeDay] = useState('')
  const [exchangeLocation, setExchangeLocation] = useState('')
  const [decEducation, setDecEducation] = useState<DecisionType>('joint')
  const [decMedical, setDecMedical] = useState<DecisionType>('joint')
  const [decReligious, setDecReligious] = useState<DecisionType>('joint')
  const [decExtra, setDecExtra] = useState<DecisionType>('joint')
  const [rofrHours, setRofrHours] = useState<number | ''>('')
  const [relocMiles, setRelocMiles] = useState<number | ''>('')

  // Step 6: Other terms
  const [otherTerms, setOtherTerms] = useState<OtherTermRow[]>([])

  // Load case data
  useEffect(() => {
    async function loadCase() {
      try {
        const res = await fetch(`/api/cases/${caseId}`)
        if (res.ok) {
          const d = await res.json()
          setCaseData(d.data || d)
        }
      } catch { /* silently handle */ }
    }
    loadCase()
  }, [caseId])

  // Load existing assets/debts for property step
  useEffect(() => {
    async function loadFinancials() {
      try {
        const [assetsRes, debtsRes] = await Promise.all([
          fetch(`/api/cases/${caseId}/assets`),
          fetch(`/api/cases/${caseId}/debts`),
        ])
        const items: PropertyRow[] = []
        if (assetsRes.ok) {
          const d = await assetsRes.json()
          for (const a of d.data || []) {
            const net = (a.current_value || 0) - (a.encumbrance || 0)
            items.push({
              id: `asset-${a.id}`,
              item_type: 'asset',
              description: a.name || a.description || 'Asset',
              category: a.category || '',
              gross_value: a.current_value || 0,
              encumbrance: a.encumbrance || 0,
              net_value: net,
              characterization: 'community',
              allocated_to: 'split',
              allocation_percentage: 50,
              husband_receives: net / 2,
              wife_receives: net / 2,
              asset_id: a.id,
            })
          }
        }
        if (debtsRes.ok) {
          const d = await debtsRes.json()
          for (const db of d.data || []) {
            const val = db.current_balance || 0
            items.push({
              id: `debt-${db.id}`,
              item_type: 'debt',
              description: db.creditor_name || db.description || 'Debt',
              category: db.category || '',
              gross_value: val,
              encumbrance: 0,
              net_value: val,
              characterization: 'community',
              allocated_to: 'split',
              allocation_percentage: 50,
              husband_receives: val / 2,
              wife_receives: val / 2,
              debt_id: db.id,
            })
          }
        }
        if (items.length > 0) setPropertyItems(items)
      } catch { /* silently handle */ }
    }
    loadFinancials()
  }, [caseId])

  // Property totals
  const propertyTotals = useMemo(() => {
    let hAssets = 0, wAssets = 0, hDebts = 0, wDebts = 0
    for (const item of propertyItems) {
      if (item.item_type === 'asset') {
        hAssets += item.husband_receives
        wAssets += item.wife_receives
      } else {
        hDebts += item.husband_receives
        wDebts += item.wife_receives
      }
    }
    const hNet = hAssets - hDebts
    const wNet = wAssets - wDebts
    const total = hNet + wNet
    const diff = hNet - wNet
    return {
      hAssets, wAssets, hDebts, wDebts, hNet, wNet, total,
      equalization: Math.abs(diff) / 2,
      equalizationPayor: diff > 0 ? 'Husband' : 'Wife',
      hPct: total > 0 ? ((hNet / total) * 100).toFixed(1) : '50.0',
      wPct: total > 0 ? ((wNet / total) * 100).toFixed(1) : '50.0',
    }
  }, [propertyItems])

  // Support NPV
  const supportNPV = useMemo(() => {
    if (supportType === 'none' || supportType === 'reserved') return 0
    if (supportType === 'lump_sum') return supportAmount
    return calculateSupportNPV(supportAmount, supportType === 'permanent' ? null : supportDuration)
  }, [supportType, supportAmount, supportDuration])

  function updatePropertyAllocation(index: number, field: string, value: unknown) {
    setPropertyItems(prev => {
      const updated = [...prev]
      const item = { ...updated[index], [field]: value }
      // Recalculate if allocation changed
      if (field === 'allocated_to' || field === 'allocation_percentage' || field === 'net_value') {
        const netVal = field === 'net_value' ? (value as number) : item.net_value
        const alloc = field === 'allocated_to' ? (value as PropertyAllocation) : item.allocated_to
        const pct = field === 'allocation_percentage' ? (value as number) : item.allocation_percentage
        const { husband, wife } = calculateAllocation(netVal, alloc, pct)
        item.husband_receives = husband
        item.wife_receives = wife
      }
      if (field === 'gross_value' || field === 'encumbrance') {
        const gross = field === 'gross_value' ? (value as number) : item.gross_value
        const enc = field === 'encumbrance' ? (value as number) : item.encumbrance
        item.net_value = gross - enc
        const { husband, wife } = calculateAllocation(item.net_value, item.allocated_to, item.allocation_percentage)
        item.husband_receives = husband
        item.wife_receives = wife
      }
      updated[index] = item
      return updated
    })
  }

  function addPropertyItem() {
    setPropertyItems(prev => [...prev, {
      id: `new-${Date.now()}`,
      item_type: 'asset',
      description: '',
      category: '',
      gross_value: 0,
      encumbrance: 0,
      net_value: 0,
      characterization: 'community',
      allocated_to: 'split',
      allocation_percentage: 50,
      husband_receives: 0,
      wife_receives: 0,
    }])
  }

  function removePropertyItem(index: number) {
    setPropertyItems(prev => prev.filter((_, i) => i !== index))
  }

  // ==================== SAVE HANDLERS ====================

  async function handleCreateProposal() {
    setSaving(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || undefined,
          created_by_party: createdByParty,
          cover_letter: coverLetter || null,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        setProposalId(d.data.id)
        setStep(2)
      }
    } catch { /* silently handle */ }
    setSaving(false)
  }

  async function handleSaveProperty() {
    if (!proposalId) return
    setSaving(true)
    try {
      await fetch(`/api/proposals/${proposalId}/property`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: propertyItems }),
      })
      setStep(3)
    } catch { /* silently handle */ }
    setSaving(false)
  }

  async function handleSaveSpousalSupport() {
    if (!proposalId) return
    setSaving(true)
    try {
      await fetch(`/api/proposals/${proposalId}/terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _type: 'spousal_support',
          support_type: supportType,
          payor: supportPayor,
          monthly_amount: supportAmount,
          duration_months: supportType === 'permanent' ? null : supportDuration,
          duration_description: supportDurationDesc || null,
          step_down_schedule: stepDowns,
          termination_events: terminationEvents,
          cola_provision: colaProvision,
          tax_treatment: 'non_deductible',
          security_type: securityType,
          security_amount: securityAmount,
          modifiable,
          jurisdiction_retained: true,
          total_npv: supportNPV,
        }),
      })
      setStep(4)
    } catch { /* silently handle */ }
    setSaving(false)
  }

  async function handleSaveChildSupport() {
    if (!proposalId) return
    setSaving(true)
    try {
      await fetch(`/api/proposals/${proposalId}/terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _type: 'child_support',
          payor: csPayor,
          guideline_amount: guidelineAmount,
          proposed_amount: proposedAmount,
          deviation_type: deviationType,
          deviation_reason: deviationReason || null,
          payment_frequency: 'monthly',
          health_insurance_provider: healthInsProvider,
          health_insurance_monthly_cost: healthInsCost,
          unreimbursed_medical_split: medicalSplit,
          childcare_monthly_cost: childcareCost,
          childcare_split: childcareSplit,
          extracurricular_annual_cap: extraCap || null,
          extracurricular_split: extraSplit,
        }),
      })
      setStep(5)
    } catch { /* silently handle */ }
    setSaving(false)
  }

  async function handleSaveCustody() {
    if (!proposalId) return
    setSaving(true)
    try {
      await fetch(`/api/proposals/${proposalId}/terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _type: 'custody',
          legal_custody: legalCustody,
          physical_custody: physicalCustody,
          husband_percentage: husbandPct,
          wife_percentage: wifePct,
          schedule_type: scheduleType,
          schedule_description: scheduleDesc || null,
          exchange_day: exchangeDay || null,
          exchange_location: exchangeLocation || null,
          decision_education: decEducation,
          decision_medical: decMedical,
          decision_religious: decReligious,
          decision_extracurricular: decExtra,
          right_of_first_refusal_hours: rofrHours || null,
          relocation_restriction_miles: relocMiles || null,
        }),
      })
      setStep(6)
    } catch { /* silently handle */ }
    setSaving(false)
  }

  async function handleSaveOtherTerms() {
    if (!proposalId) return
    setSaving(true)
    try {
      await fetch(`/api/proposals/${proposalId}/terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _type: 'other_terms_bulk',
          terms: otherTerms.map(t => ({
            category: t.category,
            term_title: t.term_title,
            term_description: t.term_description,
            responsible_party: t.responsible_party,
            amount: t.amount,
          })),
        }),
      })
      // Recalculate totals
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'recalculate' }),
      })
      setStep(7)
    } catch { /* silently handle */ }
    setSaving(false)
  }

  async function handleFinalize() {
    router.push(`/dashboard/cases/${caseId}/settlement`)
  }

  // Update custody percentages when schedule changes
  useEffect(() => {
    const info = SCHEDULE_TYPE_INFO[scheduleType]
    if (info && scheduleType !== 'custom') {
      setHusbandPct(info.husbandPct)
      setWifePct(info.wifePct)
    }
  }, [scheduleType])

  const caseName = caseData
    ? `${caseData.client_name || 'Client'} v. ${caseData.spouse_name || 'Spouse'}`
    : ''

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Back link */}
          <button
            onClick={() => router.push(`/dashboard/cases/${caseId}/settlement`)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Settlement
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Settlement Proposal</h1>
          <p className="text-gray-500 text-sm mb-6">{caseName}</p>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
            {STEPS.map((s, i) => (
              <div key={s.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors ${
                    step >= s.number
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 text-gray-400'
                  }`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs mt-1 hidden md:block ${step >= s.number ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 lg:w-14 h-0.5 mx-1 ${step > s.number ? 'bg-blue-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                  <p className="text-sm text-gray-500">Set up the proposal details</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proposal Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., Wife's Initial Proposal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                  <select value={createdByParty} onChange={e => setCreatedByParty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="our_client">Our Client</option>
                    <option value="opposing">Opposing Party</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter / Notes</label>
                  <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
                    rows={3} placeholder="Optional cover letter or transmittal notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button onClick={handleCreateProposal} disabled={saving}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Continue to Property Division <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Property Division */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Property Division</h2>
                  <p className="text-sm text-gray-500">Allocate assets and debts between the parties</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600">Husband Receives</p>
                    <p className="text-xl font-bold text-blue-800">{formatCurrency(propertyTotals.hNet)}</p>
                    <p className="text-xs text-blue-500">{propertyTotals.hPct}%</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600">Community Estate</p>
                    <p className="text-xl font-bold">{formatCurrency(propertyTotals.total)}</p>
                    {propertyTotals.equalization > 0 && (
                      <p className="text-xs text-orange-600">
                        {propertyTotals.equalizationPayor} pays {formatCurrency(propertyTotals.equalization)} to equalize
                      </p>
                    )}
                  </div>
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-pink-600">Wife Receives</p>
                    <p className="text-xl font-bold text-pink-800">{formatCurrency(propertyTotals.wNet)}</p>
                    <p className="text-xs text-pink-500">{propertyTotals.wPct}%</p>
                  </div>
                </div>

                {/* Assets */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Assets</h3>
                    <button onClick={addPropertyItem} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Asset
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Description</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Value</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Liens</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Net</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500">Allocation</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-blue-600">H</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-pink-600">W</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyItems.filter(i => i.item_type === 'asset').map((item) => {
                          const idx = propertyItems.indexOf(item)
                          return (
                            <tr key={item.id} className="border-b border-gray-100">
                              <td className="px-3 py-2">
                                <input type="text" value={item.description}
                                  onChange={e => updatePropertyAllocation(idx, 'description', e.target.value)}
                                  className="w-full text-sm border-0 bg-transparent focus:ring-0 p-0" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" value={item.gross_value}
                                  onChange={e => updatePropertyAllocation(idx, 'gross_value', parseFloat(e.target.value) || 0)}
                                  className="w-24 text-right text-sm border border-gray-200 rounded px-1 py-0.5" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" value={item.encumbrance}
                                  onChange={e => updatePropertyAllocation(idx, 'encumbrance', parseFloat(e.target.value) || 0)}
                                  className="w-24 text-right text-sm border border-gray-200 rounded px-1 py-0.5" />
                              </td>
                              <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.net_value)}</td>
                              <td className="px-3 py-2">
                                <select value={item.allocated_to}
                                  onChange={e => updatePropertyAllocation(idx, 'allocated_to', e.target.value)}
                                  className="text-xs border border-gray-200 rounded px-1 py-0.5">
                                  <option value="husband">Husband</option>
                                  <option value="wife">Wife</option>
                                  <option value="sell">Sell</option>
                                  <option value="split">Split %</option>
                                </select>
                                {item.allocated_to === 'split' && (
                                  <input type="number" value={item.allocation_percentage}
                                    onChange={e => updatePropertyAllocation(idx, 'allocation_percentage', parseFloat(e.target.value) || 50)}
                                    className="w-14 text-xs border border-gray-200 rounded px-1 py-0.5 ml-1" />
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-blue-600 font-medium">{formatCurrency(item.husband_receives)}</td>
                              <td className="px-3 py-2 text-right text-pink-600 font-medium">{formatCurrency(item.wife_receives)}</td>
                              <td className="px-1">
                                <button onClick={() => removePropertyItem(idx)} className="text-gray-300 hover:text-red-500">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={5} className="px-3 py-2 text-xs text-gray-600">Assets Subtotal</td>
                          <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(propertyTotals.hAssets)}</td>
                          <td className="px-3 py-2 text-right text-pink-600">{formatCurrency(propertyTotals.wAssets)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Debts */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Debts</h3>
                    <button onClick={() => setPropertyItems(prev => [...prev, {
                      id: `new-debt-${Date.now()}`, item_type: 'debt', description: '', category: '',
                      gross_value: 0, encumbrance: 0, net_value: 0, characterization: 'community',
                      allocated_to: 'split', allocation_percentage: 50, husband_receives: 0, wife_receives: 0,
                    }])} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Debt
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Description</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Balance</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500">Allocation</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-blue-600">H Owes</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-pink-600">W Owes</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyItems.filter(i => i.item_type === 'debt').map((item) => {
                          const idx = propertyItems.indexOf(item)
                          return (
                            <tr key={item.id} className="border-b border-gray-100">
                              <td className="px-3 py-2">
                                <input type="text" value={item.description}
                                  onChange={e => updatePropertyAllocation(idx, 'description', e.target.value)}
                                  className="w-full text-sm border-0 bg-transparent focus:ring-0 p-0" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" value={item.gross_value}
                                  onChange={e => {
                                    const v = parseFloat(e.target.value) || 0
                                    updatePropertyAllocation(idx, 'gross_value', v)
                                    updatePropertyAllocation(idx, 'net_value', v)
                                  }}
                                  className="w-24 text-right text-sm border border-gray-200 rounded px-1 py-0.5" />
                              </td>
                              <td className="px-3 py-2">
                                <select value={item.allocated_to}
                                  onChange={e => updatePropertyAllocation(idx, 'allocated_to', e.target.value)}
                                  className="text-xs border border-gray-200 rounded px-1 py-0.5">
                                  <option value="husband">Husband</option>
                                  <option value="wife">Wife</option>
                                  <option value="split">Split</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(item.husband_receives)}</td>
                              <td className="px-3 py-2 text-right text-pink-600">{formatCurrency(item.wife_receives)}</td>
                              <td className="px-1">
                                <button onClick={() => removePropertyItem(idx)} className="text-gray-300 hover:text-red-500">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={3} className="px-3 py-2 text-xs text-gray-600">Debts Subtotal</td>
                          <td className="px-3 py-2 text-right text-blue-600">({formatCurrency(propertyTotals.hDebts)})</td>
                          <td className="px-3 py-2 text-right text-pink-600">({formatCurrency(propertyTotals.wDebts)})</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-gray-100">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handleSaveProperty} disabled={saving}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Continue to Spousal Support <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Spousal Support */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Spousal Support</h2>
                  <p className="text-sm text-gray-500">Define alimony / maintenance terms</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Support Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SUPPORT_TYPE_INFO).map(([k, v]) => (
                      <label key={k} className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        supportType === k ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <input type="radio" name="supportType" value={k} checked={supportType === k}
                          onChange={() => setSupportType(k as SpousalSupportType)}
                          className="mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{v.label}</p>
                          <p className="text-xs text-gray-500">{v.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {supportType !== 'none' && supportType !== 'reserved' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payor</label>
                        <select value={supportPayor} onChange={e => setSupportPayor(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                          <option value="husband">{caseData?.client_name || 'Husband'}</option>
                          <option value="wife">{caseData?.spouse_name || 'Wife'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Amount</label>
                        <input type="number" value={supportAmount}
                          onChange={e => setSupportAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    </div>

                    {supportType !== 'lump_sum' && supportType !== 'permanent' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                          <input type="number" value={supportDuration}
                            onChange={e => setSupportDuration(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                          <p className="text-xs text-gray-500 mt-1">= {(supportDuration / 12).toFixed(1)} years</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duration Description</label>
                          <input type="text" value={supportDurationDesc}
                            onChange={e => setSupportDurationDesc(e.target.value)}
                            placeholder="e.g., Until wife completes degree"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                      </div>
                    )}

                    {/* Step-downs */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Step-Down Schedule</label>
                        <button onClick={() => setStepDowns(prev => [...prev, { month: 24, amount: supportAmount * 0.75 }])}
                          className="text-xs text-blue-600 hover:text-blue-700">+ Add Step</button>
                      </div>
                      {stepDowns.map((sd, i) => (
                        <div key={i} className="flex items-center gap-2 mb-2 text-sm">
                          <span>After month</span>
                          <input type="number" value={sd.month}
                            onChange={e => setStepDowns(prev => prev.map((s, j) => j === i ? { ...s, month: parseInt(e.target.value) || 0 } : s))}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm" />
                          <span>reduce to $</span>
                          <input type="number" value={sd.amount}
                            onChange={e => setStepDowns(prev => prev.map((s, j) => j === i ? { ...s, amount: parseFloat(e.target.value) || 0 } : s))}
                            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm" />
                          <span>/mo</span>
                          <button onClick={() => setStepDowns(prev => prev.filter((_, j) => j !== i))}
                            className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>

                    {/* Termination events */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Termination Events</label>
                      <div className="grid grid-cols-2 gap-2">
                        {TERMINATION_EVENTS.map(ev => (
                          <label key={ev.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={terminationEvents.includes(ev.value)}
                              onChange={e => {
                                if (e.target.checked) setTerminationEvents(prev => [...prev, ev.value])
                                else setTerminationEvents(prev => prev.filter(v => v !== ev.value))
                              }}
                              className="rounded text-blue-600" />
                            {ev.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={modifiable}
                          onChange={e => setModifiable(e.target.checked)} className="rounded text-blue-600" />
                        Modifiable by court
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={colaProvision}
                          onChange={e => setColaProvision(e.target.checked)} className="rounded text-blue-600" />
                        COLA adjustment
                      </label>
                    </div>

                    {/* Security */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Security</label>
                      <select value={securityType} onChange={e => setSecurityType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="none">None</option>
                        <option value="life_insurance">Life Insurance</option>
                        <option value="bond">Bond</option>
                      </select>
                      {securityType !== 'none' && (
                        <input type="number" value={securityAmount}
                          onChange={e => setSecurityAmount(parseFloat(e.target.value) || 0)}
                          placeholder="Security amount"
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      )}
                    </div>

                    {/* NPV */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">Total Support Value (NPV)</p>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(supportAmount)}/mo x {supportType === 'permanent' ? '10yr cap' : `${supportDuration}mo`} @ 5%
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(supportNPV)}</p>
                    </div>
                  </>
                )}

                <div className="flex justify-between pt-4 border-t border-gray-100">
                  <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handleSaveSpousalSupport} disabled={saving}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Continue to Child Support <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Child Support */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Child Support</h2>
                  <p className="text-sm text-gray-500">Define child support terms and add-ons</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payor</label>
                    <select value={csPayor} onChange={e => setCsPayor(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="husband">{caseData?.client_name || 'Husband'}</option>
                      <option value="wife">{caseData?.spouse_name || 'Wife'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Guideline Amount</label>
                    <input type="number" value={guidelineAmount}
                      onChange={e => setGuidelineAmount(parseFloat(e.target.value) || 0)}
                      placeholder="From state calculator"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Amount</label>
                    <input type="number" value={proposedAmount}
                      onChange={e => setProposedAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deviation</label>
                    <select value={deviationType} onChange={e => setDeviationType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="none">None (at guideline)</option>
                      <option value="upward">Upward deviation</option>
                      <option value="downward">Downward deviation</option>
                    </select>
                  </div>
                </div>

                {deviationType !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deviation Reason</label>
                    <textarea value={deviationReason} onChange={e => setDeviationReason(e.target.value)}
                      rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                  </div>
                )}

                <h3 className="text-sm font-semibold text-gray-700 pt-2">Add-Ons</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Health Insurance Provider</label>
                    <select value={healthInsProvider} onChange={e => setHealthInsProvider(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="husband">Husband</option>
                      <option value="wife">Wife</option>
                      <option value="split">Split</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Insurance Cost</label>
                    <input type="number" value={healthInsCost}
                      onChange={e => setHealthInsCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unreimbursed Medical Split</label>
                    <select value={medicalSplit} onChange={e => setMedicalSplit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="50/50">50/50</option>
                      <option value="60/40">60/40 (H/W)</option>
                      <option value="70/30">70/30 (H/W)</option>
                      <option value="80/20">80/20 (H/W)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Childcare Monthly Cost</label>
                    <input type="number" value={childcareCost}
                      onChange={e => setChildcareCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Childcare Split</label>
                    <select value={childcareSplit} onChange={e => setChildcareSplit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="50/50">50/50</option>
                      <option value="60/40">60/40</option>
                      <option value="70/30">70/30</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Extracurricular Cap (Annual)</label>
                    <input type="number" value={extraCap}
                      onChange={e => setExtraCap(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-gray-100">
                  <button onClick={() => setStep(3)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handleSaveChildSupport} disabled={saving}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Continue to Custody <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Custody */}
            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Custody & Parenting</h2>
                  <p className="text-sm text-gray-500">Define custody, schedule, and decision-making</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Legal Custody</label>
                    <select value={legalCustody} onChange={e => setLegalCustody(e.target.value as LegalCustodyType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      {Object.entries(LEGAL_CUSTODY_INFO).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Physical Custody</label>
                    <select value={physicalCustody} onChange={e => setPhysicalCustody(e.target.value as PhysicalCustodyType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      {Object.entries(PHYSICAL_CUSTODY_INFO).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parenting Schedule</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SCHEDULE_TYPE_INFO).map(([k, v]) => (
                      <label key={k} className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer ${
                        scheduleType === k ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <input type="radio" name="schedule" value={k} checked={scheduleType === k}
                          onChange={() => setScheduleType(k as ScheduleType)} className="mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{v.label}</p>
                          <p className="text-xs text-gray-500">{v.husbandPct}/{v.wifePct} split</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {scheduleType === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Husband %</label>
                      <input type="number" value={husbandPct}
                        onChange={e => { const v = parseFloat(e.target.value) || 0; setHusbandPct(v); setWifePct(100 - v) }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Wife %</label>
                      <input type="number" value={wifePct} disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" />
                    </div>
                  </div>
                )}

                {/* Custody percentage display */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Custody Time Split</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-blue-100 rounded-l-full h-5" style={{ width: `${husbandPct}%` }}>
                      <span className="text-xs text-blue-700 pl-2">{husbandPct}%</span>
                    </div>
                    <div className="flex-1 bg-pink-100 rounded-r-full h-5 text-right" style={{ width: `${wifePct}%` }}>
                      <span className="text-xs text-pink-700 pr-2">{wifePct}%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Day/Time</label>
                    <input type="text" value={exchangeDay} onChange={e => setExchangeDay(e.target.value)}
                      placeholder="e.g., Friday at 6:00 PM"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Location</label>
                    <input type="text" value={exchangeLocation} onChange={e => setExchangeLocation(e.target.value)}
                      placeholder="e.g., School, police station"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-gray-700 pt-2">Decision-Making</h3>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['Education', decEducation, setDecEducation],
                    ['Medical', decMedical, setDecMedical],
                    ['Religious', decReligious, setDecReligious],
                    ['Extracurricular', decExtra, setDecExtra],
                  ] as [string, DecisionType, (v: DecisionType) => void][]).map(([label, value, setter]) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                      <select value={value} onChange={e => setter(e.target.value as DecisionType)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                        <option value="joint">Joint</option>
                        <option value="husband">Husband</option>
                        <option value="wife">Wife</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Right of First Refusal (hours)</label>
                    <input type="number" value={rofrHours} onChange={e => setRofrHours(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="e.g., 4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relocation Restriction (miles)</label>
                    <input type="number" value={relocMiles} onChange={e => setRelocMiles(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="e.g., 50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-gray-100">
                  <button onClick={() => setStep(4)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handleSaveCustody} disabled={saving}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Continue to Other Terms <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: Other Terms */}
            {step === 6 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Other Terms</h2>
                  <p className="text-sm text-gray-500">Name change, tax, insurance, attorney fees, etc.</p>
                </div>

                {otherTerms.map((term, i) => (
                  <div key={term.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <select value={term.category}
                        onChange={e => setOtherTerms(prev => prev.map((t, j) => j === i ? { ...t, category: e.target.value as OtherTermCategory } : t))}
                        className="text-sm border border-gray-300 rounded px-2 py-1">
                        {Object.entries(OTHER_TERM_CATEGORIES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      <button onClick={() => setOtherTerms(prev => prev.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <input type="text" value={term.term_title}
                      onChange={e => setOtherTerms(prev => prev.map((t, j) => j === i ? { ...t, term_title: e.target.value } : t))}
                      placeholder="Term title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <textarea value={term.term_description}
                      onChange={e => setOtherTerms(prev => prev.map((t, j) => j === i ? { ...t, term_description: e.target.value } : t))}
                      placeholder="Description..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={term.responsible_party}
                        onChange={e => setOtherTerms(prev => prev.map((t, j) => j === i ? { ...t, responsible_party: e.target.value } : t))}
                        className="text-sm border border-gray-300 rounded px-2 py-1.5">
                        <option value="husband">Husband</option>
                        <option value="wife">Wife</option>
                        <option value="both">Both</option>
                        <option value="na">N/A</option>
                      </select>
                      <input type="number" value={term.amount || ''}
                        onChange={e => setOtherTerms(prev => prev.map((t, j) => j === i ? { ...t, amount: parseFloat(e.target.value) || null } : t))}
                        placeholder="Amount (optional)"
                        className="text-sm border border-gray-300 rounded px-2 py-1.5" />
                    </div>
                  </div>
                ))}

                <button onClick={() => setOtherTerms(prev => [...prev, {
                  id: `term-${Date.now()}`, category: 'other', term_title: '', term_description: '',
                  responsible_party: 'both', amount: null,
                }])}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
                  <Plus className="w-4 h-4" /> Add Term
                </button>

                <div className="flex justify-between pt-4 border-t border-gray-100">
                  <button onClick={() => setStep(5)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handleSaveOtherTerms} disabled={saving}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Continue to Review <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 7: Review */}
            {step === 7 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Proposal Review</h2>
                  <p className="text-sm text-gray-500">Review all terms before saving</p>
                </div>

                {/* Property Summary */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Property Division</h3>
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <p className="text-gray-500">Husband Net</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(propertyTotals.hNet)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Estate</p>
                      <p className="text-lg font-bold">{formatCurrency(propertyTotals.total)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Wife Net</p>
                      <p className="text-lg font-bold text-pink-600">{formatCurrency(propertyTotals.wNet)}</p>
                    </div>
                  </div>
                  {propertyTotals.equalization > 0 && (
                    <p className="text-sm text-center text-orange-600 mt-2">
                      Equalization: {propertyTotals.equalizationPayor} pays {formatCurrency(propertyTotals.equalization)}
                    </p>
                  )}
                </div>

                {/* Support Summary */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Spousal Support</h3>
                  {supportType === 'none' ? (
                    <p className="text-sm text-gray-500">No spousal support</p>
                  ) : (
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-500">Type:</span> {SUPPORT_TYPE_INFO[supportType].label}</p>
                      <p><span className="text-gray-500">Amount:</span> {formatCurrency(supportAmount)}/month</p>
                      {supportType !== 'permanent' && supportType !== 'lump_sum' && (
                        <p><span className="text-gray-500">Duration:</span> {supportDuration} months ({(supportDuration/12).toFixed(1)} years)</p>
                      )}
                      <p><span className="text-gray-500">NPV:</span> {formatCurrency(supportNPV)}</p>
                    </div>
                  )}
                </div>

                {/* Child Support Summary */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Child Support</h3>
                  <div className="text-sm space-y-1">
                    <p><span className="text-gray-500">Proposed:</span> {formatCurrency(proposedAmount)}/month</p>
                    {guidelineAmount > 0 && (
                      <p><span className="text-gray-500">Guideline:</span> {formatCurrency(guidelineAmount)}/month</p>
                    )}
                  </div>
                </div>

                {/* Custody Summary */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Custody</h3>
                  <div className="text-sm space-y-1">
                    <p><span className="text-gray-500">Legal:</span> {LEGAL_CUSTODY_INFO[legalCustody].label}</p>
                    <p><span className="text-gray-500">Physical:</span> {PHYSICAL_CUSTODY_INFO[physicalCustody].label}</p>
                    <p><span className="text-gray-500">Schedule:</span> {SCHEDULE_TYPE_INFO[scheduleType].label} ({husbandPct}/{wifePct})</p>
                  </div>
                </div>

                {/* Other Terms */}
                {otherTerms.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Other Terms ({otherTerms.length})</h3>
                    <div className="space-y-1">
                      {otherTerms.map(t => (
                        <p key={t.id} className="text-sm">
                          <span className="text-gray-500">{OTHER_TERM_CATEGORIES[t.category]?.label}:</span> {t.term_title}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-gray-100">
                  <button onClick={() => setStep(6)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handleFinalize}
                    className="flex items-center gap-1.5 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-green-700">
                    <CheckCircle className="w-4 h-4" /> Save Proposal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
