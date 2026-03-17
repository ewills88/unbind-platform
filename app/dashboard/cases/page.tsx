'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '@/components/layout/Sidebar'
import {
  Plus,
  Search,
  Filter,
  ChevronRight,
  FileText,
  MessageSquare,
  AlertCircle,
} from 'lucide-react'
import NewCaseModal from '@/components/cases/NewCaseModal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Case {
  id: string
  case_number: string | null
  client_name: string
  spouse_name: string
  status: string
  current_step: string
  progress_percentage: number
  filing_date: string | null
  state: string | null
  unread_messages: number
  pending_documents: number
  upcoming_deadlines: number
  created_at: string
}

export default function CasesPage() {
  const router = useRouter()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNewCaseModal, setShowNewCaseModal] = useState(false)

  useEffect(() => {
    loadCases()
  }, [])

  const loadCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCases(data || [])
    } catch (error) {
      console.error('Error loading cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      consultation: 'bg-gray-100 text-gray-700',
      active: 'bg-blue-100 text-blue-700',
      settlement: 'bg-yellow-100 text-yellow-700',
      finalized: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-500',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.spouse_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_number?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cases</h1>
              <p className="mt-1 text-gray-600">
                {cases.length} total case{cases.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowNewCaseModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Case
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Cases List */}
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No cases found</h3>
              <p className="text-gray-600">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first case to get started'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {filteredCases.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => router.push(`/dashboard/cases/${c.id}`)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:bg-blue-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {c.client_name} v. {c.spouse_name}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {c.case_number || 'No case number'} · {c.state || 'State not set'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{c.current_step}</span>
                        <span>·</span>
                        <span>{c.progress_percentage}% complete</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Alert badges */}
                      <div className="flex items-center gap-2">
                        {c.unread_messages > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            <MessageSquare className="w-3 h-3" />
                            {c.unread_messages}
                          </span>
                        )}
                        {c.pending_documents > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            <FileText className="w-3 h-3" />
                            {c.pending_documents}
                          </span>
                        )}
                        {c.upcoming_deadlines > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <AlertCircle className="w-3 h-3" />
                            {c.upcoming_deadlines}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${c.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <NewCaseModal
          open={showNewCaseModal}
          onOpenChange={setShowNewCaseModal}
        />
      </main>
    </div>
  )
}
