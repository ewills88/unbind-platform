'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Upload,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Eye,
  Download,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatShortDate } from '@/lib/dates'
import { DOCUMENT_CATEGORIES } from '@/types/documents'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface ClientDocument {
  id: string
  original_filename: string
  filename: string
  category: string | null
  mime_type: string
  file_size: number
  storage_path: string
  uploaded_at: string
  uploader_id: string
  is_shared_with_client: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function ClientDocumentsPage() {
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await authFetch('/api/client/documents')
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    { id: 'all', name: 'All Documents', count: documents.length },
    ...DOCUMENT_CATEGORIES.map(cat => ({
      id: cat.value,
      name: cat.label,
      count: documents.filter(d => d.category === cat.value).length,
    })).filter(cat => cat.count > 0),
  ]

  const filteredDocs = selectedCategory === 'all'
    ? documents
    : documents.filter(d => d.category === selectedCategory)

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-blue-500" />
    if (mimeType === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />
    if (mimeType.includes('word')) return <FileText className="w-8 h-8 text-blue-600" />
    return <FileIcon className="w-8 h-8 text-gray-500" />
  }

  const getCategoryLabel = (category: string | null) => {
    if (!category) return 'Uncategorized'
    const found = DOCUMENT_CATEGORIES.find(c => c.value === category)
    return found?.label || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1 text-sm">Your case documents</p>
        </div>

        <Link
          href="/client/documents/upload"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors min-h-[44px]"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Link>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              'whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px]',
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Document grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {getFileIcon(doc.mime_type)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900 truncate">
                    {doc.original_filename}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {getCategoryLabel(doc.category)}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>·</span>
                    <span>{formatShortDate(doc.uploaded_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => window.open(`/dashboard/documents?preview=${doc.id}`, '_blank')}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Upload your documents to get started
          </p>
          <Link
            href="/client/documents/upload"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Upload Documents
          </Link>
        </div>
      )}
    </div>
  )
}
