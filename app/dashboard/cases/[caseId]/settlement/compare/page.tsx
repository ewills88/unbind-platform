'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import {
  ArrowLeft, Loader2, BarChart3, ArrowUpDown, AlertTriangle,
  CheckCircle, DollarSign, Home, Users, List,
} from 'lucide-react'
import type { SettlementProposal } from '@/types/settlement'
import {
  PROPOSAL_STATUS_INFO,
  LEGAL_CUSTODY_INFO,
  PHYSICAL_CUSTODY_INFO,
  SCHEDULE_TYPE_INFO,
  SUPPORT_TYPE_INFO,
  formatCurrency,
} from '@/types/settlement'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

interface GapAnalysis {
  property_gap: number
  support_gap_monthly: number
  support_gap_duration: number
  custody_gap_percentage: number
  total_value_gap: number
}

export default function ProposalComparePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const caseId = params.caseId as string

  const [proposals, setProposals] = useState<SettlementProposal[]>([])
  const [proposalA, setProposalA] = useState<SettlementProposal | null>(null)
  const [proposalB, setProposalB] = useState<SettlementProposal | null>(null)
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null)
  const [selectedA, setSelectedA] = useState(searchParams.get('a') || '')
  const [selectedB, setSelectedB] = useState(searchParams.get('b') || '')
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/proposals`)
      if (res.ok) {
        const d = await res.json()
        setProposals(d.data || [])
        // Auto-select first two if params not set
        const list = d.data || []
        if (!selectedA && list.length >= 1) setSelectedA(list[0].id)
        if (!selectedB && list.length >= 2) setSelectedB(list[1].id)
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [caseId, selectedA, selectedB])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  const fetchComparison = useCallback(async () => {
    if (!selectedA || !selectedB || selectedA === selectedB) return
    setComparing(true)
    try {
      const res = await fetch(
        `/api/cases/${caseId}/proposals/compare?a=${selectedA}&b=${selectedB}`
      )
      if (res.ok) {
        const d = await res.json()
        setProposalA(d.data.proposal_a)
        setProposalB(d.data.proposal_b)
        setGapAnalysis(d.data.gap_analysis)
      }
    } catch {
      // silently handle
    } finally {
      setComparing(false)
    }
  }, [caseId, selectedA, selectedB])

  useEffect(() => { fetchComparison() }, [fetchComparison])

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

  if (proposals.length < 2) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
            <button
              onClick={() => router.push(`/dashboard/cases/${caseId}/settlement`)}
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 mb-4 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Settlement
            </button>
            <div className="text-center py-16 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Need at least 2 proposals to compare</p>
              <p className="text-sm mt-1">Create more proposals to use the comparison tool.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const supportA = proposalA?.spousal_support?.[0]
  const supportB = proposalB?.spousal_support?.[0]
  const custodyA = proposalA?.custody?.[0]
  const custodyB = proposalB?.custody?.[0]
  const childA = proposalA?.child_support?.[0]
  const childB = proposalB?.child_support?.[0]

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/dashboard/cases/${caseId}/settlement`)}
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Compare Proposals</h1>
                <p className="text-sm text-gray-500">Side-by-side settlement comparison</p>
              </div>
            </div>
          </div>

          {/* Proposal Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Proposal A</label>
              <select
                value={selectedA}
                onChange={e => setSelectedA(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {proposals.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.proposal_number} — {p.title} ({PROPOSAL_STATUS_INFO[p.status].label})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Proposal B</label>
              <select
                value={selectedB}
                onChange={e => setSelectedB(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {proposals.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.proposal_number} — {p.title} ({PROPOSAL_STATUS_INFO[p.status].label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {comparing && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}

          {proposalA && proposalB && !comparing && (
            <>
              {/* Gap Analysis Summary */}
              {gapAnalysis && (
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h2 className="font-semibold text-gray-900">Gap Analysis</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Property Gap</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(gapAnalysis.property_gap)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Support Gap/mo</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency(gapAnalysis.support_gap_monthly)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Duration Gap</p>
                      <p className="text-lg font-bold text-orange-600">
                        {gapAnalysis.support_gap_duration} mo
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Custody Gap</p>
                      <p className="text-lg font-bold text-teal-600">
                        {gapAnalysis.custody_gap_percentage}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Total Estimated Value Gap</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(gapAnalysis.total_value_gap)}
                    </p>
                  </div>
                </div>
              )}

              {/* Side-by-side Headers */}
              <div className="grid grid-cols-[1fr_1fr] gap-4">
                <ProposalHeader proposal={proposalA} label="A" />
                <ProposalHeader proposal={proposalB} label="B" />
              </div>

              {/* Property Division */}
              <ComparisonSection
                title="Property Division"
                icon={<Home className="w-4 h-4" />}
              >
                <div className="grid grid-cols-2 gap-4">
                  <PropertySummary proposal={proposalA} />
                  <PropertySummary proposal={proposalB} />
                </div>

                {/* Property Items Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 w-1/3">Item</th>
                        <th className="text-center py-2 px-2 text-xs font-medium text-blue-600" colSpan={2}>Proposal A</th>
                        <th className="text-center py-2 px-2 text-xs font-medium text-purple-600" colSpan={2}>Proposal B</th>
                      </tr>
                      <tr className="border-b border-gray-100 text-xs text-gray-400">
                        <th></th>
                        <th className="py-1 px-2">H Receives</th>
                        <th className="py-1 px-2">W Receives</th>
                        <th className="py-1 px-2">H Receives</th>
                        <th className="py-1 px-2">W Receives</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAllPropertyItems(proposalA, proposalB).map((desc, i) => {
                        const itemA = proposalA.property_items?.find(p => p.description === desc)
                        const itemB = proposalB.property_items?.find(p => p.description === desc)
                        const hasDiff = (itemA?.husband_receives || 0) !== (itemB?.husband_receives || 0) ||
                          (itemA?.wife_receives || 0) !== (itemB?.wife_receives || 0)
                        return (
                          <tr key={i} className={`border-b border-gray-50 ${hasDiff ? 'bg-amber-50' : ''}`}>
                            <td className="py-2 px-2 text-gray-700">{desc}</td>
                            <td className="py-2 px-2 text-center">{itemA ? formatCurrency(itemA.husband_receives) : '—'}</td>
                            <td className="py-2 px-2 text-center">{itemA ? formatCurrency(itemA.wife_receives) : '—'}</td>
                            <td className="py-2 px-2 text-center">{itemB ? formatCurrency(itemB.husband_receives) : '—'}</td>
                            <td className="py-2 px-2 text-center">{itemB ? formatCurrency(itemB.wife_receives) : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </ComparisonSection>

              {/* Spousal Support */}
              <ComparisonSection
                title="Spousal Support"
                icon={<DollarSign className="w-4 h-4" />}
              >
                <div className="grid grid-cols-2 gap-4">
                  <SupportSummary support={supportA} label="A" />
                  <SupportSummary support={supportB} label="B" />
                </div>
              </ComparisonSection>

              {/* Child Support */}
              {(childA || childB) && (
                <ComparisonSection
                  title="Child Support"
                  icon={<Users className="w-4 h-4" />}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <ChildSupportSummary child={childA} label="A" />
                    <ChildSupportSummary child={childB} label="B" />
                  </div>
                </ComparisonSection>
              )}

              {/* Custody */}
              {(custodyA || custodyB) && (
                <ComparisonSection
                  title="Custody & Parenting"
                  icon={<Users className="w-4 h-4" />}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <CustodySummary custody={custodyA} label="A" />
                    <CustodySummary custody={custodyB} label="B" />
                  </div>
                </ComparisonSection>
              )}

              {/* Other Terms */}
              {(proposalA.other_terms?.length || proposalB.other_terms?.length) ? (
                <ComparisonSection
                  title="Other Terms"
                  icon={<List className="w-4 h-4" />}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <OtherTermsList terms={proposalA.other_terms || []} label="A" />
                    <OtherTermsList terms={proposalB.other_terms || []} label="B" />
                  </div>
                </ComparisonSection>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// Helper: get unique property item descriptions across both proposals
// ============================================================================
function getAllPropertyItems(a: SettlementProposal, b: SettlementProposal): string[] {
  const descs = new Set<string>()
  for (const item of a.property_items || []) descs.add(item.description)
  for (const item of b.property_items || []) descs.add(item.description)
  return Array.from(descs)
}

// ============================================================================
// ProposalHeader
// ============================================================================
function ProposalHeader({ proposal, label }: { proposal: SettlementProposal; label: string }) {
  const status = PROPOSAL_STATUS_INFO[proposal.status]
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${label === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
              {label}
            </span>
            <h3 className="font-semibold text-gray-900">{proposal.title}</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            #{proposal.proposal_number} &middot; {formatDate(proposal.created_at)}
            {proposal.parent_proposal_id && ' (counter-offer)'}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
          {status.label}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// PropertySummary
// ============================================================================
function PropertySummary({ proposal }: { proposal: SettlementProposal }) {
  const diff = proposal.total_to_husband - proposal.total_to_wife
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-50 rounded p-2 text-center">
          <p className="text-xs text-gray-500">Husband Total</p>
          <p className="font-bold text-blue-600">{formatCurrency(proposal.total_to_husband)}</p>
        </div>
        <div className="bg-pink-50 rounded p-2 text-center">
          <p className="text-xs text-gray-500">Wife Total</p>
          <p className="font-bold text-pink-600">{formatCurrency(proposal.total_to_wife)}</p>
        </div>
      </div>
      {proposal.equalization_payment > 0 && (
        <div className="bg-amber-50 rounded p-2 text-center text-sm">
          <p className="text-xs text-gray-500">Equalization Payment</p>
          <p className="font-semibold text-amber-700">
            {formatCurrency(proposal.equalization_payment)} from {proposal.equalization_payor}
          </p>
        </div>
      )}
      <p className="text-xs text-center text-gray-400">
        Split: {proposal.total_to_husband + proposal.total_to_wife > 0
          ? `${Math.round((proposal.total_to_husband / (proposal.total_to_husband + proposal.total_to_wife)) * 100)}/${Math.round((proposal.total_to_wife / (proposal.total_to_husband + proposal.total_to_wife)) * 100)}`
          : '—'}
      </p>
    </div>
  )
}

// ============================================================================
// SupportSummary
// ============================================================================
function SupportSummary({ support, label }: { support?: SettlementProposal['spousal_support'] extends (infer U)[] | undefined ? U : never; label: string }) {
  if (!support) {
    return (
      <div className="text-center py-4 text-sm text-gray-400">
        No spousal support terms in Proposal {label}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="bg-gray-50 rounded p-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-gray-500">Type</p>
            <p className="font-medium">{SUPPORT_TYPE_INFO[support.support_type]?.label || support.support_type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Monthly</p>
            <p className="font-bold text-green-600">{formatCurrency(support.monthly_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Payor</p>
            <p className="font-medium capitalize">{support.payor}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Duration</p>
            <p className="font-medium">
              {support.duration_months ? `${support.duration_months} months` : 'Permanent'}
            </p>
          </div>
        </div>
        {support.step_down_schedule && support.step_down_schedule.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Step-Down Schedule</p>
            {support.step_down_schedule.map((s: { month: number; amount: number }, i: number) => (
              <p key={i} className="text-xs text-gray-600">
                Month {s.month}: {formatCurrency(s.amount)}
              </p>
            ))}
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">Total NPV</p>
          <p className="font-bold text-gray-900">{formatCurrency(support.total_npv)}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ChildSupportSummary
// ============================================================================
function ChildSupportSummary({ child, label }: { child?: SettlementProposal['child_support'] extends (infer U)[] | undefined ? U : never; label: string }) {
  if (!child) {
    return (
      <div className="text-center py-4 text-sm text-gray-400">
        No child support terms in Proposal {label}
      </div>
    )
  }
  return (
    <div className="bg-gray-50 rounded p-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-gray-500">Guideline</p>
          <p className="font-medium">{formatCurrency(child.guideline_amount)}/mo</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Proposed</p>
          <p className="font-bold text-green-600">{formatCurrency(child.proposed_amount)}/mo</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Payor</p>
          <p className="font-medium capitalize">{child.payor}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Deviation</p>
          <p className="font-medium capitalize">{child.deviation_type}</p>
        </div>
        {child.health_insurance_monthly_cost > 0 && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Health Insurance</p>
            <p className="text-sm">{formatCurrency(child.health_insurance_monthly_cost)}/mo — {child.health_insurance_provider}</p>
          </div>
        )}
        {child.childcare_monthly_cost > 0 && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Childcare</p>
            <p className="text-sm">{formatCurrency(child.childcare_monthly_cost)}/mo — {child.childcare_provider}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// CustodySummary
// ============================================================================
function CustodySummary({ custody, label }: { custody?: SettlementProposal['custody'] extends (infer U)[] | undefined ? U : never; label: string }) {
  if (!custody) {
    return (
      <div className="text-center py-4 text-sm text-gray-400">
        No custody terms in Proposal {label}
      </div>
    )
  }
  return (
    <div className="bg-gray-50 rounded p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-gray-500">Legal Custody</p>
          <p className="font-medium">{LEGAL_CUSTODY_INFO[custody.legal_custody]?.label || custody.legal_custody}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Physical Custody</p>
          <p className="font-medium">{PHYSICAL_CUSTODY_INFO[custody.physical_custody]?.label || custody.physical_custody}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Schedule</p>
          <p className="font-medium">{SCHEDULE_TYPE_INFO[custody.schedule_type]?.label || custody.schedule_type}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Time Split</p>
          <p className="font-bold">{custody.husband_percentage}/{custody.wife_percentage}</p>
        </div>
      </div>
      <div className="pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-1">Decision Making</p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <span>Education: <strong className="capitalize">{custody.decision_education}</strong></span>
          <span>Medical: <strong className="capitalize">{custody.decision_medical}</strong></span>
          <span>Religious: <strong className="capitalize">{custody.decision_religious}</strong></span>
          <span>Activities: <strong className="capitalize">{custody.decision_extracurricular}</strong></span>
        </div>
      </div>
      {custody.right_of_first_refusal_hours && (
        <p className="text-xs text-gray-600">ROFR: {custody.right_of_first_refusal_hours}+ hours</p>
      )}
      {custody.relocation_restriction_miles && (
        <p className="text-xs text-gray-600">Relocation: {custody.relocation_restriction_miles} mile limit, {custody.relocation_notice_days} day notice</p>
      )}
    </div>
  )
}

// ============================================================================
// OtherTermsList
// ============================================================================
function OtherTermsList({ terms, label }: { terms: SettlementProposal['other_terms'] extends (infer U)[] | undefined ? U[] : never[]; label: string }) {
  if (!terms || terms.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-400">
        No other terms in Proposal {label}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {terms.map((term, i) => (
        <div key={i} className="bg-gray-50 rounded p-2">
          <p className="text-sm font-medium text-gray-900">{term.term_title}</p>
          <p className="text-xs text-gray-500 capitalize">{term.category} &middot; {term.responsible_party}</p>
          {term.term_description && (
            <p className="text-xs text-gray-600 mt-1">{term.term_description}</p>
          )}
          {term.amount && term.amount > 0 && (
            <p className="text-xs font-semibold text-gray-700 mt-1">{formatCurrency(term.amount)}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// ComparisonSection
// ============================================================================
function ComparisonSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}
