'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import {
  ArrowLeft, Download, FileText, Loader2, AlertTriangle, CheckCircle,
} from 'lucide-react'
import type { DiscoveryRequest, DiscoveryItem, DiscoveryType } from '@/types/discovery'
import { DISCOVERY_TYPE_INFO } from '@/types/discovery'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function GenerateDiscoveryDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.caseId as string
  const discoveryId = params.discoveryId as string

  const [discovery, setDiscovery] = useState<DiscoveryRequest | null>(null)
  const [items, setItems] = useState<DiscoveryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [success, setSuccess] = useState(false)

  const [respondingPartyName, setRespondingPartyName] = useState('')
  const [includeVerification, setIncludeVerification] = useState(true)
  const [includeObjections, setIncludeObjections] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [discRes, itemsRes] = await Promise.all([
        fetch(`/api/discovery/${discoveryId}`),
        fetch(`/api/discovery/${discoveryId}/items`),
      ])

      if (discRes.ok) {
        const d = await discRes.json()
        setDiscovery(d.data)
        setRespondingPartyName(d.data?.responding_party || '')
      }
      if (itemsRes.ok) {
        const d = await itemsRes.json()
        setItems(d.data || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [discoveryId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleGenerate() {
    setGenerating(true)
    setSuccess(false)

    try {
      const res = await fetch('/api/discovery/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discovery_id: discoveryId,
          respondingPartyName,
          includeVerification,
          includeObjections,
        }),
      })

      if (!res.ok) {
        throw new Error('Generation failed')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${discovery?.title || 'Discovery'} - Responses.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess(true)
    } catch {
      // silently handle
    } finally {
      setGenerating(false)
    }
  }

  const finalizedCount = items.filter(i => i.status === 'finalized').length
  const totalCount = items.length
  const withObjections = items.filter(i => i.objection_text).length
  const hasUnfinalized = finalizedCount < totalCount

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Header */}
          <button
            onClick={() => router.push(`/dashboard/cases/${caseId}/discovery/${discoveryId}`)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Responses
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Generate Response Document</h1>
          <p className="text-gray-500 text-sm mb-6">{discovery?.title}</p>

          {/* Warning if not all finalized */}
          {hasUnfinalized && (
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-800">Responses Not Complete</p>
                <p className="text-sm text-yellow-700">
                  Only {finalizedCount} of {totalCount} responses are finalized.
                  Unfinalized responses will show as &quot;[RESPONSE PENDING]&quot;.
                </p>
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-6">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm">Document generated and downloaded successfully</span>
            </div>
          )}

          {/* Options */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Document Options</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responding Party Name
                </label>
                <input
                  type="text"
                  value={respondingPartyName}
                  onChange={(e) => setRespondingPartyName(e.target.value)}
                  placeholder="Full legal name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This name will appear in the caption and verification page
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeVerification}
                  onChange={(e) => setIncludeVerification(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Include Verification Page</span>
                  <p className="text-xs text-gray-500">State-specific verification / declaration under penalty of perjury</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeObjections}
                  onChange={(e) => setIncludeObjections(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Include Objections</span>
                  <p className="text-xs text-gray-500">Include objection text before substantive responses</p>
                </div>
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Document Summary</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-gray-500">Discovery Type</p>
                <p className="font-medium text-gray-900">
                  {DISCOVERY_TYPE_INFO[discovery?.discovery_type as DiscoveryType]?.label || discovery?.discovery_type}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Set</p>
                <p className="font-medium text-gray-900">{discovery?.set_number}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Items</p>
                <p className="font-medium text-gray-900">{totalCount}</p>
              </div>
              <div>
                <p className="text-gray-500">Finalized</p>
                <p className="font-medium text-gray-900">{finalizedCount} of {totalCount}</p>
              </div>
              <div>
                <p className="text-gray-500">With Objections</p>
                <p className="font-medium text-gray-900">{withObjections}</p>
              </div>
              <div>
                <p className="text-gray-500">Served Date</p>
                <p className="font-medium text-gray-900">
                  {discovery?.served_date ? formatDate(discovery.served_date) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Generate */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating || totalCount === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate &amp; Download (.docx)
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
