'use client'

import { useState, useMemo } from 'react'
import { ArrowLeftRight, AlertTriangle } from 'lucide-react'
import { compareStates, getComparableStates } from '@/lib/stateComparison'
import { getStateRules } from '@/lib/data/stateRules'

export default function StateComparisonTool() {
  const comparableStates = useMemo(() => getComparableStates(), [])
  const [state1, setState1] = useState('CA')
  const [state2, setState2] = useState('TX')

  const rows = useMemo(() => compareStates([state1, state2]), [state1, state2])

  // Check verification status
  const rules1 = useMemo(() => getStateRules(state1), [state1])
  const rules2 = useMemo(() => getStateRules(state2), [state2])
  const hasUnverified = (rules1 && !rules1.verified) || (rules2 && !rules2.verified)

  // Group rows by category
  const categories = useMemo(() => {
    const cats: { name: string; rows: typeof rows }[] = []
    const seen = new Set<string>()
    for (const row of rows) {
      if (!seen.has(row.category)) {
        seen.add(row.category)
        cats.push({ name: row.category, rows: rows.filter((r) => r.category === row.category) })
      }
    }
    return cats
  }, [rows])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="w-5 h-5 text-violet-600" />
        <h3 className="text-lg font-semibold text-gray-900">Compare State Requirements</h3>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
          All 50 states
        </span>
      </div>

      {/* State selectors */}
      <div className="flex items-center gap-4">
        <select
          value={state1}
          onChange={(e) => setState1(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {comparableStates.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
        <span className="text-gray-400 font-medium">vs</span>
        <select
          value={state2}
          onChange={(e) => setState2(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {comparableStates.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
      </div>

      {state1 === state2 && (
        <p className="text-sm text-yellow-600">Select two different states to compare.</p>
      )}

      {/* Unverified disclaimer */}
      {hasUnverified && state1 !== state2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Some data for the selected states has not yet been verified by an attorney.
            Please confirm details with state-specific legal resources before relying on this information.
          </p>
        </div>
      )}

      {state1 !== state2 && rows.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-1/3">Requirement</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-1/3">
                  {comparableStates.find((s) => s.code === state1)?.name || state1}
                  {rules1 && !rules1.verified && <span className="text-amber-500 ml-1">*</span>}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-1/3">
                  {comparableStates.find((s) => s.code === state2)?.name || state2}
                  {rules2 && !rules2.verified && <span className="text-amber-500 ml-1">*</span>}
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <>
                  <tr key={`cat-${cat.name}`} className="bg-gray-50">
                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {cat.name}
                    </td>
                  </tr>
                  {cat.rows.map((row, i) => {
                    const val1 = row.values[state1] || '—'
                    const val2 = row.values[state2] || '—'
                    const isDifferent = val1 !== val2
                    return (
                      <tr key={`${cat.name}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{row.label}</td>
                        <td className={`px-4 py-3 ${isDifferent ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                          {val1}
                        </td>
                        <td className={`px-4 py-3 ${isDifferent ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                          {val2}
                        </td>
                      </tr>
                    )
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
