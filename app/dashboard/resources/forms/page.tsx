'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import { ChevronLeft, AlertTriangle } from 'lucide-react'
import FormFiller from '@/components/forms/FormFiller'
import { getAllStates } from '@/lib/data/stateRules'
import { getDetailedStates } from '@/lib/stateData'

const STATES_WITH_FORMS = getDetailedStates() // CA, TX, FL currently

export default function FormsLibraryPage() {
  const [selectedState, setSelectedState] = useState('CA')
  const allStates = getAllStates()
  const hasFormsAvailable = STATES_WITH_FORMS.includes(selectedState)
  const stateName = allStates.find((s) => s.code === selectedState)?.name || selectedState

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0d1526]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              href="/dashboard/resources"
              className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 mb-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Resources
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Forms Library</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Browse and auto-fill state-specific court forms.
                </p>
              </div>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-[#374151] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {allStates.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}{STATES_WITH_FORMS.includes(s.code) ? '' : ' (coming soon)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasFormsAvailable ? (
            <FormFiller stateCode={selectedState} caseId="" />
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                Forms coming soon for {stateName}
              </h3>
              <p className="text-sm text-amber-800 max-w-md mx-auto">
                State-specific court forms for {stateName} are being added.
                In the meantime, you can view {stateName} state requirements using the
                State Rules comparison tool, or use our document templates.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link
                  href="/dashboard/resources/state-rules"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  View State Rules
                </Link>
                <Link
                  href="/dashboard/templates"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#111827] border border-gray-300 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#1f2937] rounded-lg transition-colors"
                >
                  Document Templates
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
