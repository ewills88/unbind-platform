'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '@/components/layout/Sidebar'
import DocumentUpload from '@/components/dashboard/DocumentUpload'
import DocumentPreviewModal from '@/components/dashboard/DocumentPreviewModal'
import { Document, DOCUMENT_CATEGORIES } from '@/types/documents'
import {
  FileText,
  Download,
  Eye,
  Trash2,
  Share2,
  Filter,
  Search,
  Calendar,
  User,
  FolderOpen,
  CheckSquare,
  Square,
} from 'lucide-react'

const supabase = createClient(
  'https://rpbjravqgflidnwjkgvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'
)

interface Case {
  id: string
  client_name: string
  spouse_name: string
}

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [selectedCase, setSelectedCase] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  useEffect(() => {
    loadUserAndData()
  }, [])

  useEffect(() => {
    if (userRole) {
      loadDocuments()
    }
  }, [selectedCase, categoryFilter, userRole])

  const loadUserAndData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserRole(profile.role)
      }

      await loadCases()
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const loadCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      let query = supabase
        .from('cases')
        .select('id, client_name, spouse_name')

      if (profile?.role === 'admin') {
        query = query.eq('attorney_id', user.id)
      } else {
        query = query.eq('client_id', user.id)
      }

      const { data, error } = await query

      if (error) throw error
      setCases(data || [])
    } catch (error) {
      console.error('Error loading cases:', error)
    }
  }

  const loadDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('documents')
        .select(`
          *,
          uploader:uploader_id(full_name),
          case:case_id(client_name, spouse_name)
        `)
        .order('uploaded_at', { ascending: false })

      if (selectedCase !== 'all') {
        query = query.eq('case_id', selectedCase)
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('case-documents')
        .download(doc.storage_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.original_filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Failed to download document')
    }
  }

  const toggleSelectDoc = (docId: string) => {
    const newSelected = new Set(selectedDocs)
    if (newSelected.has(docId)) {
      newSelected.delete(docId)
    } else {
      newSelected.add(docId)
    }
    setSelectedDocs(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedDocs.size === filteredDocuments.length) {
      setSelectedDocs(new Set())
    } else {
      setSelectedDocs(new Set(filteredDocuments.map(d => d.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return
    
    if (!confirm(`Delete ${selectedDocs.size} document(s)? This cannot be undone.`)) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const docsToDelete = documents.filter(d => selectedDocs.has(d.id))

      // Log deletion activity for each document
      const activities = docsToDelete.map(doc => ({
        document_id: doc.id,
        user_id: user.id,
        activity_type: 'deleted',
        comment: 'Document deleted via bulk action',
      }))

      await supabase
        .from('document_activity')
        .insert(activities)

      // Delete from storage
      const paths = docsToDelete.map(d => d.storage_path)
      await supabase.storage
        .from('case-documents')
        .remove(paths)

      // Delete from database
      await supabase
        .from('documents')
        .delete()
        .in('id', Array.from(selectedDocs))

      setSelectedDocs(new Set())
      loadDocuments()
    } catch (error) {
      console.error('Error deleting documents:', error)
      alert('Failed to delete some documents')
    }
  }

  const handleBulkShare = async (share: boolean) => {
    if (selectedDocs.size === 0) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Update documents
      await supabase
        .from('documents')
        .update({ is_shared_with_client: share })
        .in('id', Array.from(selectedDocs))

      // Log activity for each document
      const activities = Array.from(selectedDocs).map(docId => ({
        document_id: docId,
        user_id: user.id,
        activity_type: 'shared',
        comment: share ? 'Shared with client via bulk action' : 'Unshared with client via bulk action',
      }))

      await supabase
        .from('document_activity')
        .insert(activities)

      setSelectedDocs(new Set())
      loadDocuments()
    } catch (error) {
      console.error('Error updating documents:', error)
      alert('Failed to update some documents')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getCategoryColor = (category: string | null) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.value === category)
    return cat?.color || 'gray'
  }

  const getCategoryLabel = (category: string | null) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.value === category)
    return cat?.label || 'Other'
  }

  const filteredDocuments = documents.filter(doc =>
    doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
              <p className="mt-2 text-gray-600">
                Manage case documents and files
              </p>
            </div>
            {userRole === 'admin' && (
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {showUpload ? 'Hide Upload' : 'Upload Documents'}
              </button>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {selectedDocs.size > 0 && userRole === 'admin' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-900">
                  {selectedDocs.size} document(s) selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkShare(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share with Client
                  </button>
                  <button
                    onClick={() => handleBulkShare(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Unshare
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedDocs(new Set())}
                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Section */}
          {showUpload && cases.length > 0 && (
            <div className="mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Documents</h2>
                <DocumentUpload
                  caseId={selectedCase === 'all' ? cases[0].id : selectedCase}
                  onUploadComplete={() => {
                    loadDocuments()
                    setShowUpload(false)
                  }}
                />
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Select All Checkbox */}
              {userRole === 'admin' && filteredDocuments.length > 0 && (
                <div className="flex items-center">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    {selectedDocs.size === filteredDocuments.length ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                    Select All
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Case Filter */}
              <select
                value={selectedCase}
                onChange={(e) => setSelectedCase(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Cases</option>
                {cases.map((case_) => (
                  <option key={case_.id} value={case_.id}>
                    {case_.client_name} v. {case_.spouse_name}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
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
          </div>

          {/* Documents Grid */}
          {filteredDocuments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try adjusting your search terms' : 'Upload your first document to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
                    selectedDocs.has(doc.id)
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 hover:shadow-md'
                  }`}
                >
                  <div className="p-4">
                    {/* Document Icon & Name with Checkbox */}
                    <div className="flex items-start gap-3 mb-3">
                      {userRole === 'admin' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelectDoc(doc.id)
                          }}
                          className="flex-shrink-0 mt-1"
                        >
                          {selectedDocs.has(doc.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      )}
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {doc.original_filename}
                        </h3>
                        <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="mb-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getCategoryColor(doc.category)}-100 text-${getCategoryColor(doc.category)}-800`}>
                        {getCategoryLabel(doc.category)}
                      </span>
                    </div>

                    {/* Description */}
                    {doc.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="space-y-1 mb-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(doc.uploaded_at)}</span>
                      </div>
                      {doc.is_shared_with_client && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Share2 className="w-3 h-3" />
                          <span>Shared with client</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onUpdate={() => {
            loadDocuments()
            setPreviewDoc(null)
          }}
          userRole={userRole}
        />
      )}
    </div>
  )
}