'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Clock, AlertTriangle, CheckCircle2,
  Plus, Loader2, ChevronRight,
  Scale, DollarSign, Users, Search as SearchIcon,
  Gavel, FileDown, File,
} from 'lucide-react'
import {
  FILING_STATUS_INFO,
  FILING_CATEGORY_INFO,
  FILING_PRIORITY_INFO,
  formatFilingFee,
  type FilingStatus,
  type FilingCategory,
  type CaseFiling,
} from '@/types/filings'

interface FilingWithSummary extends CaseFiling {
  deadline_summary: { total: number; overdue: number; completed: number }
  service_summary: { total: number; completed: number }
}

interface Props {
  caseId: string
  onSelectFiling: (id: string) => void
  onNewFiling: () => void
}

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  petition: FileText,
  response: FileDown,
  motion: Gavel,
  discovery: SearchIcon,
  financial: DollarSign,
  custody: Users,
  settlement: Scale,
  other: File,
}

export default function FilingTracker({ caseId, onSelectFiling, onNewFiling }: Props) {
  const [filings, setFilings] = useState<FilingWithSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<FilingStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<FilingCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/cases/${caseId}/filings`)
        if (res.ok) {
          const json = await res.json()
          setFilings(json.data || [])
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [caseId])

  const filtered = filings.filter(f => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        f.filing_name.toLowerCase().includes(q) ||
        (f.filing_code || '').toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // Summary stats
  const totalFilings = filings.length
  const overdueDeadlines = filings.reduce((sum, f) => sum + (f.deadline_summary?.overdue || 0), 0)
  const pendingService = filings.filter(f => f.status === 'filed').length
  const completedFilings = filings.filter(f => f.status === 'completed').length

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase">Total Filings</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">{totalFilings}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-gray-500 uppercase">Overdue</span>
          </div>
          <p className="text-xl font-semibold text-red-600">{overdueDeadlines}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-medium text-gray-500 uppercase">Pending Service</span>
          </div>
          <p className="text-xl font-semibold text-yellow-600">{pendingService}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-gray-500 uppercase">Completed</span>
          </div>
          <p className="text-xl font-semibold text-green-600">{completedFilings}</p>
        </div>
      </div>

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Court Filings</h3>
        <button
          onClick={onNewFiling}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Filing
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search filings..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as FilingStatus | 'all')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          {Object.entries(FILING_STATUS_INFO).map(([key, info]) => (
            <option key={key} value={key}>{info.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as FilingCategory | 'all')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {Object.entries(FILING_CATEGORY_INFO).map(([key, info]) => (
            <option key={key} value={key}>{info.label}</option>
          ))}
        </select>
      </div>

      {/* Filing List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-4">
            {filings.length === 0
              ? 'No filings yet. Create your first court filing.'
              : 'No filings match your filters.'}
          </p>
          {filings.length === 0 && (
            <button
              onClick={onNewFiling}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Create First Filing
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(filing => {
            const Icon = CATEGORY_ICONS[filing.category] || File
            const statusInfo = FILING_STATUS_INFO[filing.status as FilingStatus]
            const priorityInfo = FILING_PRIORITY_INFO[filing.priority as keyof typeof FILING_PRIORITY_INFO]

            return (
              <button
                key={filing.id}
                onClick={() => onSelectFiling(filing.id)}
                className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5">
                      <Icon className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {filing.filing_name}
                        </p>
                        {filing.filing_code && (
                          <span className="text-xs text-gray-500 font-mono shrink-0">
                            {filing.filing_code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          {new Date(filing.created_at).toLocaleDateString()}
                        </span>
                        {filing.filing_fee > 0 && (
                          <span className="text-xs text-gray-500">
                            Fee: {formatFilingFee(filing.filing_fee)}
                          </span>
                        )}
                        {filing.filed_date && (
                          <span className="text-xs text-gray-500">
                            Filed: {new Date(filing.filed_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {/* Deadline/Service badges */}
                      <div className="flex items-center gap-2 mt-2">
                        {filing.deadline_summary.overdue > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            {filing.deadline_summary.overdue} overdue deadline{filing.deadline_summary.overdue > 1 ? 's' : ''}
                          </span>
                        )}
                        {filing.deadline_summary.total > 0 && filing.deadline_summary.overdue === 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            {filing.deadline_summary.completed}/{filing.deadline_summary.total} deadlines
                          </span>
                        )}
                        {filing.service_summary.total > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                            {filing.service_summary.completed}/{filing.service_summary.total} served
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {filing.priority !== 'normal' && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityInfo?.color || ''}`}>
                        {priorityInfo?.label}
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                      {statusInfo?.label || filing.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
