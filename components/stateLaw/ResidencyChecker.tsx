'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, AlertCircle, Home, Shield, Info } from 'lucide-react'
import { verifyResidency } from '@/lib/residencyChecker'
import { getStateData } from '@/lib/stateData'
import { ResidencyResult, STATE_NAMES } from '@/types/stateLaw'

interface ResidencyCheckerProps {
  caseId: string
  stateCode: string
  initialStateMoveIn?: string
  initialCountyMoveIn?: string
}

export default function ResidencyChecker({
  caseId: _caseId,
  stateCode,
  initialStateMoveIn,
  initialCountyMoveIn,
}: ResidencyCheckerProps) {
  const [stateMoveIn, setStateMoveIn] = useState(initialStateMoveIn || '')
  const [countyMoveIn, setCountyMoveIn] = useState(initialCountyMoveIn || '')
  const [result, setResult] = useState<ResidencyResult | null>(null)

  const stateData = getStateData(stateCode)
  const stateName = STATE_NAMES[stateCode] || stateCode

  const handleVerify = () => {
    const r = verifyResidency({
      stateCode,
      stateMoveInDate: stateMoveIn || null,
      countyMoveInDate: countyMoveIn || null,
    })
    setResult(r)
  }

  const progressPct = (current: number, required: number) =>
    required === 0 ? 100 : Math.min(100, Math.round((current / required) * 100))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Home className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Residency Verification — {stateName}
        </h3>
      </div>

      {/* Input fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State Move-in Date
          </label>
          <input
            type="date"
            value={stateMoveIn}
            onChange={(e) => setStateMoveIn(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            When did the client begin living in {stateName}?
          </p>
        </div>
        {stateData && stateData.residency.county_months > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              County Move-in Date
            </label>
            <input
              type="date"
              value={countyMoveIn}
              onChange={(e) => setCountyMoveIn(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              When did the client begin living in the filing county?
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleVerify}
        disabled={!stateMoveIn}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Verify Residency
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* State requirement */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">State Residency</span>
                {result.meets_state_requirement ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3" /> Met
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    <Clock className="w-3 h-3" /> Not Met
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {result.state_residency_days} / {result.state_required_days} days
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  result.meets_state_requirement ? 'bg-green-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${progressPct(result.state_residency_days, result.state_required_days)}%` }}
              />
            </div>
          </div>

          {/* County requirement */}
          {result.county_required_days > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">County Residency</span>
                  {result.meets_county_requirement ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle2 className="w-3 h-3" /> Met
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      <Clock className="w-3 h-3" /> Not Met
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {result.county_residency_days} / {result.county_required_days} days
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    result.meets_county_requirement ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${progressPct(result.county_residency_days, result.county_required_days)}%` }}
                />
              </div>
            </div>
          )}

          {/* Overall status */}
          {result.meets_state_requirement && result.meets_county_requirement ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Eligible to File</p>
                  <p className="text-xs text-green-700">All residency requirements for {stateName} are met.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Cannot File Yet</p>
                  {result.can_file_on && (
                    <p className="text-xs text-yellow-700">
                      Client will be eligible on{' '}
                      {new Date(result.can_file_on).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-2">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p>{rec}</p>
              </div>
            ))}
          </div>

          {/* Required proof documents */}
          {stateData && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-semibold text-gray-900">Required Proof Documents</h4>
              </div>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {stateData.residency.proof_documents.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-3">
                Minimum: {stateData.residency.minimum_proof}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stateData.residency.statute}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
