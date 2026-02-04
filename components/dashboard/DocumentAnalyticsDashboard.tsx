'use client'

import { useEffect, useState } from 'react'
import {
  PieChart,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Building,
  Loader2
} from 'lucide-react'
import { Document } from '@/types/documents'
import { DocumentExtraction, ExtractedPropertyInfo } from '@/types/ai'

// Document with AI analysis fields from database
interface DocumentWithAI extends Document {
  ai_extraction?: DocumentExtraction | null
  ai_category?: string | null
  ai_confidence?: number | null
}

interface AnalyticsDashboardProps {
  caseId?: string
  documents: DocumentWithAI[]
}

interface CategoryStats {
  category: string
  count: number
  percentage: number
  color: string
}

interface MissingDocument {
  type: string
  importance: 'required' | 'recommended' | 'optional'
  reason: string
}

const CATEGORY_COLORS: Record<string, string> = {
  financial: 'bg-blue-500',
  legal: 'bg-purple-500',
  property: 'bg-green-500',
  custody: 'bg-orange-500',
  tax: 'bg-red-500',
  employment: 'bg-cyan-500',
  court: 'bg-indigo-500',
  other: 'bg-gray-500'
}

const CATEGORY_LABELS: Record<string, string> = {
  financial: 'Financial',
  legal: 'Legal',
  property: 'Property',
  custody: 'Custody',
  tax: 'Tax',
  employment: 'Employment',
  court: 'Court',
  other: 'Other'
}

// Documents typically needed for divorce cases
const REQUIRED_DOCUMENTS = [
  { type: 'tax', label: 'Tax Returns (Last 3 years)', importance: 'required' as const },
  { type: 'financial', label: 'Bank Statements', importance: 'required' as const },
  { type: 'employment', label: 'Pay Stubs / Income Proof', importance: 'required' as const },
  { type: 'property', label: 'Property Deeds/Titles', importance: 'recommended' as const },
  { type: 'financial', label: 'Retirement Account Statements', importance: 'recommended' as const },
  { type: 'financial', label: 'Credit Card Statements', importance: 'recommended' as const },
  { type: 'legal', label: 'Prenuptial Agreement', importance: 'optional' as const },
  { type: 'custody', label: 'Parenting Plan', importance: 'optional' as const },
]

export default function DocumentAnalyticsDashboard({ documents }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(false)
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [missingDocs, setMissingDocs] = useState<MissingDocument[]>([])
  const [financialSummary, setFinancialSummary] = useState({
    totalAssets: 0,
    totalDebts: 0,
    accountsIdentified: 0
  })
  const [uploadTimeline, setUploadTimeline] = useState<{ date: string; count: number }[]>([])

  useEffect(() => {
    analyzeDocuments()
  }, [documents])

  const analyzeDocuments = () => {
    setLoading(true)

    // Calculate category breakdown
    const categoryCounts: Record<string, number> = {}
    documents.forEach(doc => {
      const cat = doc.category || 'other'
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })

    const total = documents.length || 1
    const stats: CategoryStats[] = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / total) * 100),
      color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other
    })).sort((a, b) => b.count - a.count)

    setCategoryStats(stats)

    // Determine missing documents
    const missing: MissingDocument[] = REQUIRED_DOCUMENTS
      .filter(req => {
        // Check if we have documents of this type
        const hasType = documents.some(d =>
          d.category === req.type ||
          d.original_filename.toLowerCase().includes(req.label.toLowerCase().split(' ')[0])
        )
        return !hasType
      })
      .map(req => ({
        type: req.label,
        importance: req.importance,
        reason: `No ${req.label.toLowerCase()} found in uploaded documents`
      }))

    setMissingDocs(missing)

    // Calculate upload timeline (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyCounts: Record<string, number> = {}
    documents.forEach(doc => {
      const date = new Date(doc.uploaded_at).toISOString().split('T')[0]
      if (new Date(date) >= thirtyDaysAgo) {
        dailyCounts[date] = (dailyCounts[date] || 0) + 1
      }
    })

    const timeline = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    setUploadTimeline(timeline)

    // Extract financial data from AI extractions (if available)
    let totalAssets = 0
    const totalDebts = 0
    let accountsCount = 0

    documents.forEach(doc => {
      // Check if document has AI extraction data
      const extraction = doc.ai_extraction
      if (extraction) {
        if (extraction.financialData?.totalAmount) {
          totalAssets += extraction.financialData.totalAmount
        }
        if (extraction.properties) {
          extraction.properties.forEach((prop: ExtractedPropertyInfo) => {
            if (prop.estimatedValue) {
              totalAssets += prop.estimatedValue
            }
          })
          accountsCount += extraction.properties.filter((p: ExtractedPropertyInfo) => p.type === 'account').length
        }
      }
    })

    setFinancialSummary({ totalAssets, totalDebts, accountsIdentified: accountsCount })
    setLoading(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'required': return 'text-red-600 bg-red-50'
      case 'recommended': return 'text-amber-600 bg-amber-50'
      case 'optional': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
              <p className="text-sm text-gray-500">Total Documents</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {financialSummary.totalAssets > 0 ? formatCurrency(financialSummary.totalAssets) : '--'}
              </p>
              <p className="text-sm text-gray-500">Assets Identified</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{financialSummary.accountsIdentified}</p>
              <p className="text-sm text-gray-500">Accounts Found</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{missingDocs.filter(d => d.importance === 'required').length}</p>
              <p className="text-sm text-gray-500">Missing Required</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Document Categories</h3>
          </div>

          {categoryStats.length === 0 ? (
            <p className="text-gray-500 text-sm">No documents to analyze</p>
          ) : (
            <div className="space-y-3">
              {categoryStats.map((stat) => (
                <div key={stat.category} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {CATEGORY_LABELS[stat.category] || stat.category}
                      </span>
                      <span className="text-sm text-gray-500">{stat.count} ({stat.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${stat.color}`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missing Documents Checklist */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Document Checklist</h3>
          </div>

          {missingDocs.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">All recommended documents uploaded!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {missingDocs.map((doc, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                    doc.importance === 'required' ? 'text-red-500' :
                    doc.importance === 'recommended' ? 'text-amber-500' : 'text-gray-400'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{doc.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getImportanceColor(doc.importance)}`}>
                        {doc.importance}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Timeline */}
      {uploadTimeline.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Upload Activity (Last 30 Days)</h3>
          </div>

          <div className="flex items-end gap-1 h-32">
            {uploadTimeline.map((day, idx) => {
              const maxCount = Math.max(...uploadTimeline.map(d => d.count))
              const height = (day.count / maxCount) * 100

              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center group"
                >
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                    title={`${day.date}: ${day.count} document(s)`}
                  />
                  {idx % 7 === 0 && (
                    <span className="text-xs text-gray-400 mt-1 transform -rotate-45 origin-left">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
