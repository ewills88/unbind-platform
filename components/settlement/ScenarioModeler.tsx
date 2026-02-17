'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Loader2, Star, Trash2, ArrowRight, CheckCircle, XCircle,
  Copy, Edit, GitCompare,
} from 'lucide-react'
import type { SettlementScenario, SettlementProposal, ScenarioPropertyItem, PropertyAllocation } from '@/types/settlement'
import { formatCurrency, calculateScenarioTotals, calculateAllocation } from '@/types/settlement'

interface Props {
  caseId: string
}

export default function ScenarioModeler({ caseId }: Props) {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<SettlementScenario[]>([])
  const [proposals, setProposals] = useState<SettlementProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeScenario, setActiveScenario] = useState<Partial<SettlementScenario> | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCopyMenu, setShowCopyMenu] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [scenRes, propRes] = await Promise.all([
        fetch(`/api/cases/${caseId}/scenarios`),
        fetch(`/api/cases/${caseId}/proposals`),
      ])
      if (scenRes.ok) {
        const d = await scenRes.json()
        setScenarios(d.data || [])
      }
      if (propRes.ok) {
        const d = await propRes.json()
        setProposals(d.data || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { fetchData() }, [fetchData])

  // Live calculation of totals for active scenario
  const liveTotals = useMemo(() => {
    if (!activeScenario) return null
    return calculateScenarioTotals({
      property_allocation: (activeScenario.property_allocation || []) as ScenarioPropertyItem[],
      spousal_support: activeScenario.spousal_support as { monthly_amount?: number; payor?: string; duration_months?: number } | undefined,
    })
  }, [activeScenario])

  async function createNewScenario() {
    // Load existing assets and debts to pre-populate
    try {
      const [assetsRes, debtsRes] = await Promise.all([
        fetch(`/api/cases/${caseId}/assets`),
        fetch(`/api/cases/${caseId}/debts`),
      ])
      const assets = assetsRes.ok ? (await assetsRes.json()).data || [] : []
      const debts = debtsRes.ok ? (await debtsRes.json()).data || [] : []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const propertyItems: ScenarioPropertyItem[] = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...assets.map((a: any) => {
          const netValue = (a.current_value || 0) - (a.encumbrance || 0)
          return {
            item_type: 'asset' as const,
            description: a.description || a.name || 'Asset',
            category: a.category || '',
            gross_value: a.current_value || 0,
            encumbrance: a.encumbrance || 0,
            net_value: netValue,
            allocated_to: 'split' as PropertyAllocation,
            allocation_percentage: 50,
            husband_receives: netValue / 2,
            wife_receives: netValue / 2,
            asset_id: a.id,
          }
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...debts.map((d: any) => ({
          item_type: 'debt' as const,
          description: d.creditor_name || d.description || 'Debt',
          category: d.category || '',
          gross_value: d.current_balance || 0,
          encumbrance: 0,
          net_value: d.current_balance || 0,
          allocated_to: 'split' as PropertyAllocation,
          allocation_percentage: 50,
          husband_receives: (d.current_balance || 0) / 2,
          wife_receives: (d.current_balance || 0) / 2,
          debt_id: d.id,
        })),
      ]

      setActiveScenario({
        scenario_name: 'New Scenario',
        scenario_description: '',
        property_allocation: propertyItems,
        spousal_support: { support_type: 'none', payor: 'husband', monthly_amount: 0, duration_months: 0 },
        custody_terms: { physical_custody: 'joint', husband_percentage: 50, wife_percentage: 50 },
        pros: [],
        cons: [],
      })
    } catch {
      setActiveScenario({
        scenario_name: 'New Scenario',
        scenario_description: '',
        property_allocation: [],
        spousal_support: { support_type: 'none', payor: 'husband', monthly_amount: 0, duration_months: 0 },
        pros: [],
        cons: [],
      })
    }
  }

  async function copyFromProposal(proposalId: string) {
    try {
      const res = await fetch(`/api/proposals/${proposalId}`)
      if (!res.ok) return
      const d = await res.json()
      const p = d.data

      setActiveScenario({
        scenario_name: `Copy of ${p.title}`,
        scenario_description: '',
        base_proposal_id: proposalId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        property_allocation: (p.property_items || []).map((item: any) => ({
          item_type: item.item_type,
          description: item.description,
          category: item.category || '',
          gross_value: item.gross_value,
          encumbrance: item.encumbrance,
          net_value: item.net_value,
          allocated_to: item.allocated_to,
          allocation_percentage: item.allocation_percentage,
          husband_receives: item.husband_receives,
          wife_receives: item.wife_receives,
          asset_id: item.asset_id,
          debt_id: item.debt_id,
        })),
        spousal_support: p.spousal_support?.[0] || { support_type: 'none', payor: 'husband', monthly_amount: 0, duration_months: 0 },
        custody_terms: p.custody?.[0] || {},
        pros: [],
        cons: [],
      })
    } catch {
      // silently handle
    }
    setShowCopyMenu(false)
  }

  async function handleSaveScenario() {
    if (!activeScenario?.scenario_name?.trim()) return
    setSaving(true)
    try {
      if (activeScenario.id) {
        // Update existing
        await fetch(`/api/scenarios/${activeScenario.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activeScenario),
        })
      } else {
        // Create new
        await fetch(`/api/cases/${caseId}/scenarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activeScenario),
        })
      }
      fetchData()
      setActiveScenario(null)
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  async function handleConvertToProposal(scenarioId: string) {
    if (!confirm('Convert this scenario to a formal proposal draft?')) return
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'convert' }),
      })
      if (res.ok) {
        const d = await res.json()
        router.push(`/dashboard/cases/${caseId}/settlement/new`)
        fetchData()
      }
    } catch {
      // silently handle
    }
  }

  async function handleDeleteScenario(scenarioId: string) {
    if (!confirm('Delete this scenario?')) return
    try {
      await fetch(`/api/scenarios/${scenarioId}`, { method: 'DELETE' })
      fetchData()
    } catch {
      // silently handle
    }
  }

  async function handleToggleFavorite(scenario: SettlementScenario) {
    try {
      await fetch(`/api/scenarios/${scenario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !scenario.is_favorite }),
      })
      fetchData()
    } catch {
      // silently handle
    }
  }

  function updatePropertyAllocation(index: number, allocatedTo: PropertyAllocation) {
    if (!activeScenario?.property_allocation) return
    const updated = [...activeScenario.property_allocation] as ScenarioPropertyItem[]
    const item = updated[index]
    const { husband, wife } = calculateAllocation(item.net_value, allocatedTo, 50)
    updated[index] = { ...item, allocated_to: allocatedTo, husband_receives: husband, wife_receives: wife }
    setActiveScenario({ ...activeScenario, property_allocation: updated })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Scenario Modeler</h2>
          <p className="text-sm text-gray-500">&quot;What if&quot; analysis for settlement options</p>
        </div>
        {!activeScenario && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowCopyMenu(!showCopyMenu)}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" /> Copy From...
              </button>
              {showCopyMenu && proposals.length > 0 && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64">
                  <p className="text-xs font-medium text-gray-500 px-3 py-2">Existing Proposals</p>
                  {proposals.map(p => (
                    <button
                      key={p.id}
                      onClick={() => copyFromProposal(p.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-100"
                    >
                      #{p.proposal_number} — {p.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={createNewScenario}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> New Scenario
            </button>
          </div>
        )}
      </div>

      {/* Active Scenario Editor */}
      {activeScenario && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={activeScenario.scenario_name || ''}
                onChange={e => setActiveScenario({ ...activeScenario, scenario_name: e.target.value })}
                placeholder="Scenario Name"
                className="text-lg font-semibold text-gray-900 border-none bg-transparent p-0 w-full focus:outline-none focus:ring-0"
              />
              <input
                type="text"
                value={activeScenario.scenario_description || ''}
                onChange={e => setActiveScenario({ ...activeScenario, scenario_description: e.target.value })}
                placeholder="Brief description..."
                className="text-sm text-gray-500 border-none bg-transparent p-0 w-full focus:outline-none focus:ring-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveScenario(null)} className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleSaveScenario}
                disabled={saving}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Scenario'}
              </button>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Live Totals */}
            {liveTotals && (
              <div className="grid grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Husband Net</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(liveTotals.husband_total)}</p>
                  <p className="text-xs text-gray-400">{liveTotals.husband_percentage}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Wife Net</p>
                  <p className="text-xl font-bold text-pink-600">{formatCurrency(liveTotals.wife_total)}</p>
                  <p className="text-xs text-gray-400">{liveTotals.wife_percentage}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Monthly Support</p>
                  <p className="text-xl font-bold">
                    {liveTotals.monthly_support > 0 ? formatCurrency(liveTotals.monthly_support) : 'None'}
                  </p>
                  {liveTotals.support_payor && (
                    <p className="text-xs text-gray-400">
                      {liveTotals.support_payor === 'husband' ? 'H → W' : 'W → H'}
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Support NPV</p>
                  <p className="text-xl font-bold">{formatCurrency(liveTotals.support_npv)}</p>
                </div>
              </div>
            )}

            {/* Property Allocation */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Property Allocation</h3>
              <div className="space-y-2">
                {(activeScenario.property_allocation as ScenarioPropertyItem[] || []).map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                      <p className="text-xs text-gray-500">
                        {item.item_type === 'asset' ? 'Asset' : 'Debt'} &middot; Net: {formatCurrency(item.net_value)}
                      </p>
                    </div>
                    <select
                      value={item.allocated_to}
                      onChange={e => updatePropertyAllocation(index, e.target.value as PropertyAllocation)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
                    >
                      <option value="husband">Husband</option>
                      <option value="wife">Wife</option>
                      <option value="split">50/50</option>
                      <option value="sell">Sell</option>
                    </select>
                    <div className="w-20 text-right text-sm font-medium text-blue-600">
                      {formatCurrency(item.husband_receives)}
                    </div>
                    <div className="w-20 text-right text-sm font-medium text-pink-600">
                      {formatCurrency(item.wife_receives)}
                    </div>
                  </div>
                ))}
                {(!activeScenario.property_allocation || (activeScenario.property_allocation as ScenarioPropertyItem[]).length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No property items. Create a scenario from an existing proposal or add assets/debts to the case first.</p>
                )}
              </div>
            </div>

            {/* Spousal Support */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Spousal Support</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Payor</label>
                  <select
                    value={(activeScenario.spousal_support as Record<string, unknown>)?.payor as string || 'husband'}
                    onChange={e => setActiveScenario({
                      ...activeScenario,
                      spousal_support: { ...(activeScenario.spousal_support as Record<string, unknown>), payor: e.target.value },
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="husband">Husband</option>
                    <option value="wife">Wife</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Monthly Amount</label>
                  <input
                    type="number"
                    value={(activeScenario.spousal_support as Record<string, unknown>)?.monthly_amount as number || 0}
                    onChange={e => setActiveScenario({
                      ...activeScenario,
                      spousal_support: { ...(activeScenario.spousal_support as Record<string, unknown>), monthly_amount: parseFloat(e.target.value) || 0 },
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Duration (months)</label>
                  <input
                    type="number"
                    value={(activeScenario.spousal_support as Record<string, unknown>)?.duration_months as number || 0}
                    onChange={e => setActiveScenario({
                      ...activeScenario,
                      spousal_support: { ...(activeScenario.spousal_support as Record<string, unknown>), duration_months: parseInt(e.target.value) || 0 },
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">NPV</label>
                  <div className="h-[38px] flex items-center text-sm font-bold">
                    {formatCurrency(liveTotals?.support_npv || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Pros and Cons */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Pros</h3>
                <div className="space-y-2">
                  {(activeScenario.pros || []).map((pro, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <input
                        type="text"
                        value={pro}
                        onChange={e => {
                          const updated = [...(activeScenario.pros || [])]
                          updated[index] = e.target.value
                          setActiveScenario({ ...activeScenario, pros: updated })
                        }}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => {
                          const updated = (activeScenario.pros || []).filter((_, i) => i !== index)
                          setActiveScenario({ ...activeScenario, pros: updated })
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setActiveScenario({ ...activeScenario, pros: [...(activeScenario.pros || []), ''] })}
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                  >
                    <Plus className="w-3 h-3" /> Add Pro
                  </button>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Cons</h3>
                <div className="space-y-2">
                  {(activeScenario.cons || []).map((con, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <input
                        type="text"
                        value={con}
                        onChange={e => {
                          const updated = [...(activeScenario.cons || [])]
                          updated[index] = e.target.value
                          setActiveScenario({ ...activeScenario, cons: updated })
                        }}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => {
                          const updated = (activeScenario.cons || []).filter((_, i) => i !== index)
                          setActiveScenario({ ...activeScenario, cons: updated })
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setActiveScenario({ ...activeScenario, cons: [...(activeScenario.cons || []), ''] })}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                  >
                    <Plus className="w-3 h-3" /> Add Con
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Scenarios Grid */}
      {!activeScenario && scenarios.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map(scenario => {
            const totals = scenario.calculated_totals
            return (
              <div
                key={scenario.id}
                className={`bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow ${scenario.is_favorite ? 'border-yellow-400' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{scenario.scenario_name}</h4>
                    {scenario.scenario_description && (
                      <p className="text-xs text-gray-500 mt-0.5">{scenario.scenario_description}</p>
                    )}
                  </div>
                  <button onClick={() => handleToggleFavorite(scenario)} className="text-gray-300 hover:text-yellow-500">
                    <Star className={`w-4 h-4 ${scenario.is_favorite ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                  </button>
                </div>

                {totals && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Husband</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(totals.husband_total)}</p>
                      <p className="text-xs text-gray-400">{totals.husband_percentage}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Wife</p>
                      <p className="font-semibold text-pink-600">{formatCurrency(totals.wife_total)}</p>
                      <p className="text-xs text-gray-400">{totals.wife_percentage}%</p>
                    </div>
                  </div>
                )}

                {totals?.monthly_support > 0 && (
                  <p className="text-xs text-gray-600 mb-3">
                    Support: {formatCurrency(totals.monthly_support)}/mo ({totals.support_payor === 'husband' ? 'H→W' : 'W→H'})
                  </p>
                )}

                <div className="flex gap-3 text-xs mb-3">
                  {scenario.pros && scenario.pros.length > 0 && (
                    <span className="text-green-600">{scenario.pros.length} pros</span>
                  )}
                  {scenario.cons && scenario.cons.length > 0 && (
                    <span className="text-red-600">{scenario.cons.length} cons</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setActiveScenario(scenario)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-700 border border-gray-300 rounded px-2 py-1.5 hover:bg-gray-50"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleConvertToProposal(scenario.id)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs text-blue-700 border border-blue-300 rounded px-2 py-1.5 hover:bg-blue-50"
                  >
                    <ArrowRight className="w-3 h-3" /> To Proposal
                  </button>
                  <button
                    onClick={() => handleDeleteScenario(scenario.id)}
                    className="text-gray-400 hover:text-red-500 px-1.5 py-1.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!activeScenario && scenarios.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <GitCompare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No scenarios yet</p>
          <p className="text-sm mt-1">Create &quot;what if&quot; scenarios to explore different settlement options.</p>
        </div>
      )}
    </div>
  )
}
