'use client'

import { useState } from 'react'
import { DollarSign, Calculator, Info } from 'lucide-react'
import { ChildSupportInput, ChildSupportResult } from '@/types/calculators'
import { calculateChildSupport } from '@/lib/childSupportCalculator'

interface ChildSupportCalculatorProps {
  caseId: string
  stateCode: string
  hasChildren?: boolean
}

export default function ChildSupportCalculator({
  caseId,
  stateCode,
  hasChildren,
}: ChildSupportCalculatorProps) {
  const [input, setInput] = useState<ChildSupportInput>({
    wife_net_monthly_income: 0,
    husband_net_monthly_income: 0,
    children_count: 1,
    wife_timeshare_percentage: 65,
    primary_custody_parent: 'wife',
    wife_annual_overnights: 255,
  })
  const [result, setResult] = useState<ChildSupportResult | null>(null)

  if (hasChildren === false) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
        <DollarSign className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No children involved — child support not applicable.</p>
      </div>
    )
  }

  const handleCalculate = () => {
    try {
      const r = calculateChildSupport(stateCode, input)
      setResult(r)
    } catch {
      // unsupported state
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

  const methodLabel =
    stateCode === 'CA' ? 'Guideline (algebraic formula)' :
    stateCode === 'TX' ? 'Percentage of net resources' :
    stateCode === 'FL' ? 'Income shares model' : 'State guideline'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Child Support Calculator — {stateCode}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
          {methodLabel}
        </span>
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">Income & Custody Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wife&apos;s Net Monthly Income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={input.wife_net_monthly_income || ''}
                onChange={(e) => setInput((p) => ({ ...p, wife_net_monthly_income: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Husband&apos;s Net Monthly Income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={input.husband_net_monthly_income || ''}
                onChange={(e) => setInput((p) => ({ ...p, husband_net_monthly_income: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Children
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={input.children_count}
              onChange={(e) => setInput((p) => ({ ...p, children_count: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* State-specific inputs */}
          {stateCode === 'CA' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wife&apos;s Timeshare % (physical custody time)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={input.wife_timeshare_percentage}
                onChange={(e) => setInput((p) => ({ ...p, wife_timeshare_percentage: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Husband&apos;s timeshare: {100 - (input.wife_timeshare_percentage ?? 50)}%
              </p>
            </div>
          )}

          {stateCode === 'TX' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Custody Parent
              </label>
              <select
                value={input.primary_custody_parent}
                onChange={(e) => setInput((p) => ({ ...p, primary_custody_parent: e.target.value as 'wife' | 'husband' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="wife">Wife (Custodial Parent)</option>
                <option value="husband">Husband (Custodial Parent)</option>
              </select>
            </div>
          )}

          {stateCode === 'FL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wife&apos;s Annual Overnights
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={input.wife_annual_overnights}
                onChange={(e) => setInput((p) => ({ ...p, wife_annual_overnights: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Husband&apos;s overnights: {365 - (input.wife_annual_overnights ?? 255)}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleCalculate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Calculator className="w-4 h-4" /> Calculate Support
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Big result card */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Child Support</p>
                <p className="text-4xl font-bold text-blue-600">{fmt(result.monthly_support)}</p>
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium capitalize">{result.payor}</span> pays{' '}
                  <span className="font-medium capitalize">{result.recipient}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Annual total</p>
                <p className="text-lg font-semibold text-gray-700">{fmt(result.monthly_support * 12)}</p>
              </div>
            </div>
          </div>

          {/* Formula explanation */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-500" />
              <h4 className="text-sm font-semibold text-gray-900">Calculation Method</h4>
            </div>
            <p className="text-sm font-mono text-gray-700 bg-gray-50 rounded p-3">
              {result.formula_explanation}
            </p>
          </div>

          {/* Details table */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Calculation Details</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {Object.entries(result.details).map(([key, val]) => (
                <div key={key}>
                  <dt className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                  <dd className="font-medium text-gray-900">
                    {typeof val === 'number' && key.includes('income')
                      ? fmt(val)
                      : typeof val === 'number' && key.includes('percentage')
                      ? `${val}%`
                      : String(val)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Adjustments note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <span className="font-medium">Possible adjustments:</span> Health insurance, childcare expenses,
              educational costs, special needs, other children of payor. Attorney may adjust the guideline
              amount based on these factors.
            </p>
          </div>

          <p className="text-xs text-gray-400 italic">
            This is a guideline estimate. Actual court-ordered support may differ based on
            judicial discretion and additional factors.
          </p>
        </div>
      )}
    </div>
  )
}
