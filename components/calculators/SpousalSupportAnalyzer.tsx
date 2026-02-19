'use client'

import { useState } from 'react'
import { Heart, Calculator, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { SpousalSupportInput, SpousalSupportResult } from '@/types/calculators'
import { analyzeSpousalSupport } from '@/lib/spousalSupportAnalyzer'

interface SpousalSupportAnalyzerProps {
  caseId: string
  stateCode: string
}

export default function SpousalSupportAnalyzerComponent({
  caseId: _caseId,
  stateCode,
}: SpousalSupportAnalyzerProps) {
  const [input, setInput] = useState<SpousalSupportInput>({
    wife_net_monthly_income: 0,
    husband_net_monthly_income: 0,
    wife_gross_monthly_income: 0,
    husband_gross_monthly_income: 0,
    marriage_date: '',
    separation_date: '',
    family_violence_within_2_years: false,
  })
  const [result, setResult] = useState<SpousalSupportResult | null>(null)

  const handleAnalyze = () => {
    try {
      const r = analyzeSpousalSupport(stateCode, input)
      setResult(r)
    } catch {
      // unsupported state
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-rose-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Spousal Support Analyzer — {stateCode}
        </h3>
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">Income & Marriage Details</h4>
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
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="0"
              />
            </div>
          </div>

          {stateCode === 'TX' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wife&apos;s Gross Monthly Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={input.wife_gross_monthly_income || ''}
                    onChange={(e) => setInput((p) => ({ ...p, wife_gross_monthly_income: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Husband&apos;s Gross Monthly Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={input.husband_gross_monthly_income || ''}
                    onChange={(e) => setInput((p) => ({ ...p, husband_gross_monthly_income: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marriage Date</label>
            <input
              type="date"
              value={input.marriage_date}
              onChange={(e) => setInput((p) => ({ ...p, marriage_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Separation Date</label>
            <input
              type="date"
              value={input.separation_date}
              onChange={(e) => setInput((p) => ({ ...p, separation_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {stateCode === 'TX' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={input.family_violence_within_2_years}
              onChange={(e) => setInput((p) => ({ ...p, family_violence_within_2_years: e.target.checked }))}
              className="text-rose-600"
            />
            <span className="text-sm text-gray-700">Family violence within 2 years of filing</span>
          </label>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!input.marriage_date}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Calculator className="w-4 h-4" /> Analyze Support
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Eligibility */}
          {!result.eligible ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">Not Eligible for Spousal Support</p>
                  <p className="text-xs text-red-700 mt-1">{result.recommendations[0]}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Big result */}
              <div className="bg-rose-50 border-2 border-rose-200 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Estimated Monthly Spousal Support</p>
                    <p className="text-4xl font-bold text-rose-600">{fmt(result.monthly_support)}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium capitalize">{result.payor}</span> pays{' '}
                      <span className="font-medium capitalize">{result.recipient}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="text-lg font-semibold text-gray-700">
                      {result.estimated_duration_months === 'indefinite'
                        ? 'Indefinite'
                        : `${result.estimated_duration_months} months`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Marriage duration badge */}
              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  result.is_long_term_marriage ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {result.is_long_term_marriage ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                  {result.marriage_duration.years} years, {result.marriage_duration.months} months
                  {result.is_long_term_marriage ? ' (Long-term)' : ' (Short/Moderate-term)'}
                </div>
              </div>

              {/* Temporary vs Permanent */}
              {result.temporary_support_estimate !== undefined && result.permanent_support_estimate !== undefined && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 font-medium">Temporary Support (during proceedings)</p>
                    <p className="text-xl font-bold text-gray-900">{fmt(result.temporary_support_estimate)}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 font-medium">Permanent Support (estimate)</p>
                    <p className="text-xl font-bold text-gray-900">{fmt(result.permanent_support_estimate)}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Factors analysis */}
          {result.factors_analysis.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Statutory Factors</h4>
              <div className="space-y-3">
                {result.factors_analysis.map((f, i) => (
                  <div key={i} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">{f.factor}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        f.weight === 'High' ? 'bg-red-100 text-red-700' :
                        f.weight === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {f.weight}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{f.analysis}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-2">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                <Info className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <p>{rec}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 italic">
            These estimates are for attorney guidance only. Actual support orders are subject to
            judicial discretion and consideration of all statutory factors.
          </p>
        </div>
      )}
    </div>
  )
}
