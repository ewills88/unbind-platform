'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import ChildSupportCalculator from '@/components/calculators/ChildSupportCalculator'
import SpousalSupportAnalyzer from '@/components/calculators/SpousalSupportAnalyzer'
import PropertyDivisionCalculator from '@/components/calculators/PropertyDivisionCalculator'
import { ChevronLeft, Calculator, Heart, Home, AlertTriangle } from 'lucide-react'
import { getAllStates, getStateRules } from '@/lib/data/stateRules'

const tabs = [
  { id: 'child-support', label: 'Child Support', icon: Calculator },
  { id: 'spousal-support', label: 'Spousal Support', icon: Heart },
  { id: 'property-division', label: 'Property Division', icon: Home },
] as const

type TabId = typeof tabs[number]['id']

const DETAILED_CALCULATOR_STATES = ['CA', 'TX', 'FL']

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('child-support')
  const [selectedState, setSelectedState] = useState('CA')
  const allStates = getAllStates()
  const hasDetailedCalculator = DETAILED_CALCULATOR_STATES.includes(selectedState)
  const rules = getStateRules(selectedState)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              href="/dashboard/resources"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Resources
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Support Calculators</h1>
                <p className="mt-2 text-gray-600">
                  Estimate support amounts and property division using state-specific formulas.
                </p>
              </div>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {allStates.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Disclaimer for states without custom calculator */}
          {!hasDetailedCalculator && rules && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Estimated calculations for {rules.name}
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  {rules.name} uses the {rules.childSupportGuideline.toLowerCase()} for child support.
                  These calculations are estimates based on general guidelines.
                  Consult state-specific worksheets and local counsel for accuracy.
                </p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'child-support' && (
            <ChildSupportCalculator caseId="" stateCode={selectedState} />
          )}
          {activeTab === 'spousal-support' && (
            <SpousalSupportAnalyzer caseId="" stateCode={selectedState} />
          )}
          {activeTab === 'property-division' && (
            <PropertyDivisionCalculator caseId="" stateCode={selectedState} />
          )}
        </div>
      </main>
    </div>
  )
}
