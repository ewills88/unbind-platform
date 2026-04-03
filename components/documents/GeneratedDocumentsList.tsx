'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState, useEffect } from 'react'
import {
  FileText,
  Clock,
  Check,
  Eye,
  Send,
  Download,
  MoreVertical,
  Loader2,
  Plus,
  Archive,
  XCircle,
  AlertCircle
} from 'lucide-react'
import {
  GeneratedDocument,
  GeneratedDocumentStatus,
  DOCUMENT_TYPE_INFO,
  DOCUMENT_STATUS_INFO
} from '@/types/document-templates'

interface GeneratedDocumentsListProps {
  caseId: string
  onGenerateNew?: () => void
  onSelectDocument?: (document: GeneratedDocument) => void
}

export default function GeneratedDocumentsList({
  caseId,
  onGenerateNew,
  onSelectDocument
}: GeneratedDocumentsListProps) {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    in_review: 0,
    approved: 0,
    filed: 0,
    rejected: 0
  })
  const [filterStatus, setFilterStatus] = useState<GeneratedDocumentStatus | ''>('')
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [caseId, filterStatus])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)

      const response = await authFetch(`/api/cases/${caseId}/documents/generated?${params}`)
      if (!response.ok) throw new Error('Failed to fetch documents')

      const data = await response.json()
      setDocuments(data.documents || [])
      setStats(data.stats || stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (documentId: string, newStatus: GeneratedDocumentStatus) => {
    try {
      const response = await authFetch(`/api/cases/${caseId}/documents/generated/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update status')
      }

      fetchDocuments()
      setActionMenuOpen(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await authFetch(`/api/cases/${caseId}/documents/generated/${documentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete document')
      }

      fetchDocuments()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete document')
    }
  }

  const getStatusIcon = (status: GeneratedDocumentStatus) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-4 h-4" />
      case 'in_review':
        return <Eye className="w-4 h-4" />
      case 'approved':
        return <Check className="w-4 h-4" />
      case 'filed':
        return <Archive className="w-4 h-4" />
      case 'rejected':
        return <XCircle className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: GeneratedDocumentStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700'
      case 'in_review':
        return 'bg-yellow-100 text-yellow-700'
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'filed':
        return 'bg-blue-100 text-blue-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading documents...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-red-600 mt-4">{error}</p>
        <button
          onClick={fetchDocuments}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Generated Documents</h2>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-gray-500">{stats.total} total</span>
            {stats.draft > 0 && (
              <span className="text-gray-600">{stats.draft} drafts</span>
            )}
            {stats.in_review > 0 && (
              <span className="text-yellow-600">{stats.in_review} in review</span>
            )}
            {stats.approved > 0 && (
              <span className="text-green-600">{stats.approved} approved</span>
            )}
            {stats.filed > 0 && (
              <span className="text-blue-600">{stats.filed} filed</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as GeneratedDocumentStatus | '')}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="filed">Filed</option>
            <option value="rejected">Rejected</option>
          </select>

          {onGenerateNew && (
            <button
              onClick={onGenerateNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Generate New
            </button>
          )}
        </div>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Documents Yet</h3>
          <p className="text-gray-500 mt-2">
            Generate your first legal document from a template
          </p>
          {onGenerateNew && (
            <button
              onClick={onGenerateNew}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate Document
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {documents.map(doc => {
            const docType = DOCUMENT_TYPE_INFO[doc.document_type]

            return (
              <div
                key={doc.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectDocument?.(doc)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileText className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {doc.document_title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {docType?.label || doc.document_type}
                        {doc.template && ` • ${(doc.template as { form_number?: string }).form_number || ''}`}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        {doc.version > 1 && (
                          <span>v{doc.version}</span>
                        )}
                        {doc.filed_date && (
                          <span className="text-blue-600">
                            Filed {new Date(doc.filed_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      getStatusColor(doc.status)
                    }`}>
                      {getStatusIcon(doc.status)}
                      {DOCUMENT_STATUS_INFO[doc.status]?.label || doc.status}
                    </span>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActionMenuOpen(actionMenuOpen === doc.id ? null : doc.id)
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>

                      {actionMenuOpen === doc.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`/api/cases/${caseId}/documents/generated/${doc.id}/preview`, '_blank')
                              setActionMenuOpen(null)
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`/api/cases/${caseId}/documents/generated/${doc.id}/download`, '_blank')
                              setActionMenuOpen(null)
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>

                          {doc.status === 'draft' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange(doc.id, 'in_review')
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              Submit for Review
                            </button>
                          )}

                          {doc.status === 'in_review' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(doc.id, 'approved')
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600"
                              >
                                <Check className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(doc.id, 'draft')
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                Return to Draft
                              </button>
                            </>
                          )}

                          {doc.status === 'approved' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const filedDate = prompt('Enter filing date (YYYY-MM-DD):')
                                if (filedDate) {
                                  handleStatusChange(doc.id, 'filed')
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                            >
                              <Archive className="w-4 h-4" />
                              Mark as Filed
                            </button>
                          )}

                          {doc.status !== 'filed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(doc.id)
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600 border-t"
                            >
                              <XCircle className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
