'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import {
  ArrowLeft, Download, FileText, Clock, Loader2, X,
  CheckCircle, AlertTriangle,
} from 'lucide-react'
import {
  AccountingExport, ExportFormat,
  EXPORT_FORMAT_INFO,
} from '@/types/webhooks'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

export default function ExportsPage() {
  const router = useRouter()
  const [exports, setExports] = useState<AccountingExport[]>([])
  const [loading, setLoading] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Export form state
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [includeInvoices, setIncludeInvoices] = useState(true)
  const [includePayments, setIncludePayments] = useState(true)
  const [includeTimeEntries, setIncludeTimeEntries] = useState(true)

  useEffect(() => {
    // Set default date range: last 30 days
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])

    fetchExports()
  }, [])

  async function fetchExports() {
    try {
      const res = await authFetch('/api/exports/quickbooks')
      if (res.ok) {
        const data = await res.json()
        setExports(data.exports || [])
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    if (!startDate || !endDate) {
      setError('Start date and end date are required')
      return
    }
    if (!includeInvoices && !includePayments && !includeTimeEntries) {
      setError('Select at least one data type to include')
      return
    }

    setExporting(true)
    setError('')
    setSuccess('')

    try {
      const res = await authFetch('/api/exports/quickbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          startDate,
          endDate,
          includeInvoices,
          includePayments,
          includeTimeEntries,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Export failed')
      }

      // Download the file
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition')
      const fileName = contentDisposition?.match(/filename="(.+)"/)?.[1]
        || `export.${EXPORT_FORMAT_INFO[format].extension}`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess('Export downloaded successfully')
      setShowExportModal(false)
      fetchExports()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push('/dashboard/settings')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Accounting Exports</h1>
              <p className="text-gray-500 text-sm mt-1">
                Export billing data for QuickBooks and other accounting software
              </p>
            </div>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              New Export
            </button>
          </div>

          {/* Feedback */}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* QuickBooks Info Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Supported Formats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.entries(EXPORT_FORMAT_INFO) as [ExportFormat, typeof EXPORT_FORMAT_INFO[ExportFormat]][]).map(
                ([key, info]) => (
                  <div key={key} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900">{info.label}</span>
                    </div>
                    <p className="text-sm text-gray-500">{info.description}</p>
                    <span className="inline-block mt-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                      .{info.extension}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Export History */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Export History</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : exports.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Download className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No exports yet</p>
                <p className="text-sm mt-1">Create your first export to see it here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {exports.map((exp) => (
                  <div key={exp.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">
                          {exp.file_name || `Export ${exp.id.slice(0, 8)}`}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {EXPORT_FORMAT_INFO[exp.export_type]?.label || exp.export_type.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(exp.created_at)}
                        </span>
                        <span>
                          {formatDate(exp.date_range_start)} — {formatDate(exp.date_range_end)}
                        </span>
                        <span>{exp.record_count} records</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {exp.include_invoices && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Invoices</span>}
                      {exp.include_payments && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">Payments</span>}
                      {exp.include_time_entries && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">Time</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">New Export</h3>
              <button
                onClick={() => { setShowExportModal(false); setError('') }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                <div className="space-y-2">
                  {(Object.entries(EXPORT_FORMAT_INFO) as [ExportFormat, typeof EXPORT_FORMAT_INFO[ExportFormat]][]).map(
                    ([key, info]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          format === key
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="format"
                          value={key}
                          checked={format === key}
                          onChange={() => setFormat(key)}
                          className="text-blue-600"
                        />
                        <div>
                          <span className="font-medium text-sm text-gray-900">{info.label}</span>
                          <p className="text-xs text-gray-500">{info.description}</p>
                        </div>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Include Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Include Data</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeInvoices}
                      onChange={(e) => setIncludeInvoices(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Invoices</span>
                      <p className="text-xs text-gray-500">Invoice numbers, amounts, dates, and status</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePayments}
                      onChange={(e) => setIncludePayments(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Payments</span>
                      <p className="text-xs text-gray-500">Payment records with amounts and methods</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTimeEntries}
                      onChange={(e) => setIncludeTimeEntries(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Time Entries</span>
                      <p className="text-xs text-gray-500">Billable hours, rates, and descriptions</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => { setShowExportModal(false); setError('') }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
