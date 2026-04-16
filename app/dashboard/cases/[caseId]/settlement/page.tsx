'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { FileText, Clock, GitCompare, Users, FileDown, BarChart3 } from 'lucide-react'
import CaseSettlementTab from '@/components/settlement/CaseSettlementTab'
import NegotiationTimeline from '@/components/settlement/NegotiationTimeline'
import ScenarioModeler from '@/components/settlement/ScenarioModeler'
import MediationManager from '@/components/settlement/MediationManager'
import DocumentGenerator from '@/components/settlement/DocumentGenerator'
import DocumentDetail from '@/components/settlement/DocumentDetail'
import SettlementAnalytics from '@/components/settlement/SettlementAnalytics'
import { authFetch } from '@/lib/supabase/auth-fetch'

type TabKey = 'proposals' | 'timeline' | 'scenarios' | 'mediation' | 'documents' | 'analytics'

const TABS: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: 'proposals', label: 'Proposals', icon: FileText },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'scenarios', label: 'Scenarios', icon: GitCompare },
  { key: 'mediation', label: 'Mediation', icon: Users },
  { key: 'documents', label: 'Documents', icon: FileDown },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
]

export default function SettlementPage() {
  const params = useParams()
  const caseId = params.caseId as string
  const [activeTab, setActiveTab] = useState<TabKey>('proposals')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0d1526]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Tab Navigation */}
          <div className="flex gap-1 bg-gray-100 dark:bg-[#1f2937] rounded-lg p-1 mb-6">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key)
                    if (tab.key !== 'documents') setSelectedDocId(null)
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'proposals' && <CaseSettlementTab caseId={caseId} />}
          {activeTab === 'timeline' && <NegotiationTimeline caseId={caseId} />}
          {activeTab === 'scenarios' && <ScenarioModeler caseId={caseId} />}
          {activeTab === 'mediation' && <MediationManager caseId={caseId} />}
          {activeTab === 'documents' && (
            selectedDocId ? (
              <DocumentDetail
                documentId={selectedDocId}
                onBack={() => setSelectedDocId(null)}
              />
            ) : (
              <DocumentsTab caseId={caseId} onSelectDoc={setSelectedDocId} />
            )
          )}
          {activeTab === 'analytics' && <SettlementAnalytics caseId={caseId} />}
        </div>
      </main>
    </div>
  )
}

// Documents tab with list + generate
function DocumentsTab({ caseId, onSelectDoc }: { caseId: string; onSelectDoc: (id: string) => void }) {
  const [showGenerator, setShowGenerator] = useState(false)
  const [docs, setDocs] = useState<Array<{
    id: string
    document_title: string
    status: string
    version: number
    created_at: string
    signature_summary: { total: number; signed: number }
  }>>([])
  const [loading, setLoading] = useState(true)

  // Fetch documents
  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`/api/cases/${caseId}/settlement-documents`)
        if (res.ok) {
          const json = await res.json()
          setDocs(json.data || [])
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [caseId])

  if (showGenerator) {
    return (
      <div>
        <button
          onClick={() => setShowGenerator(false)}
          className="mb-4 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900"
        >
          &larr; Back to documents
        </button>
        <DocumentGenerator
          caseId={caseId}
          onGenerated={(docId) => {
            setShowGenerator(false)
            onSelectDoc(docId)
          }}
        />
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    in_review: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    filed: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Settlement Documents</h3>
        <button
          onClick={() => setShowGenerator(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <FileDown className="w-4 h-4" /> Generate Agreement
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-300 dark:border-[#374151] border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-[#1f2937] rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No settlement documents generated yet.</p>
          <button
            onClick={() => setShowGenerator(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Generate Your First Agreement
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <button
              key={doc.id}
              onClick={() => onSelectDoc(doc.id)}
              className="w-full text-left p-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1f2937] rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.document_title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      v{doc.version} &middot; {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {doc.signature_summary.total > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {doc.signature_summary.signed}/{doc.signature_summary.total} signed
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    statusColors[doc.status] || 'bg-gray-100 text-gray-600'
                  }`}>
                    {doc.status === 'in_review' ? 'In Review' : doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
