'use client'

import { useState } from 'react'
import {
  Sparkles,
  FileText,
  DollarSign,
  Calendar,
  Users,
  Building,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { DocumentSummary, DocumentExtraction } from '@/types/ai'

interface DocumentAIInsightsProps {
  documentId: string
  fileUrl: string
  filename: string
  mimeType: string
  existingSummary?: DocumentSummary | null
  existingExtraction?: DocumentExtraction | null
  onAnalysisComplete?: () => void
}

export default function DocumentAIInsights({
  documentId,
  fileUrl,
  filename,
  mimeType,
  existingSummary,
  existingExtraction,
  onAnalysisComplete
}: DocumentAIInsightsProps) {
  const [summary, setSummary] = useState<DocumentSummary | null>(existingSummary || null)
  const [extraction, setExtraction] = useState<DocumentExtraction | null>(existingExtraction || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const runAnalysis = async (type: 'full' | 'summarize' | 'extract') => {
    setLoading(true)
    setError(null)

    try {
      console.log('🚀 Starting analysis:', { documentId, filename, mimeType, type })

      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId,
          fileUrl,
          filename,
          mimeType,
          analysisType: type
        })
      })

      const text = await response.text()
      console.log('📝 Raw API response:', text.substring(0, 500))

      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError)
        throw new Error('Invalid response from server')
      }

      console.log('✅ AI Analysis response:', data)

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Analysis failed')
      }

      // Handle different response structures based on analysis type
      let newSummary: DocumentSummary | null = null
      let newExtraction: DocumentExtraction | null = null

      // Full analysis returns summary and extraction directly
      if (data.summary) {
        newSummary = data.summary
        console.log('📄 Got summary:', newSummary)
      }
      if (data.extraction) {
        newExtraction = data.extraction
        console.log('📊 Got extraction:', newExtraction)
      }

      // For categorize-only responses, create a summary from category
      if (data.category && !newSummary) {
        newSummary = {
          summary: data.category.reasoning || 'Document analyzed',
          keyPoints: [
            `Category: ${data.category.category}`,
            `Confidence: ${data.category.confidence}%`
          ],
          documentType: data.category.metadata?.documentType || data.category.category,
          relevance: data.category.confidence >= 70 ? 'high' : data.category.confidence >= 50 ? 'medium' : 'low',
          generatedAt: new Date().toISOString()
        }
        console.log('📄 Created summary from category:', newSummary)
      }

      // Update state - ensure we set something
      if (newSummary) {
        setSummary(newSummary)
      } else if (data.status === 'complete' || data.success) {
        // Fallback: create minimal summary if API says success but no summary
        setSummary({
          summary: 'Document analyzed successfully',
          keyPoints: ['Analysis complete'],
          documentType: mimeType.includes('pdf') ? 'PDF Document' : 'Document',
          relevance: 'medium',
          generatedAt: new Date().toISOString()
        })
        console.log('📄 Created fallback summary')
      }

      if (newExtraction) {
        setExtraction(newExtraction)
      }

      onAnalysisComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-amber-600 bg-amber-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Analyze Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">AI Insights</h3>
        </div>
        <button
          onClick={() => runAnalysis('full')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {loading ? 'Analyzing...' : summary ? 'Re-analyze' : 'Analyze'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* No Analysis Yet */}
      {!summary && !extraction && !loading && (
        <div className="text-center py-6 text-gray-500">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Click "Analyze" to generate AI insights</p>
          <p className="text-xs mt-1">Includes summary, key info extraction, and categorization</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-6">
          <Loader2 className="w-8 h-8 mx-auto mb-2 text-purple-600 animate-spin" />
          <p className="text-sm text-gray-600">Analyzing document...</p>
          <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Summary Section */}
      {summary && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('summary')}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Summary</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getRelevanceColor(summary.relevance)}`}>
                {summary.relevance} relevance
              </span>
            </div>
            {expandedSections.has('summary') ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedSections.has('summary') && (
            <div className="p-3 space-y-3">
              <p className="text-sm text-gray-700">{summary.summary}</p>

              {summary.keyPoints && summary.keyPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Key Points</h4>
                  <ul className="space-y-1">
                    {summary.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-gray-400">
                Document type: {summary.documentType}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key Figures Section */}
      {extraction?.keyFigures && extraction.keyFigures.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('figures')}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">Key Figures</span>
              <span className="text-xs text-gray-500">({extraction.keyFigures.length})</span>
            </div>
            {expandedSections.has('figures') ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedSections.has('figures') && (
            <div className="p-3">
              <div className="grid grid-cols-2 gap-2">
                {extraction.keyFigures.map((figure, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-2">
                    <div className="text-xs text-gray-500">{figure.label}</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {figure.type === 'currency' && typeof figure.value === 'number'
                        ? formatCurrency(figure.value)
                        : figure.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dates Section */}
      {extraction?.dates && extraction.dates.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('dates')}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-900">Important Dates</span>
              <span className="text-xs text-gray-500">({extraction.dates.length})</span>
            </div>
            {expandedSections.has('dates') ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedSections.has('dates') && (
            <div className="p-3 space-y-2">
              {extraction.dates.map((date, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    date.isImportant ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{date.description}</div>
                    <div className="text-xs text-gray-500 capitalize">{date.type}</div>
                  </div>
                  <div className={`text-sm font-medium ${date.isImportant ? 'text-red-600' : 'text-gray-600'}`}>
                    {formatDate(date.date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Parties Section */}
      {extraction?.parties && extraction.parties.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('parties')}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">Parties Identified</span>
              <span className="text-xs text-gray-500">({extraction.parties.length})</span>
            </div>
            {expandedSections.has('parties') ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedSections.has('parties') && (
            <div className="p-3 space-y-2">
              {extraction.parties.map((party, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{party.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{party.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Properties Section */}
      {extraction?.properties && extraction.properties.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('properties')}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-900">Assets & Property</span>
              <span className="text-xs text-gray-500">({extraction.properties.length})</span>
            </div>
            {expandedSections.has('properties') ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedSections.has('properties') && (
            <div className="p-3 space-y-2">
              {extraction.properties.map((prop, idx) => (
                <div key={idx} className="p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{prop.description}</div>
                    {prop.estimatedValue && (
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(prop.estimatedValue)}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 capitalize mt-1">
                    {prop.type.replace('_', ' ')}
                    {prop.address && ` • ${prop.address}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
