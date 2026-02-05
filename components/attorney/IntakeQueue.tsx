'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  ChevronRight,
  Loader2,
  Users,
  TrendingUp,
} from 'lucide-react'
import {
  IntakeWithReview,
  IntakeQueueFilter,
  IntakeQueueSort,
  IntakeQueueStats,
  COMPLEXITY_CONFIG,
  getComplexityLevel,
} from '@/types/intake-workflow'

const FILTER_OPTIONS: { value: IntakeQueueFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'info_requested', label: 'Awaiting Response' },
]

const SORT_OPTIONS: { value: IntakeQueueSort; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most_complex', label: 'Most Complex' },
  { value: 'least_complex', label: 'Least Complex' },
]

export default function IntakeQueue() {
  const router = useRouter()
  const [intakes, setIntakes] = useState<IntakeWithReview[]>([])
  const [stats, setStats] = useState<IntakeQueueStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<IntakeQueueFilter>('all')
  const [sort, setSort] = useState<IntakeQueueSort>('newest')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchIntakes()
  }, [filter, sort])

  const fetchIntakes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/attorney/intakes?filter=${filter}&sort=${sort}`
      )
      if (response.ok) {
        const data = await response.json()
        setIntakes(data.intakes)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching intakes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredIntakes = intakes.filter(intake => {
    if (!searchQuery) return true
    const data = intake.intake_data as Record<string, Record<string, string>>
    const clientName = `${data?.personal?.firstName || ''} ${data?.personal?.lastName || ''}`.toLowerCase()
    return clientName.includes(searchQuery.toLowerCase())
  })

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    return 'Just now'
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_review}</p>
                <p className="text-sm text-gray-600">Pending Review</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.under_review}</p>
                <p className="text-sm text-gray-600">Under Review</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.approved_today}</p>
                <p className="text-sm text-gray-600">Approved Today</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.average_review_time_hours.toFixed(1)}h
                </p>
                <p className="text-sm text-gray-600">Avg Review Time</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as IntakeQueueFilter)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as IntakeQueueSort)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Intake List */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : filteredIntakes.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No intakes found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredIntakes.map((intake) => {
              const data = intake.intake_data as Record<string, Record<string, string>>
              const clientName = `${data?.personal?.firstName || ''} ${data?.personal?.lastName || ''}`.trim() || 'Unknown'
              const complexity = getComplexityLevel(intake.ai_analysis?.complexity_score || 5)
              const complexityConfig = COMPLEXITY_CONFIG[complexity]
              const flagCount = intake.ai_analysis?.flags?.length || 0
              const docStats = intake.document_stats

              return (
                <div
                  key={intake.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Client Info */}
                      <div>
                        <h3 className="font-medium text-gray-900">{clientName}</h3>
                        <p className="text-sm text-gray-500">
                          Submitted {formatTimeAgo(intake.submitted_at || intake.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Complexity Badge */}
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${complexityConfig.color}`}>
                        {complexityConfig.label}
                      </span>

                      {/* Document Status */}
                      {docStats && (
                        <span className="text-sm text-gray-600">
                          {docStats.uploaded}/{docStats.total} docs
                        </span>
                      )}

                      {/* Flag Count */}
                      {flagCount > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">{flagCount}</span>
                        </span>
                      )}

                      {/* Status Badge */}
                      {intake.review_status === 'info_requested' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                          Awaiting Response
                        </span>
                      )}
                      {intake.review_status === 'under_review' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          In Review
                        </span>
                      )}

                      {/* Review Button */}
                      <button
                        onClick={() => router.push(`/attorney/intakes/${intake.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                      >
                        Review
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Flags Preview */}
                  {flagCount > 0 && intake.ai_analysis?.flags && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {intake.ai_analysis.flags.slice(0, 3).map((flag, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-1 rounded ${
                            flag.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            flag.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {flag.type.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {flagCount > 3 && (
                        <span className="text-xs text-gray-500">+{flagCount - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
