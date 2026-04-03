'use client'

import { useState, useEffect } from 'react'
import {
  MapPin, Check, AlertCircle, FileText, Info,
  ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react'
import { StateRequirements } from '@/types/document-collaboration'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface StateSelectorProps {
  currentState: string
  onStateChange?: (stateCode: string) => void
  showRequirements?: boolean
}

const STATE_FLAGS: Record<string, string> = {
  CA: 'California',
  TX: 'Texas',
  FL: 'Florida',
  NY: 'New York',
  IL: 'Illinois'
}

export default function StateSelector({
  currentState,
  onStateChange,
  showRequirements = true
}: StateSelectorProps) {
  const [states, setStates] = useState<StateRequirements[]>([])
  const [selectedState, setSelectedState] = useState<StateRequirements | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchStates()
  }, [])

  useEffect(() => {
    if (currentState && states.length > 0) {
      const state = states.find(s => s.state_code === currentState)
      setSelectedState(state || null)
    }
  }, [currentState, states])

  async function fetchStates() {
    try {
      setLoading(true)
      const response = await authFetch('/api/states')
      if (response.ok) {
        const data = await response.json()
        setStates(data.states || [])
      }
    } catch (err) {
      console.error('Failed to fetch states:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleStateSelect(stateCode: string) {
    const state = states.find(s => s.state_code === stateCode)
    setSelectedState(state || null)
    onStateChange?.(stateCode)
    setExpanded(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">State Selection</span>
        </div>
      </div>

      {/* State Dropdown */}
      <div className="p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filing State
        </label>
        <div className="relative">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-3 border border-gray-300
                     rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500
                     focus:border-blue-500"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">
                {currentState === 'CA' ? '🇺🇸' : '🏛️'}
              </span>
              <span className="font-medium text-gray-900">
                {STATE_FLAGS[currentState] || currentState}
              </span>
            </span>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expanded && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200
                          rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {states.map((state) => (
                <button
                  key={state.state_code}
                  onClick={() => handleStateSelect(state.state_code)}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50
                           ${state.state_code === currentState ? 'bg-blue-50' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🏛️</span>
                    <span className="font-medium text-gray-900">{state.state_name}</span>
                  </span>
                  {state.state_code === currentState && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* State Requirements */}
        {showRequirements && selectedState && (
          <div className="mt-4 space-y-4">
            {/* Residency Requirements */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-400" />
                Residency Requirements
              </h4>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">State Residency</p>
                  <p className="font-medium text-gray-900">
                    {selectedState.residency_months} months
                  </p>
                </div>
                {selectedState.county_residency_months > 0 && (
                  <div>
                    <p className="text-gray-500">County Residency</p>
                    <p className="font-medium text-gray-900">
                      {selectedState.county_residency_months} months
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Waiting Period */}
            {selectedState.waiting_period_days > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    {selectedState.waiting_period_days}-day waiting period required
                  </span>
                </div>
              </div>
            )}

            {/* Property Division */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900">Property Division</h4>
              <p className="mt-1 text-sm text-gray-600">
                {selectedState.community_property
                  ? 'Community Property State - assets acquired during marriage are generally split 50/50'
                  : 'Equitable Distribution State - assets are divided fairly but not necessarily equally'}
              </p>
            </div>

            {/* Required Forms */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Required Forms
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedState.required_forms?.map((form) => (
                  <span
                    key={form}
                    className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded"
                  >
                    {form}
                  </span>
                ))}
              </div>
            </div>

            {/* Optional Forms */}
            {selectedState.optional_forms && selectedState.optional_forms.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Optional/Situational Forms
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedState.optional_forms.map((form) => (
                    <span
                      key={form}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                    >
                      {form}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Filing Portal */}
            {selectedState.filing_portal_url && (
              <a
                href={selectedState.filing_portal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200
                         rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Visit {selectedState.state_name} E-Filing Portal</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
