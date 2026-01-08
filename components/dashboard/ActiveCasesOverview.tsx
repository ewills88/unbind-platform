'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  MessageSquare,
  FileText,
  Calendar,
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
  case_number: string | null
  filing_date: string | null
  next_court_date: string | null
  unread_messages: number
  pending_documents: number
  upcoming_deadlines: number
}

type SortField = 'client_name' | 'status' | 'progress_percentage' | 'next_court_date'
type SortDirection = 'asc' | 'desc'

export default function ActiveCasesOverview() {
  const router = useRouter()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('client_name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [showUrgentOnly, setShowUrgentOnly] = useState(false)

  // Summary stats
  const [stats, setStats] = useState({
    totalCases: 0,
    activeCases: 0,
    urgentCases: 0,
    settlementCases: 0,
  })

  useEffect(() => {
    loadCases()
  }, [])

  useEffect(() => {
    updateStats()
  }, [cases])

  const loadCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('attorney_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCases(data || [])
    } catch (error) {
      console.error('Error loading cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStats = () => {
    const totalCases = cases.length
    const activeCases = cases.filter(c => c.status === 'active').length
    const urgentCases = cases.filter(c => 
      c.unread_messages > 0 || c.pending_documents > 0 || c.upcoming_deadlines > 0
    ).length
    const settlementCases = cases.filter(c => c.status === 'settlement').length

    setStats({ totalCases, activeCases, urgentCases, settlementCases })
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      consultation: 'gray',
      active: 'blue',
      settlement: 'yellow',
      finalized: 'green',
      closed: 'gray',
    }
    return colors[status] || 'gray'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4" />
      case 'settlement':
        return <AlertCircle className="w-4 h-4" />
      case 'finalized':
        return <CheckCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  const isUrgent = (case_: Case) => {
    return case_.unread_messages > 0 || case_.pending_documents > 0 || case_.upcoming_deadlines > 0
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const filteredAndSortedCases = cases
    .filter(case_ => {
      const matchesSearch = 
        case_.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        case_.spouse_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        case_.case_number?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || case_.status === statusFilter
      const matchesUrgent = !showUrgentOnly || isUrgent(case_)

      return matchesSearch && matchesStatus && matchesUrgent
    })
    .sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'client_name':
          aValue = a.client_name.toLowerCase()
          bValue = b.client_name.toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'progress_percentage':
          aValue = a.progress_percentage
          bValue = b.progress_percentage
          break
        case 'next_court_date':
          aValue = a.next_court_date ? new Date(a.next_court_date).getTime() : 0
          bValue = b.next_court_date ? new Date(b.next_court_date).getTime() : 0
          break
        default:
          return 0
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Cases</h2>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-600 font-medium">Total Cases</p>
            <p className="text-2xl font-bold text-blue-900">{stats.totalCases}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-green-600 font-medium">Active</p>
            <p className="text-2xl font-bold text-green-900">{stats.activeCases}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-sm text-red-600 font-medium">Urgent</p>
            <p className="text-2xl font-bold text-red-900">{stats.urgentCases}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-sm text-yellow-600 font-medium">Settlement</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.settlementCases}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="consultation">Consultation</option>
            <option value="active">Active</option>
            <option value="settlement">Settlement</option>
            <option value="finalized">Finalized</option>
            <option value="closed">Closed</option>
          </select>
          <button
            onClick={() => setShowUrgentOnly(!showUrgentOnly)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showUrgentOnly
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4 inline mr-2" />
            Urgent Only
          </button>
        </div>
      </div>

      {/* Cases Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('client_name')}
                  className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase hover:text-gray-700"
                >
                  Client Name
                  {getSortIcon('client_name')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase hover:text-gray-700"
                >
                  Status
                  {getSortIcon('status')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('progress_percentage')}
                  className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase hover:text-gray-700"
                >
                  Progress
                  {getSortIcon('progress_percentage')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Current Step
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('next_court_date')}
                  className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase hover:text-gray-700"
                >
                  Next Court Date
                  {getSortIcon('next_court_date')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Alerts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedCases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No cases found matching your criteria
                </td>
              </tr>
            ) : (
              filteredAndSortedCases.map((case_) => (
                <tr 
                  key={case_.id} 
                  className={`hover:bg-gray-50 transition-colors ${
                    isUrgent(case_) ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    <button
                      onClick={() => router.push(`/dashboard/cases/${case_.id}`)}
                      className="text-blue-600 hover:text-blue-700 hover:underline font-medium text-left"
                    >
                      {case_.client_name}
                    </button>
                    <p className="text-xs text-gray-500">vs. {case_.spouse_name}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-${getStatusColor(case_.status)}-100 text-${getStatusColor(case_.status)}-800`}>
                      {getStatusIcon(case_.status)}
                      {case_.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{case_.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${case_.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-900">{case_.current_step}</p>
                  </td>
                  <td className="px-4 py-4">
                    {case_.next_court_date ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {new Date(case_.next_court_date).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Not scheduled</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {case_.unread_messages > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          <MessageSquare className="w-3 h-3" />
                          {case_.unread_messages}
                        </span>
                      )}
                      {case_.pending_documents > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          <FileText className="w-3 h-3" />
                          {case_.pending_documents}
                        </span>
                      )}
                      {case_.upcoming_deadlines > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {case_.upcoming_deadlines}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}