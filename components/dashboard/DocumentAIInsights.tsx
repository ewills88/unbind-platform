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
  RefreshCw,
  MapPin,
  Tag,
  ListTodo,
  AlertTriangle,
  Clock,
  TrendingUp
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { DocumentSummary, DocumentExtraction, DocumentAIInsights as InsightsType } from '@/types/ai'
import { TagBadge } from '@/components/tags'
import { authFetch } from '@/lib/supabase/auth-fetch'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface DocumentAIInsightsProps {
  documentId: string
  fileUrl: string
  filename: string
  mimeType: string
  existingSummary?: DocumentSummary | null
  existingExtraction?: DocumentExtraction | null
  existingInsights?: InsightsType | null
  onAnalysisComplete?: () => void
  onSuggestedTagsClick?: (tags: string[]) => void
}

export default function DocumentAIInsights({
  documentId,
  fileUrl,
  filename,
  mimeType,
  existingSummary,
  existingExtraction,
  existingInsights,
  onAnalysisComplete,
  onSuggestedTagsClick
}: DocumentAIInsightsProps) {
  const [summary, setSummary] = useState<DocumentSummary | null>(existingSummary || null)
  const [extraction, setExtraction] = useState<DocumentExtraction | null>(existingExtraction || null)
  const [insights, setInsights] = useState<InsightsType | null>(existingInsights || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'insights']))

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

      // Get current session token for API auth
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await authFetch('/api/analyze-document', {
        method: 'POST',
        headers,
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
      let newInsights: InsightsType | null = null

      // Full analysis returns summary, extraction, and insights directly
      if (data.summary) {
        newSummary = data.summary
        console.log('📄 Got summary:', newSummary)
      }
      if (data.extraction) {
        newExtraction = data.extraction
        console.log('📊 Got extraction:', newExtraction)
      }
      if (data.insights) {
        newInsights = data.insights
        console.log('💡 Got insights:', newInsights)
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

      if (newInsights) {
        setInsights(newInsights)
      }

      onAnalysisComplete?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg.includes('Unauthorized') || msg.includes('logged in')
        ? 'Session expired. Please refresh the page and try again.'
        : msg)
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
          <p className="text-sm">Click &quot;Analyze&quot; to generate AI insights</p>
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

      {/* Enhanced Insights Section */}
      {insights && (
        <>
          {/* Urgency & Sentiment */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('insights')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Document Insights</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getUrgencyColor(insights.urgencyLevel)}`}>
                  {insights.urgencyLevel} urgency
                </span>
              </div>
              {expandedSections.has('insights') ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedSections.has('insights') && (
              <div className="p-3 space-y-3">
                {/* Sentiment & Urgency Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full ${getSentimentColor(insights.sentiment)}`}>
                    {insights.sentiment === 'urgent' ? '⚠️' : insights.sentiment === 'negative' ? '😟' : insights.sentiment === 'positive' ? '😊' : '😐'} {insights.sentiment}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getUrgencyColor(insights.urgencyLevel)}`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    {insights.urgencyLevel} priority
                  </span>
                </div>

                {/* Entities */}
                {(insights.entities.people.length > 0 || insights.entities.organizations.length > 0 || insights.entities.locations.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-500 uppercase">Entities Found</h4>

                    {insights.entities.people.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-purple-500 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {insights.entities.people.map((person, idx) => (
                            <span key={idx} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                              {person}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {insights.entities.organizations.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Building className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {insights.entities.organizations.map((org, idx) => (
                            <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                              {org}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {insights.entities.locations.length > 0 && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {insights.entities.locations.map((loc, idx) => (
                            <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                              {loc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Deadlines Section */}
          {insights.deadlines && insights.deadlines.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('deadlines')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-gray-900">Deadlines</span>
                  <span className="text-xs text-gray-500">({insights.deadlines.length})</span>
                  {insights.deadlines.some(d => d.isUrgent) && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      Urgent
                    </span>
                  )}
                </div>
                {expandedSections.has('deadlines') ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {expandedSections.has('deadlines') && (
                <div className="p-3 space-y-2">
                  {insights.deadlines.map((deadline, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        deadline.isUrgent ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">{deadline.description}</div>
                        {deadline.daysUntil !== undefined && (
                          <div className={`text-xs ${deadline.daysUntil <= 7 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {deadline.daysUntil <= 0 ? 'Overdue!' : deadline.daysUntil === 1 ? 'Tomorrow' : `${deadline.daysUntil} days left`}
                          </div>
                        )}
                      </div>
                      <div className={`text-sm font-medium ${deadline.isUrgent ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatDate(deadline.date)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Items Section */}
          {insights.actionItems && insights.actionItems.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('actions')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-gray-900">Action Items</span>
                  <span className="text-xs text-gray-500">({insights.actionItems.length})</span>
                </div>
                {expandedSections.has('actions') ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {expandedSections.has('actions') && (
                <div className="p-3 space-y-2">
                  {insights.actionItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        item.priority === 'high' ? 'bg-red-500' :
                        item.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">{item.action}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            item.priority === 'high' ? 'bg-red-100 text-red-700' :
                            item.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {item.priority}
                          </span>
                          {item.assignee && (
                            <span className="text-xs text-gray-500">→ {item.assignee}</span>
                          )}
                          {item.dueDate && (
                            <span className="text-xs text-gray-500">Due: {formatDate(item.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Suggested Tags Section */}
          {insights.suggestedTags && insights.suggestedTags.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('suggestedTags')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm font-medium text-gray-900">Suggested Tags</span>
                  <span className="text-xs text-gray-500">({insights.suggestedTags.length})</span>
                </div>
                {expandedSections.has('suggestedTags') ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {expandedSections.has('suggestedTags') && (
                <div className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {insights.suggestedTags.map((tag, idx) => (
                      <TagBadge
                        key={idx}
                        tag={{ name: tag, color: getTagColor(tag) }}
                      />
                    ))}
                  </div>
                  {onSuggestedTagsClick && (
                    <button
                      onClick={() => onSuggestedTagsClick(insights.suggestedTags)}
                      className="mt-3 text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                      Apply suggested tags →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Risk Factors Section */}
          {insights.riskFactors && insights.riskFactors.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('risks')}
                className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-900">Risk Factors</span>
                  <span className="text-xs text-red-600">({insights.riskFactors.length})</span>
                </div>
                {expandedSections.has('risks') ? (
                  <ChevronUp className="w-4 h-4 text-red-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-red-400" />
                )}
              </button>

              {expandedSections.has('risks') && (
                <div className="p-3 space-y-2 bg-red-50/50">
                  {insights.riskFactors.map((risk, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-red-100">
                      <div className="flex items-start gap-2">
                        <AlertCircle className={`w-4 h-4 mt-0.5 ${
                          risk.severity === 'high' ? 'text-red-600' :
                          risk.severity === 'medium' ? 'text-amber-600' : 'text-yellow-600'
                        }`} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{risk.factor}</div>
                          <div className="text-xs text-gray-600 mt-1">{risk.recommendation}</div>
                          <span className={`text-xs mt-1 inline-block px-1.5 py-0.5 rounded ${
                            risk.severity === 'high' ? 'bg-red-100 text-red-700' :
                            risk.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {risk.severity} severity
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Helper functions for styling
function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'critical': return 'bg-red-100 text-red-700'
    case 'high': return 'bg-orange-100 text-orange-700'
    case 'medium': return 'bg-amber-100 text-amber-700'
    case 'low': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'urgent': return 'bg-red-100 text-red-700'
    case 'negative': return 'bg-orange-100 text-orange-700'
    case 'positive': return 'bg-green-100 text-green-700'
    case 'neutral': return 'bg-gray-100 text-gray-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function getTagColor(tag: string): 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray' | 'cyan' | 'indigo' | 'pink' {
  const tagLower = tag.toLowerCase()
  if (tagLower.includes('urgent') || tagLower.includes('deadline')) return 'red'
  if (tagLower.includes('court') || tagLower.includes('legal')) return 'purple'
  if (tagLower.includes('financial') || tagLower.includes('money')) return 'green'
  if (tagLower.includes('draft')) return 'gray'
  if (tagLower.includes('final') || tagLower.includes('approved')) return 'blue'
  if (tagLower.includes('confidential')) return 'pink'
  if (tagLower.includes('review')) return 'orange'
  return 'cyan'
}
