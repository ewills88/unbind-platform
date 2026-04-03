'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Search,
  Upload,
  DollarSign,
  Scale,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import {
  FirmTemplate,
  TemplateType,
  TEMPLATE_TYPE_INFO,
  CreateTemplateRequest,
} from '@/types/collaboration'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { authFetch } from '@/lib/supabase/auth-fetch'

const TEMPLATE_TYPE_ICONS: Record<string, React.ReactNode> = {
  petition: <FileText className="w-5 h-5 text-blue-600" />,
  response: <FileText className="w-5 h-5 text-green-600" />,
  financial_disclosure: <DollarSign className="w-5 h-5 text-yellow-600" />,
  declaration: <FileText className="w-5 h-5 text-purple-600" />,
  settlement: <FileText className="w-5 h-5 text-teal-600" />,
  motion: <Scale className="w-5 h-5 text-orange-600" />,
  order: <FileText className="w-5 h-5 text-red-600" />,
}

const CATEGORIES = [
  { id: 'all', name: 'All Templates' },
  { id: 'petition', name: 'Petitions' },
  { id: 'financial_disclosure', name: 'Financial Forms' },
  { id: 'declaration', name: 'Declarations' },
  { id: 'settlement', name: 'Settlements' },
  { id: 'motion', name: 'Motions' },
  { id: 'order', name: 'Orders' },
]

export default function FirmTemplateLibrary() {
  const [templates, setTemplates] = useState<FirmTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedState, setSelectedState] = useState('all')

  // Upload dialog
  const [showUpload, setShowUpload] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadType, setUploadType] = useState<TemplateType>('petition')
  const [uploadState, setUploadState] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [uploadContent, setUploadContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/firms/templates')
      const data = await res.json()
      setTemplates(data.templates || [])
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    const matchesCategory =
      selectedCategory === 'all' || t.template_type === selectedCategory
    const matchesState =
      selectedState === 'all' || t.state_code === selectedState
    return matchesSearch && matchesCategory && matchesState
  })

  const handleUpload = async () => {
    if (!uploadName.trim()) return
    setUploading(true)
    setUploadError('')
    try {
      const payload: CreateTemplateRequest = {
        template_name: uploadName.trim(),
        template_type: uploadType,
        content: uploadContent || undefined,
        state_code: uploadState || undefined,
        description: uploadDescription || undefined,
        tags: uploadTags
          ? uploadTags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
      }

      const res = await authFetch('/api/firms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setShowUpload(false)
        setUploadName('')
        setUploadType('petition')
        setUploadState('')
        setUploadDescription('')
        setUploadTags('')
        setUploadContent('')
        fetchTemplates()
      } else {
        const data = await res.json().catch(() => ({}))
        setUploadError(data.error || 'Failed to create template')
      }
    } catch {
      setUploadError('Network error — please try again')
    } finally {
      setUploading(false)
    }
  }

  // Get unique states from templates
  const states = Array.from(new Set(templates.map((t) => t.state_code).filter(Boolean)))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template Library</h1>
          <p className="text-gray-500 mt-1">
            Shared firm templates and documents
          </p>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Template
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All States</option>
          {states.map((state) => (
            <option key={state} value={state!}>
              {state}
            </option>
          ))}
        </select>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <FileText className="mx-auto mb-4 text-gray-300 w-16 h-16" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No templates found
          </h3>
          <p className="text-gray-500 text-sm">
            {searchQuery
              ? 'Try a different search'
              : 'Upload your first template to get started'}
          </p>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Template</DialogTitle>
            <DialogDescription>
              Add a new template to the firm library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Template Name *</Label>
              <input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g., Standard Petition - CA"
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Type</Label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as TemplateType)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {(
                    Object.entries(TEMPLATE_TYPE_INFO) as [
                      TemplateType,
                      typeof TEMPLATE_TYPE_INFO[TemplateType]
                    ][]
                  ).map(([type, info]) => (
                    <option key={type} value={type}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>State Code</Label>
                <input
                  value={uploadState}
                  onChange={(e) => setUploadState(e.target.value.toUpperCase())}
                  placeholder="e.g., CA"
                  maxLength={2}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="What this template is for..."
                rows={2}
                className="mt-1 w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            <div>
              <Label>Template Content</Label>
              <textarea
                value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)}
                placeholder="Paste template content here..."
                rows={6}
                className="mt-1 w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono"
              />
            </div>

            <div>
              <Label>Tags (comma-separated)</Label>
              <input
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="e.g., divorce, petition, california"
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {uploadError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{uploadError}</p>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowUpload(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadName.trim() || uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Upload'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateCard({ template }: { template: FirmTemplate }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        <div className="w-11 h-11 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          {TEMPLATE_TYPE_ICONS[template.template_type] || (
            <FileText className="w-5 h-5 text-blue-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {template.template_name}
            </h3>
            {template.is_default && (
              <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full flex-shrink-0">
                Default
              </span>
            )}
          </div>

          {template.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {template.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500">
            {template.state_code && (
              <span>{template.state_code}</span>
            )}
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{template.usage_count} uses</span>
            </div>
          </div>

          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-xs text-gray-600 bg-gray-100 rounded"
                >
                  {tag}
                </span>
              ))}
              {template.tags.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{template.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
