'use client'

import { useState } from 'react'
import { Map, Info, ChevronRight } from 'lucide-react'
import StateComparisonTool from './StateComparisonTool'
import { STATE_NAMES } from '@/types/stateLaw'

interface CaseByState {
  state: string
  count: number
  cases: { id: string; client_name: string; status: string; filing_date: string | null }[]
}

interface MultiStateDashboardProps {
  casesByState: CaseByState[]
  onCaseClick?: (caseId: string) => void
}

const STATE_NOTES: Record<string, string> = {
  CA: '6-month waiting period from service. Mandatory financial disclosures required within 60 days.',
  TX: '60-day waiting period from filing. Community property state with "just and right" division.',
  FL: '20-day waiting period (waivable). Equitable distribution. 2023 alimony reforms in effect.',
}

export default function MultiStateDashboard({ casesByState, onCaseClick }: MultiStateDashboardProps) {
  const [activeState, setActiveState] = useState<string>('all')

  const totalCases = casesByState.reduce((sum, s) => sum + s.count, 0)

  const filteredCases = activeState === 'all'
    ? casesByState
    : casesByState.filter((s) => s.state === activeState)

  const allCasesList = filteredCases.flatMap((s) =>
    s.cases.map((c) => ({ ...c, state: s.state }))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Map className="w-5 h-5 text-teal-600" />
        <h3 className="text-lg font-semibold text-gray-900">Multi-State Case Dashboard</h3>
      </div>

      {/* State summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveState('all')}
          className={`rounded-lg border p-4 text-left transition-colors ${
            activeState === 'all' ? 'bg-teal-50 border-teal-300' : 'bg-white border-gray-200 hover:border-teal-200'
          }`}
        >
          <p className="text-xs text-gray-500 font-medium">All States</p>
          <p className="text-3xl font-bold text-teal-600">{totalCases}</p>
          <p className="text-xs text-gray-500">active cases</p>
        </button>

        {casesByState.map((s) => (
          <button
            key={s.state}
            onClick={() => setActiveState(s.state)}
            className={`rounded-lg border p-4 text-left transition-colors ${
              activeState === s.state ? 'bg-teal-50 border-teal-300' : 'bg-white border-gray-200 hover:border-teal-200'
            }`}
          >
            <p className="text-xs text-gray-500 font-medium">{STATE_NAMES[s.state] || s.state}</p>
            <p className="text-3xl font-bold text-gray-900">{s.count}</p>
            <p className="text-xs text-gray-500">cases</p>
          </button>
        ))}
      </div>

      {/* State-specific note */}
      {activeState !== 'all' && STATE_NOTES[activeState] && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">{STATE_NOTES[activeState]}</p>
        </div>
      )}

      {/* Cases table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {activeState === 'all' && (
                <th className="text-left px-4 py-3 font-medium text-gray-500">State</th>
              )}
              <th className="text-left px-4 py-3 font-medium text-gray-500">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Filed</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allCasesList.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No cases found for this filter.
                </td>
              </tr>
            )}
            {allCasesList.map((c) => (
              <tr
                key={c.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onCaseClick?.(c.id)}
              >
                {activeState === 'all' && (
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {c.state}
                    </span>
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-gray-900">{c.client_name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    c.status === 'settlement' ? 'bg-yellow-100 text-yellow-700' :
                    c.status === 'finalized' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {c.filing_date
                    ? new Date(c.filing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Not filed'}
                </td>
                <td className="px-4 py-3 text-right">
                  <ChevronRight className="w-4 h-4 text-gray-400 inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* State comparison */}
      <StateComparisonTool />
    </div>
  )
}
