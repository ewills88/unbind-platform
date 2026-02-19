'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Download, Eye, Upload, Clock, AlertCircle,
  CheckCircle, XCircle, Loader2, Search,
  ChevronDown, ChevronUp, File, Image, FileSpreadsheet,
} from 'lucide-react'
import {
  SharedDocument, DocumentRequest, DocumentRequestStatus,
} from '@/types/portal'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return Image
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet
  return File
}

const REQUEST_STATUS_CONFIG: Record<DocumentRequestStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: Upload },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle },
}

export default function PortalDocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<SharedDocument[]>([])
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'shared' | 'requests'>('shared')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [viewingDoc, setViewingDoc] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [docsRes, reqsRes] = await Promise.all([
        fetch('/api/portal/documents'),
        fetch('/api/portal/documents/requests'),
      ])
      if (docsRes.status === 401 || reqsRes.status === 401) {
        router.push('/portal/login')
        return
      }
      const docsData = await docsRes.json()
      const reqsData = await reqsRes.json()
      setDocuments(docsData.data || [])
      setRequests(reqsData.data || [])
    } catch (err) {
      console.error('Documents fetch error:', err)
      setError('Unable to load documents. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleView = async (docId: string) => {
    setViewingDoc(docId)
    try {
      await fetch(`/api/portal/documents/${docId}/view`, { method: 'POST' })
      // Re-fetch to update view count
      const docsRes = await fetch('/api/portal/documents')
      if (docsRes.ok) {
        const docsData = await docsRes.json()
        setDocuments(docsData.data || [])
      }
    } catch (err) {
      console.error('View error:', err)
    } finally {
      setViewingDoc(null)
    }
  }

  const handleDownload = async (docId: string, fileName: string) => {
    setDownloading(docId)
    try {
      const res = await fetch(`/api/portal/documents/${docId}/download`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download file. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  const handleFileUpload = async (requestId: string, file: globalThis.File) => {
    setUploading(requestId)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/portal/documents/requests/${requestId}/submit`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }
      // Re-fetch requests
      const reqsRes = await fetch('/api/portal/documents/requests')
      if (reqsRes.ok) {
        const reqsData = await reqsRes.json()
        setRequests(reqsData.data || [])
      }
      setExpandedRequest(null)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(null)
    }
  }

  const filteredDocuments = documents.filter(d =>
    !searchQuery ||
    d.document?.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredRequests = requests.filter(r =>
    !searchQuery ||
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.document_type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingRequests = requests.filter(r => r.status === 'pending')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-600 mt-1">View shared documents and submit requested files</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 text-sm underline mt-1">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Pending requests alert */}
      {pendingRequests.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">
              {pendingRequests.length} document{pendingRequests.length !== 1 ? 's' : ''} requested
            </p>
            <p className="text-amber-700 text-sm mt-1">
              Your legal team has requested documents that need your attention.
            </p>
            <button
              onClick={() => setActiveTab('requests')}
              className="text-amber-700 text-sm font-medium underline mt-2"
            >
              View requests
            </button>
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'shared'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Shared Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'requests'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Requests ({requests.length})
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-xs rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Shared Documents Tab */}
      {activeTab === 'shared' && (
        <div className="space-y-3">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No shared documents</p>
              <p className="text-sm mt-1">Documents shared by your legal team will appear here.</p>
            </div>
          ) : (
            filteredDocuments.map(doc => {
              const FileIcon = getFileIcon(doc.document?.file_type || '')
              return (
                <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {doc.document?.file_name || 'Document'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                            {doc.category && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded text-xs font-medium text-gray-600">
                                {doc.category}
                              </span>
                            )}
                            <span>{formatFileSize(doc.document?.file_size || 0)}</span>
                            <span>Shared {formatDate(doc.created_at)}</span>
                            {doc.shared_by_name && <span>by {doc.shared_by_name}</span>}
                          </div>
                          {doc.share_message && (
                            <p className="text-sm text-gray-600 mt-2">{doc.share_message}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleView(doc.id)}
                            disabled={viewingDoc === doc.id}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View document"
                          >
                            {viewingDoc === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          {doc.allow_download && (
                            <button
                              onClick={() => handleDownload(doc.id, doc.document?.file_name || 'document')}
                              disabled={downloading === doc.id}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              {downloading === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      {/* View stats */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {doc.view_count} view{doc.view_count !== 1 ? 's' : ''}
                        </span>
                        {doc.allow_download && (
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" /> {doc.download_count} download{doc.download_count !== 1 ? 's' : ''}
                          </span>
                        )}
                        {doc.requires_signature && (
                          <span className={`flex items-center gap-1 ${
                            doc.signature_status === 'signed' ? 'text-green-500' : 'text-amber-500'
                          }`}>
                            <FileText className="w-3 h-3" />
                            {doc.signature_status === 'signed' ? 'Signed' : 'Signature required'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Document Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Upload className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No document requests</p>
              <p className="text-sm mt-1">When your legal team requests documents, they will appear here.</p>
            </div>
          ) : (
            filteredRequests.map(req => {
              const statusConfig = REQUEST_STATUS_CONFIG[req.status]
              const StatusIcon = statusConfig.icon
              const isExpanded = expandedRequest === req.id
              const isOverdue = req.deadline && new Date(req.deadline) < new Date() && req.status === 'pending'

              return (
                <div key={req.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedRequest(isExpanded ? null : req.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        req.status === 'pending' ? 'bg-amber-50' : 'bg-gray-50'
                      }`}>
                        <StatusIcon className={`w-5 h-5 ${
                          req.status === 'pending' ? 'text-amber-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{req.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                              {req.priority === 'urgent' && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                  Urgent
                                </span>
                              )}
                              {req.priority === 'high' && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                  High Priority
                                </span>
                              )}
                              {isOverdue && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {req.deadline && (
                              <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                Due {formatDate(req.deadline)}
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {req.requested_by_name && (
                          <p className="text-sm text-gray-500 mt-1">
                            Requested by {req.requested_by_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {req.description && (
                        <p className="text-sm text-gray-700 mb-3">{req.description}</p>
                      )}
                      {req.instructions && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-1">Instructions</p>
                          <p className="text-sm text-blue-700">{req.instructions}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mb-4">
                        <span>Type: {req.document_type}</span>
                        {req.accepted_formats && req.accepted_formats.length > 0 && (
                          <span>Formats: {req.accepted_formats.join(', ')}</span>
                        )}
                        {req.max_file_size_mb > 0 && (
                          <span>Max size: {req.max_file_size_mb} MB</span>
                        )}
                      </div>

                      {req.status === 'rejected' && req.rejection_reason && (
                        <div className="mb-4 p-3 bg-red-50 rounded-lg">
                          <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
                          <p className="text-sm text-red-700">{req.rejection_reason}</p>
                        </div>
                      )}

                      {/* Upload area for pending/rejected requests */}
                      {(req.status === 'pending' || req.status === 'rejected') && (
                        <div className="mt-3">
                          <label
                            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                              uploading === req.id
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                            }`}
                          >
                            {uploading === req.id ? (
                              <div className="flex flex-col items-center">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                                <p className="text-sm text-blue-600">Uploading...</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600 font-medium">Click to upload file</p>
                                <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
                              </div>
                            )}
                            <input
                              type="file"
                              className="hidden"
                              disabled={uploading === req.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFileUpload(req.id, file)
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
