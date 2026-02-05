'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Reply,
  Bell,
  DollarSign,
  Receipt,
  Home,
  Users,
  Heart,
  Gavel,
  CheckCircle,
  FileQuestion,
  FileCheck,
  Send,
  Search,
  Filter,
  Clock,
  ChevronRight,
  Loader2
} from 'lucide-react'
import {
  DocumentTemplate,
  DocumentTemplateType,
  DocumentCategory,
  DOCUMENT_TYPE_INFO,
  STATE_INFO
} from '@/types/document-templates'

interface TemplateSelectorProps {
  stateCode?: string
  onSelect: (template: DocumentTemplate) => void
  selectedTemplateId?: string
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Reply,
  Bell,
  DollarSign,
  Receipt,
  Home,
  Users,
  Heart,
  Gavel,
  CheckCircle,
  FileQuestion,
  FileCheck,
  Send
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  initial_filing: 'Initial Filing',
  discovery: 'Discovery',
  custody: 'Custody',
  financial: 'Financial',
  final: 'Final Orders',
  motion: 'Motions',
  response: 'Responses'
}

export default function TemplateSelector({
  stateCode,
  onSelect,
  selectedTemplateId
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<DocumentTemplateType | ''>('')
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | ''>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchTemplates()
  }, [stateCode])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (stateCode) params.set('state_code', stateCode)

      const response = await fetch(`/api/templates?${params}`)
      if (!response.ok) throw new Error('Failed to fetch templates')

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        template.template_name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.form_number?.toLowerCase().includes(query) ||
        template.template_code?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Type filter
    if (filterType && template.template_type !== filterType) {
      return false
    }

    // Category filter
    if (filterCategory && template.category !== filterCategory) {
      return false
    }

    return true
  })

  // Group by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const category = template.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(template)
    return acc
  }, {} as Record<string, DocumentTemplate[]>)

  const getIcon = (templateType: DocumentTemplateType) => {
    const iconName = DOCUMENT_TYPE_INFO[templateType]?.icon || 'FileText'
    return ICON_MAP[iconName] || FileText
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading templates...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchTemplates}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Select Document Template</h2>
          <p className="text-sm text-gray-500">
            {stateCode ? `${STATE_INFO[stateCode]?.name || stateCode} forms` : 'All available forms'}
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredTemplates.length} templates available
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as DocumentTemplateType | '')}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {Object.entries(DOCUMENT_TYPE_INFO).map(([type, info]) => (
              <option key={type} value={type}>{info.label}</option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as DocumentCategory | '')}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
              <option key={cat} value={cat}>{label}</option>
            ))}
          </select>

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Templates */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No templates found matching your criteria
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View - Grouped by Category
        <div className="space-y-8">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {CATEGORY_LABELS[category as DocumentCategory] || category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryTemplates.map(template => {
                  const Icon = getIcon(template.template_type)
                  const isSelected = selectedTemplateId === template.id

                  return (
                    <button
                      key={template.id}
                      onClick={() => onSelect(template)}
                      className={`p-4 text-left border rounded-lg transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            isSelected ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 truncate">
                              {template.template_name}
                            </h4>
                          </div>
                          {template.form_number && (
                            <span className="text-xs font-mono text-gray-500">
                              {template.form_number}
                            </span>
                          )}
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            {template.state_code && (
                              <span className="px-2 py-0.5 bg-gray-100 rounded">
                                {template.state_code}
                              </span>
                            )}
                            {template.estimated_prep_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                ~{template.estimated_prep_time} min
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 ${
                          isSelected ? 'text-blue-500' : 'text-gray-300'
                        }`} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="border rounded-lg divide-y">
          {filteredTemplates.map(template => {
            const Icon = getIcon(template.template_type)
            const isSelected = selectedTemplateId === template.id

            return (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className={`w-full p-4 text-left flex items-center gap-4 hover:bg-gray-50 ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  isSelected ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    isSelected ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">
                      {template.template_name}
                    </h4>
                    {template.form_number && (
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {template.form_number}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {template.description}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-400">
                  {template.state_code && (
                    <span className="block">{STATE_INFO[template.state_code]?.name}</span>
                  )}
                  {template.estimated_prep_time && (
                    <span className="flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      ~{template.estimated_prep_time} min
                    </span>
                  )}
                </div>
                <ChevronRight className={`w-5 h-5 ${
                  isSelected ? 'text-blue-500' : 'text-gray-300'
                }`} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
