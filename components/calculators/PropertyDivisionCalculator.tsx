'use client'

import { useState } from 'react'
import { Scale, Plus, Trash2, Calculator, ArrowRight } from 'lucide-react'
import { Asset, PropertyDivisionResult, EquitableDistributionFactors, EquitableDistributionResult } from '@/types/calculators'
import { calculateCommunityPropertyDivision } from '@/lib/communityPropertyCalculator'
import { calculateEquitableDistribution } from '@/lib/equitableDistributionCalculator'

interface PropertyDivisionCalculatorProps {
  caseId: string
  stateCode: string
  marriageDate?: string
  separationDate?: string
}

const EMPTY_ASSET: Omit<Asset, 'id'> = {
  name: '',
  current_value: 0,
  acquisition_date: '',
  owner: 'joint',
}

export default function PropertyDivisionCalculator({
  caseId: _caseId,
  stateCode,
  marriageDate,
  separationDate,
}: PropertyDivisionCalculatorProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [result, setResult] = useState<PropertyDivisionResult | null>(null)
  const [eqResult, setEqResult] = useState<EquitableDistributionResult | null>(null)
  const [mDate, setMDate] = useState(marriageDate || '')
  const [sDate, setSDate] = useState(separationDate || '')
  const [step, setStep] = useState<'input' | 'results'>('input')

  // FL equitable distribution factors
  const [eqFactors, setEqFactors] = useState<EquitableDistributionFactors>({
    marriage_duration_years: 0,
    wife_contributions_financial: 5,
    wife_contributions_homemaking: 5,
    husband_contributions_financial: 5,
    husband_contributions_homemaking: 5,
    wife_career_sacrifices: false,
    husband_career_sacrifices: false,
    wife_future_earning_capacity: 50000,
    husband_future_earning_capacity: 50000,
    wife_health_age: 7,
    husband_health_age: 7,
    prenup_exists: false,
  })

  const isCommunityProperty = stateCode === 'CA' || stateCode === 'TX'

  const addAsset = () => {
    setAssets((prev) => [...prev, { ...EMPTY_ASSET, id: crypto.randomUUID() }])
  }

  const updateAsset = (id: string, field: keyof Asset, value: string | number) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    )
  }

  const removeAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id))
  }

  const handleCalculate = () => {
    if (isCommunityProperty) {
      const r = calculateCommunityPropertyDivision({
        assets,
        marriage_date: mDate,
        separation_date: sDate || undefined,
        state_code: stateCode as 'CA' | 'TX' | 'FL',
      })
      setResult(r)
    } else {
      // FL: need marriage duration for factors
      const start = new Date(mDate)
      const end = sDate ? new Date(sDate) : new Date()
      const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      const updatedFactors = { ...eqFactors, marriage_duration_years: Math.round(years * 10) / 10 }
      setEqFactors(updatedFactors)

      // For FL, classify everything as marital for the equitable calc
      const maritalAssets = assets.filter(
        (a) => a.owner === 'joint' || !a.owner
      )
      const eqR = calculateEquitableDistribution(maritalAssets, updatedFactors)
      setEqResult(eqR)

      // Also run community property classifier for the asset table
      const r = calculateCommunityPropertyDivision({
        assets,
        marriage_date: mDate,
        separation_date: sDate || undefined,
        state_code: 'FL',
      })
      setResult(r)
    }
    setStep('results')
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Scale className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Property Division Calculator — {stateCode}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {isCommunityProperty ? 'Community Property' : 'Equitable Distribution'}
        </span>
      </div>

      {step === 'input' && (
        <>
          {/* Dates */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Marriage Timeline</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marriage Date</label>
                <input
                  type="date"
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Separation Date {stateCode === 'CA' ? '(significant for CA)' : '(optional)'}
                </label>
                <input
                  type="date"
                  value={sDate}
                  onChange={(e) => setSDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Assets */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Assets ({assets.length})</h4>
              <button
                onClick={addAsset}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Asset
              </button>
            </div>

            {assets.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Add assets to classify and divide. Include real estate, bank accounts, retirement accounts, vehicles, etc.
              </p>
            )}

            {assets.map((asset) => (
              <div key={asset.id} className="grid grid-cols-12 gap-2 items-end border-b border-gray-100 pb-3">
                <div className="col-span-3">
                  <label className="block text-xs text-gray-500 mb-1">Asset Name</label>
                  <input
                    type="text"
                    value={asset.name}
                    onChange={(e) => updateAsset(asset.id, 'name', e.target.value)}
                    placeholder="e.g. Family Home"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Value</label>
                  <input
                    type="number"
                    value={asset.current_value || ''}
                    onChange={(e) => updateAsset(asset.id, 'current_value', Number(e.target.value))}
                    placeholder="$0"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Acquired</label>
                  <input
                    type="date"
                    value={asset.acquisition_date}
                    onChange={(e) => updateAsset(asset.id, 'acquisition_date', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Owner</label>
                  <select
                    value={asset.owner || 'joint'}
                    onChange={(e) => updateAsset(asset.id, 'owner', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="joint">Joint</option>
                    <option value="wife">Wife</option>
                    <option value="husband">Husband</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Source</label>
                  <select
                    value={asset.source_of_funds || 'community'}
                    onChange={(e) => updateAsset(asset.id, 'source_of_funds', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="community">Community</option>
                    <option value="separate_wife">Separate (Wife)</option>
                    <option value="separate_husband">Separate (Husband)</option>
                    <option value="gift">Gift</option>
                    <option value="inheritance">Inheritance</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* FL: Equitable Distribution Factors */}
          {!isCommunityProperty && (
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Equitable Distribution Factors (FL)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Wife Financial Contributions (1-10)', key: 'wife_contributions_financial' as const },
                  { label: 'Husband Financial Contributions (1-10)', key: 'husband_contributions_financial' as const },
                  { label: 'Wife Homemaking Contributions (1-10)', key: 'wife_contributions_homemaking' as const },
                  { label: 'Husband Homemaking Contributions (1-10)', key: 'husband_contributions_homemaking' as const },
                  { label: 'Wife Future Annual Earning Capacity ($)', key: 'wife_future_earning_capacity' as const },
                  { label: 'Husband Future Annual Earning Capacity ($)', key: 'husband_future_earning_capacity' as const },
                  { label: 'Wife Health/Age Score (1-10, 10=best)', key: 'wife_health_age' as const },
                  { label: 'Husband Health/Age Score (1-10, 10=best)', key: 'husband_health_age' as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input
                      type="number"
                      value={eqFactors[key]}
                      onChange={(e) => setEqFactors((f) => ({ ...f, [key]: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eqFactors.wife_career_sacrifices}
                    onChange={(e) => setEqFactors((f) => ({ ...f, wife_career_sacrifices: e.target.checked }))}
                    className="text-green-600"
                  />
                  <span className="text-sm text-gray-700">Wife made career sacrifices</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eqFactors.husband_career_sacrifices}
                    onChange={(e) => setEqFactors((f) => ({ ...f, husband_career_sacrifices: e.target.checked }))}
                    className="text-green-600"
                  />
                  <span className="text-sm text-gray-700">Husband made career sacrifices</span>
                </label>
              </div>
            </div>
          )}

          <button
            onClick={handleCalculate}
            disabled={assets.length === 0 || !mDate}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calculator className="w-4 h-4" /> Calculate Division
          </button>
        </>
      )}

      {step === 'results' && result && (
        <div className="space-y-6">
          <button
            onClick={() => setStep('input')}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            &larr; Edit Inputs
          </button>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
              <p className="text-xs text-green-600 font-medium">Community / Marital</p>
              <p className="text-2xl font-bold text-green-700">{fmt(result.community_total)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
              <p className="text-xs text-blue-600 font-medium">Wife&apos;s Separate</p>
              <p className="text-2xl font-bold text-blue-700">{fmt(result.separate_wife_total)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg border border-purple-200 p-4 text-center">
              <p className="text-xs text-purple-600 font-medium">Husband&apos;s Separate</p>
              <p className="text-2xl font-bold text-purple-700">{fmt(result.separate_husband_total)}</p>
            </div>
          </div>

          {/* FL equitable split */}
          {eqResult && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Recommended Equitable Split (FL)</h4>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1 bg-blue-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600">Wife</p>
                  <p className="text-xl font-bold text-blue-700">{eqResult.recommended_wife_percentage}%</p>
                  <p className="text-sm text-blue-600">{fmt(eqResult.wife_share_amount)}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 bg-purple-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-purple-600">Husband</p>
                  <p className="text-xl font-bold text-purple-700">{eqResult.recommended_husband_percentage}%</p>
                  <p className="text-sm text-purple-600">{fmt(eqResult.husband_share_amount)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">{eqResult.justification}</p>
              {eqResult.factors_considered.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 font-medium">Factors applied:</p>
                  <ul className="list-disc list-inside text-xs text-gray-500">
                    {eqResult.factors_considered.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Asset classification table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Asset</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Classification</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Reasoning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...result.community_assets, ...result.separate_wife_assets, ...result.separate_husband_assets].map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(a.current_value)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.classification === 'community' ? 'bg-green-100 text-green-700' :
                        a.classification === 'separate_wife' ? 'bg-blue-100 text-blue-700' :
                        a.classification === 'separate_husband' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.classification.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">{a.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Proposed division (community property states) */}
          {isCommunityProperty && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Proposed 50/50 Division</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-blue-600 font-medium mb-2">Wife Receives</p>
                  {result.recommended_division.wife_receives.map((a) => (
                    <div key={a.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                      <span className="text-gray-700">{a.name}</span>
                      <span className="font-medium">{fmt(a.current_value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 font-semibold text-blue-700">
                    <span>Total</span>
                    <span>{fmt(result.recommended_division.wife_total)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-purple-600 font-medium mb-2">Husband Receives</p>
                  {result.recommended_division.husband_receives.map((a) => (
                    <div key={a.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                      <span className="text-gray-700">{a.name}</span>
                      <span className="font-medium">{fmt(a.current_value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 font-semibold text-purple-700">
                    <span>Total</span>
                    <span>{fmt(result.recommended_division.husband_total)}</span>
                  </div>
                </div>
              </div>
              {result.recommended_division.payment_direction !== 'none' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">Equalizing payment needed:</span>{' '}
                    {fmt(result.recommended_division.equalizing_payment)} from{' '}
                    {result.recommended_division.payment_direction === 'wife_to_husband' ? 'Wife to Husband' : 'Husband to Wife'}
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 italic">
            This is an estimate for attorney review. Attorney should verify all classifications
            and adjust the proposed division based on case-specific circumstances.
          </p>
        </div>
      )}
    </div>
  )
}
