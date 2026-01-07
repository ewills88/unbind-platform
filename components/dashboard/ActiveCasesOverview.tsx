'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { 
  Briefcase, 
  AlertCircle, 
  TrendingUp, 
  Clock,
  Calendar,
  Search,
  MoreVertical,
  MessageSquare,
  Eye,
  FileText,
  ArrowUpDown
} from 'lucide-react'

const supabase = createClient(
  'https://rpbjravqgflidnwjkgvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'
)

interface Case {
  id: string
  client_name: string
  spouse_name: string
  status: string
  current_step: string
  progress_percentage: number
  has_children: boolean
  urgent: boolean
  filing_date: string | null
  target_completion_date: string | null
  last_activity_date: string
  state: string
}

const getStatusColor = (status: string) => {
  const colors = {
    consultation: 'bg-gray-100 text-gray-700 border-gray-200',
    active: 'bg-blue-100 text-blue-700 border-blue-200',
    settlement: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    finalized: 'bg-green-100 text-green-700 border-green-200',
    closed: 'bg-gray-100 text-gray-500 border-gray-200',
  }
  return colors[status as keyof typeof colors] || colors.consultation
}

const getProgressColor = (percentage: number) => {
  if (percentage >= 75) return 'bg-green-500'
  if (percentage >= 50) return 'bg-blue-500'
  if (percentage >= 25) return 'bg-yellow-500'
  return 'bg-gray-300'
}

const getDaysSinceActivity = (date: string) => {
  const now = new Date()
  const activityDate = new Date(date)
  const diffTime = Math.abs(now.getTime() - activityDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

type SortField = 'client_name' | 'progress_percentage' | 'filing_date' | 'last_activity_date'
type SortDirection = 'asc' | 'desc'

export default function ActiveCasesOverview() {
  const router = useRouter()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortField, setSortField] = useState<SortField>('last_activity_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    loadCases()
    
    // Set up real-time subscription
    const channel = supabase
      .channel('cases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
        },
        () => {
          loadCases()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('attorney_id', user.id)

      if (error) throw error
      setCases(data || [])
    } catch (error) {
      console.error('Error loading cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleClientClick = (caseId: string) => {
    router.push(`/dashboard/cases/${caseId}`)
  }

  const filteredAndSortedCases = cases
    .filter(c => {
      const matchesSearch = c.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           c.spouse_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      let matchesFilter = true
      if (filterStatus === 'urgent') {
        matchesFilter = c.urgent || getDaysSinceActivity(c.last_activity_date) > 3
      } else if (filterStatus !== 'all') {
        matchesFilter = c.status === filterStatus
      }
      
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle null values
      if (aValue === null) return 1
      if (bValue === null) return -1

      // String comparison for names
      if (sortField === 'client_name') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      // Date comparison
      if (sortField === 'filing_date' || sortField === 'last_activity_date') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const stats = {
    total: cases.length,
    needsAttention: cases.filter(c => c.urgent || getDaysSinceActivity(c.last_activity_date) > 3).length,
    closingThisMonth: cases.filter(c => {
      if (!c.target_completion_date) return false
      const targetDate = new Date(c.target_completion_date)
      const now = new Date()
      const isThisMonth = targetDate.getMonth() === now.getMonth() && 
                         targetDate.getFullYear() === now.getFullYear()
      return isThisMonth
    }).length,
    avgProgress: Math.round(cases.reduce((sum, c) => sum + c.progress_percentage, 0) / (cases.length || 1)),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Active Cases</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Needs Attention</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.needsAttention}</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Progress</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.avgProgress}%</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Closing This Month</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.closingThisMonth}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('urgent')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'urgent'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Urgent
            </button>
            
            <select
              value={filterStatus === 'all' || filterStatus === 'urgent' ? 'all' : filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="consultation">Consultation</option>
              <option value="active">Active</option>
              <option value="settlement">Settlement</option>
              <option value="finalized">Finalized</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cases List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('client_name')}
                >
                  <div className="flex items-center gap-2">
                    Client
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Step
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('progress_percentage')}
                >
                  <div className="flex items-center gap-2">
                    Progress
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('last_activity_date')}
                >
                  <div className="flex items-center gap-2">
                    Last Activity
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedCases.map((case_) => {
                const daysSinceActivity = getDaysSinceActivity(case_.last_activity_date)
                const needsAttention = case_.urgent || daysSinceActivity > 3

                return (
                  <tr key={case_.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleClientClick(case_.id)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {case_.client_name}
                            </button>
                            {case_.urgent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Urgent
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">vs. {case_.spouse_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(case_.status)}`}>
                        {case_.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 max-w-xs truncate">
                        {case_.current_step}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(case_.progress_percentage)}`}
                            style={{ width: `${case_.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {case_.progress_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className={`w-4 h-4 ${needsAttention ? 'text-orange-500' : 'text-gray-400'}`} />
                        <span className={`text-sm ${needsAttention ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                          {daysSinceActivity}d ago
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleClientClick(case_.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                          title="View Case"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Message Client">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="View Documents">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedCases.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cases found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by creating a new case'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}