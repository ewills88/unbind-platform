'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  TrendingUp, 
  Folder,
  HardDrive,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { DOCUMENT_CATEGORIES } from '@/types/documents'

const supabase = createClient(
  'https://rpbjravqgflidnwjkgvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'
)

interface Analytics {
  totalDocuments: number
  uploadedThisWeek: number
  categoryCounts: { category: string; count: number }[]
  largestFiles: { filename: string; size: number; id: string }[]
  mostActiveCases: { case_name: string; count: number; case_id: string }[]
  recentUploads: { filename: string; uploaded_at: string; category: string; id: string }[]
}

export default function DocumentAnalytics() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics>({
    totalDocuments: 0,
    uploadedThisWeek: 0,
    categoryCounts: [],
    largestFiles: [],
    mostActiveCases: [],
    recentUploads: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all documents for this attorney
      const { data: documents, error } = await supabase
        .from('documents')
        .select(`
          *,
          case:case_id(id, client_name, spouse_name)
        `)
        .eq('uploader_id', user.id)

      if (error) throw error

      // Calculate total documents
      const totalDocuments = documents?.length || 0

      // Calculate uploaded this week
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const uploadedThisWeek = documents?.filter(
        d => new Date(d.uploaded_at) >= oneWeekAgo
      ).length || 0

      // Calculate category counts
      const categoryCounts: { [key: string]: number } = {}
      documents?.forEach(doc => {
        const cat = doc.category || 'other'
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      })
      const categoryCountsArray = Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count,
      })).sort((a, b) => b.count - a.count)

      // Get largest files (top 5)
      const largestFiles = documents
        ?.sort((a, b) => b.file_size - a.file_size)
        .slice(0, 5)
        .map(d => ({
          filename: d.original_filename,
          size: d.file_size,
          id: d.id,
        })) || []

      // Get most active cases (by document count)
      const caseCounts: { [key: string]: { name: string; count: number; id: string } } = {}
      documents?.forEach(doc => {
        if (doc.case) {
          const caseId = doc.case_id
          const caseName = `${doc.case.client_name} v. ${doc.case.spouse_name}`
          if (!caseCounts[caseId]) {
            caseCounts[caseId] = { name: caseName, count: 0, id: caseId }
          }
          caseCounts[caseId].count++
        }
      })
      const mostActiveCases = Object.values(caseCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(c => ({
          case_name: c.name,
          count: c.count,
          case_id: c.id,
        }))

      // Get recent uploads (last 5)
      const recentUploads = documents
        ?.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
        .slice(0, 5)
        .map(d => ({
          filename: d.original_filename,
          uploaded_at: d.uploaded_at,
          category: d.category || 'other',
          id: d.id,
        })) || []

      setAnalytics({
        totalDocuments,
        uploadedThisWeek,
        categoryCounts: categoryCountsArray,
        largestFiles,
        mostActiveCases,
        recentUploads,
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
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
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  const getCategoryLabel = (category: string) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.value === category)
    return cat?.label || 'Other'
  }

  const getCategoryColor = (category: string) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.value === category)
    return cat?.color || 'gray'
  }

  const getMaxCount = () => {
    return Math.max(...analytics.categoryCounts.map(c => c.count), 1)
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Document Analytics</h2>
        </div>
        <button
          onClick={() => router.push('/dashboard/documents')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All Documents →
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalDocuments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.uploadedThisWeek}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Folder className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.categoryCounts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <HardDrive className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg File Size</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.totalDocuments > 0
                  ? formatFileSize(
                      analytics.largestFiles.reduce((sum, f) => sum + f.size, 0) /
                        Math.min(analytics.totalDocuments, 5)
                    )
                  : '0 KB'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents by Category */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents by Category</h3>
          {analytics.categoryCounts.length === 0 ? (
            <p className="text-gray-500 text-sm">No documents uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.categoryCounts.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {getCategoryLabel(cat.category)}
                    </span>
                    <span className="text-sm text-gray-600">{cat.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full bg-${getCategoryColor(cat.category)}-500 transition-all`}
                      style={{ width: `${(cat.count / getMaxCount()) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Largest Files */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Largest Files</h3>
          {analytics.largestFiles.length === 0 ? (
            <p className="text-gray-500 text-sm">No files uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.largestFiles.map((file, index) => (
                <div key={file.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900 truncate">{file.filename}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600 ml-2">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most Active Cases */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Active Cases</h3>
          {analytics.mostActiveCases.length === 0 ? (
            <p className="text-gray-500 text-sm">No cases with documents yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.mostActiveCases.map((case_, index) => (
                <div key={case_.case_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
                    <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm text-gray-900 truncate">{case_.case_name}</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600 ml-2">
                    {case_.count} docs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Uploads */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Uploads</h3>
          {analytics.recentUploads.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent uploads</p>
          ) : (
            <div className="space-y-3">
              {analytics.recentUploads.map((upload) => (
                <div key={upload.id} className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">{upload.filename}</p>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-${getCategoryColor(upload.category)}-100 text-${getCategoryColor(upload.category)}-700`}>
                        {getCategoryLabel(upload.category)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(upload.uploaded_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}