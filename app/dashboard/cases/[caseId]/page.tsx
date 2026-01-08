'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '@/components/layout/Sidebar'
import DocumentUpload from '@/components/dashboard/DocumentUpload'
import { 
  ChevronLeft,
  Edit,
  FileText,
  MessageSquare,
  CheckSquare,
  Activity,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  Upload,
  Eye,
  Download,
  Share2,
  Search,
  Filter,
} from 'lucide-react'
import { Document, DOCUMENT_CATEGORIES } from '@/types/documents'

const supabase = createClient(
  'https://rpbjravqgflidnwjkgvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'
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
  target_completion_date: string | null
  state: string | null
  case_type: string | null
  has_children: boolean
  total_assets_disclosed: number | null
  total_debts_disclosed: number | null
  estimated_fees: number | null
}

type TabType = 'overview' | 'documents' | 'messages' | 'tasks' | 'activity'

export default function CaseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const caseId = params.caseId as string

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [showUpload, setShowUpload] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    loadCaseData()
  }, [caseId])

  const loadCaseData = async () => {
    try {
      console.log('=== STARTING CASE LOAD ===')
      console.log('Looking for case with ID:', caseId)
      console.log('Case ID type:', typeof caseId)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found, redirecting to login')
        router.push('/login')
        return
      }
      console.log('User authenticated:', user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      console.log('User role:', profile?.role)
      setUserRole(profile?.role || '')

      console.log('Querying cases table...')
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single()

      console.log('Case query result:', { caseData, caseError })

      if (caseError) {
        console.error('ERROR loading case:', caseError)
        throw caseError
      }

      if (!caseData) {
        console.error('No case data returned (but no error either)')
      } else {
        console.log('✅ Case data loaded successfully:', caseData)
      }

      setCaseData(caseData)

      console.log('Querying documents...')
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('case_id', caseId)
        .order('uploaded_at', { ascending: false })

      console.log('Documents query result:', { count: docs?.length, error: docsError })
      setDocuments(docs || [])

      if (docs && docs.length > 0) {
        console.log('Querying document activity...')
        const { data: acts, error: actsError } = await supabase
          .from('document_activity')
          .select(`
            *,
            user:user_id(full_name),
            document:document_id(original_filename)
          `)
          .in('document_id', docs.map(d => d.id))
          .order('created_at', { ascending: false })
          .limit(20)

        console.log('Activity query result:', { count: acts?.length, error: actsError })
        setActivities(acts || [])
      }

      console.log('=== CASE LOAD COMPLETE ===')

    } catch (error) {
      console.error('EXCEPTION in loadCaseData:', error)
    } finally {
      setLoading(false)
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

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const formatFileSize = (bytes: number) => {
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getCategoryColor = (category: string | null) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.value === category)
    return cat?.color || 'gray'
  }

  const getCategoryLabel = (category: string | null) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.value === category)
    return cat?.label || 'Other'
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'viewed': return <Eye className="w-4 h-4 text-blue-600" />
      case 'downloaded': return <Download className="w-4 h-4 text-green-600" />
      case 'comment': return <MessageSquare className="w-4 h-4 text-purple-600" />
      case 'shared': return <Share2 className="w-4 h-4 text-orange-600" />
      default: return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-2">Case not found</p>
            <p className="text-sm text-gray-500 mb-4">Case ID: {caseId}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Return to dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="hover:text-gray-900"
            >
              Dashboard
            </button>
            <span>/</span>
            <span>Cases</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">{caseData.client_name}</span>
          </div>

          {/* Case Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {caseData.client_name} v. {caseData.spouse_name}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    Case #{caseData.case_number || 'Pending'}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${getStatusColor(caseData.status)}-100 text-${getStatusColor(caseData.status)}-800`}>
                    {caseData.status}
                  </span>
                </div>
              </div>
              {userRole === 'admin' && (
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Case
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Progress: {caseData.progress_percentage}%</span>
                <span className="text-sm text-gray-600">{caseData.current_step}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${caseData.progress_percentage}%` }}
                />
              </div>
            </div>

            {/* Key Dates */}
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <span className="text-gray-600">Filed:</span>
                <span className="ml-2 font-medium text-gray-900">{formatDate(caseData.filing_date)}</span>
              </div>
              <div>
                <span className="text-gray-600">Target Completion:</span>
                <span className="ml-2 font-medium text-gray-900">{formatDate(caseData.target_completion_date)}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {[
                  { id: 'overview', label: 'Overview', icon: Briefcase },
                  { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
                  { id: 'messages', label: 'Messages', icon: MessageSquare, disabled: true },
                  { id: 'tasks', label: 'Tasks', icon: CheckSquare, disabled: true },
                  { id: 'activity', label: 'Activity', icon: Activity, count: activities.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && setActiveTab(tab.id as TabType)}
                    disabled={tab.disabled}
                    className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : tab.disabled
                        ? 'border-transparent text-gray-400 cursor-not-allowed'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                        activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                    {tab.disabled && (
                      <span className="ml-1 text-xs text-gray-400">(Coming Soon)</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Case Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Case Details</h3>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Status</dt>
                          <dd className="mt-1 text-sm text-gray-900 capitalize">{caseData.status}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">State</dt>
                          <dd className="mt-1 text-sm text-gray-900">{caseData.state || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Case Type</dt>
                          <dd className="mt-1 text-sm text-gray-900">{caseData.case_type || 'Standard'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Children Involved</dt>
                          <dd className="mt-1 text-sm text-gray-900">{caseData.has_children ? 'Yes' : 'No'}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Financial Summary */}
                    {userRole === 'admin' && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
                        <dl className="space-y-3">
                          <div>
                            <dt className="text-sm font-medium text-gray-600">Assets Disclosed</dt>
                            <dd className="mt-1 text-sm font-semibold text-gray-900">
                              {formatCurrency(caseData.total_assets_disclosed)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-600">Debts Disclosed</dt>
                            <dd className="mt-1 text-sm font-semibold text-gray-900">
                              {formatCurrency(caseData.total_debts_disclosed)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-600">Estimated Fees</dt>
                            <dd className="mt-1 text-sm font-semibold text-gray-900">
                              {formatCurrency(caseData.estimated_fees)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}

                    {/* Party Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Parties</h3>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Client</dt>
                          <dd className="mt-1 text-sm text-gray-900">{caseData.client_name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Spouse</dt>
                          <dd className="mt-1 text-sm text-gray-900">{caseData.spouse_name}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Next Steps */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
                      <p className="text-sm text-gray-700 mb-4">{caseData.current_step}</p>
                      {userRole === 'admin' && (
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                            Message Client
                          </button>
                          <button 
                            onClick={() => setActiveTab('documents')}
                            className="px-3 py-1.5 bg-white text-blue-600 border border-blue-600 rounded text-sm hover:bg-blue-50"
                          >
                            Upload Document
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  {userRole === 'admin' && showUpload && (
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h3>
                      <DocumentUpload
                        caseId={caseId}
                        onUploadComplete={() => {
                          loadCaseData()
                          setShowUpload(false)
                        }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Case Documents ({filteredDocuments.length})
                    </h3>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => setShowUpload(!showUpload)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {showUpload ? 'Hide Upload' : 'Upload Documents'}
                      </button>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Categories</option>
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                      <p className="text-gray-600">
                        {searchQuery || categoryFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Upload your first document to get started'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {doc.original_filename}
                              </h4>
                              <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                            </div>
                          </div>

                          <div className="mb-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getCategoryColor(doc.category)}-100 text-${getCategoryColor(doc.category)}-800`}>
                              {getCategoryLabel(doc.category)}
                            </span>
                          </div>

                          {doc.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {doc.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => router.push('/dashboard/documents')}
                              className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  {activities.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
                      <p className="text-gray-600">Activity will appear here as actions are taken on this case</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div key={activity.id} className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getActivityIcon(activity.activity_type)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {activity.user?.full_name || 'Unknown User'}
                              </p>
                              <p className="text-sm text-gray-700 mt-1">
                                {activity.comment || (
                                  <>
                                    {activity.activity_type} <span className="font-medium">{activity.document?.original_filename}</span>
                                  </>
                                )}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(activity.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}