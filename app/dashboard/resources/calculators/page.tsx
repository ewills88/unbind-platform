'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import ChildSupportCalculator from '@/components/calculators/ChildSupportCalculator'
import SpousalSupportAnalyzer from '@/components/calculators/SpousalSupportAnalyzer'
import PropertyDivisionCalculator from '@/components/calculators/PropertyDivisionCalculator'
import { ChevronLeft, Calculator, Heart, Home } from 'lucide-react'

const tabs = [
  { id: 'child-support', label: 'Child Support', icon: Calculator },
  { id: 'spousal-support', label: 'Spousal Support', icon: Heart },
  { id: 'property-division', label: 'Property Division', icon: Home },
] as const

type TabId = typeof tabs[number]['id']

const states = [
  { code: 'CA', name: 'California' },
  { code: 'TX', name: 'Texas' },
  { code: 'FL', name: 'Florida' },
]

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('child-support')
  const [selectedState, setSelectedState] = useState('CA')

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
                {states.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

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
