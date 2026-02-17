'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import FilingTracker from '@/components/filings/FilingTracker'
import FilingDetail from '@/components/filings/FilingDetail'
import NewFilingModal from '@/components/filings/NewFilingModal'
import FilingChecklist from '@/components/filings/FilingChecklist'
import HearingManager from '@/components/filings/HearingManager'
import FormFiller from '@/components/forms/FormFiller'

type PageTab = 'filings' | 'checklist' | 'forms' | 'hearings'

export default function CaseFilingsPage() {
  const params = useParams()
  const caseId = params.caseId as string

  const [activeTab, setActiveTab] = useState<PageTab>('filings')
  const [selectedFilingId, setSelectedFilingId] = useState<string | null>(null)
  const [showNewFiling, setShowNewFiling] = useState(false)
  const [stateCode, setStateCode] = useState('CA')
  const [spouseName, setSpouseName] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch case info for state_code and spouse_name
  useEffect(() => {
    async function loadCase() {
      try {
        const res = await fetch(`/api/cases/${caseId}/filings`)
        if (res.ok) {
          const json = await res.json()
          if (json.state_code) setStateCode(json.state_code)
        }
      } catch {
        // Ignore
      }
    }
    loadCase()
  }, [caseId])

  const TABS: { key: PageTab; label: string }[] = [
    { key: 'filings', label: 'Filings' },
    { key: 'checklist', label: 'Checklist' },
    { key: 'forms', label: 'Court Forms' },
    { key: 'hearings', label: 'Hearings' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Court Filings & Hearings</h1>
          </div>

          {/* Top tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key)
                  setSelectedFilingId(null)
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'filings' && (
            <>
              {selectedFilingId ? (
                <FilingDetail
                  caseId={caseId}
                  filingId={selectedFilingId}
                  spouseName={spouseName}
                  onBack={() => {
                    setSelectedFilingId(null)
                    setRefreshKey(k => k + 1)
                  }}
                />
              ) : (
                <FilingTracker
                  key={refreshKey}
                  caseId={caseId}
                  onSelectFiling={setSelectedFilingId}
                  onNewFiling={() => setShowNewFiling(true)}
                />
              )}
            </>
          )}

          {activeTab === 'checklist' && (
            <FilingChecklist caseId={caseId} />
          )}

          {activeTab === 'forms' && (
            <FormFiller caseId={caseId} stateCode={stateCode} />
          )}

          {activeTab === 'hearings' && (
            <HearingManager caseId={caseId} />
          )}

          {showNewFiling && (
            <NewFilingModal
              caseId={caseId}
              stateCode={stateCode}
              onClose={() => setShowNewFiling(false)}
              onCreated={(filingId) => {
                setShowNewFiling(false)
                setSelectedFilingId(filingId)
                setActiveTab('filings')
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}
