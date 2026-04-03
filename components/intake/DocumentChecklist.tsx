'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { DocumentChecklist as ChecklistType, DocumentChecklistItem, DOCUMENT_TYPES, DocumentType } from '@/types/intake-documents'
import DocumentUploadModal from './DocumentUploadModal'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface DocumentChecklistProps {
  intakeId: string
  onProgressChange?: (progress: number) => void
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Pending' },
  uploaded: { icon: Upload, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Uploaded' },
  processing: { icon: Loader2, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Verifying' },
  verified: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100', label: 'Verified' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Needs Review' },
}

export default function DocumentChecklist({ intakeId, onProgressChange }: DocumentChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    required: true,
    recommended: true,
    optional: false,
  })
  const [selectedDocument, setSelectedDocument] = useState<DocumentChecklistItem | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showInfoType, setShowInfoType] = useState<string | null>(null)

  const fetchChecklist = useCallback(async () => {
    try {
      const response = await authFetch(`/api/intakes/${intakeId}/documents`)
      if (!response.ok) throw new Error('Failed to fetch documents')

      const data = await response.json()
      setChecklist(data.checklist)

      if (onProgressChange && data.checklist) {
        onProgressChange(data.checklist.progressPercentage)
      }
    } catch (err) {
      console.error('Fetch checklist error:', err)
      setError('Failed to load document checklist')
    } finally {
      setIsLoading(false)
    }
  }, [intakeId, onProgressChange])

  useEffect(() => {
    fetchChecklist()
  }, [fetchChecklist])

  const generateChecklist = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await authFetch(`/api/intakes/${intakeId}/generate-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error('Failed to generate checklist')

      const data = await response.json()
      setChecklist(data.checklist)

      if (onProgressChange && data.checklist) {
        onProgressChange(data.checklist.progressPercentage)
      }
    } catch (err) {
      console.error('Generate checklist error:', err)
      setError('Failed to generate document checklist')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUploadClick = (item: DocumentChecklistItem) => {
    setSelectedDocument(item)
    setShowUploadModal(true)
  }

  const handleUploadComplete = () => {
    setShowUploadModal(false)
    setSelectedDocument(null)
    fetchChecklist()
  }

  const toggleSection = (section: 'required' | 'recommended' | 'optional') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading documents...</span>
      </div>
    )
  }

  if (error && !checklist) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={generateChecklist}
          className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Try generating checklist
        </button>
      </div>
    )
  }

  // No checklist generated yet
  if (!checklist || (checklist.totalRequired === 0 && checklist.totalRecommended === 0)) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="font-medium text-gray-900 mb-2">No Document Checklist Yet</h3>
        <p className="text-gray-600 text-sm mb-4">
          Generate a personalized document checklist based on your intake responses.
        </p>
        <button
          onClick={generateChecklist}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Generate Checklist
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Document Progress</h3>
          <span className="text-sm font-medium text-blue-600">
            {checklist.uploadedRequired} of {checklist.totalRequired} required
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${checklist.progressPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {checklist.progressPercentage === 100
            ? 'All required documents uploaded!'
            : `Upload ${checklist.totalRequired - checklist.uploadedRequired} more required documents`}
        </p>
      </div>

      {/* Required Documents */}
      {checklist.totalRequired > 0 && (
        <DocumentSection
          title="Required Documents"
          items={checklist.required}
          isExpanded={expandedSections.required}
          onToggle={() => toggleSection('required')}
          onUpload={handleUploadClick}
          onShowInfo={setShowInfoType}
          showInfoType={showInfoType}
          badgeColor="bg-red-100 text-red-700"
          uploadedCount={checklist.uploadedRequired}
          totalCount={checklist.totalRequired}
        />
      )}

      {/* Recommended Documents */}
      {checklist.totalRecommended > 0 && (
        <DocumentSection
          title="Recommended Documents"
          items={checklist.recommended}
          isExpanded={expandedSections.recommended}
          onToggle={() => toggleSection('recommended')}
          onUpload={handleUploadClick}
          onShowInfo={setShowInfoType}
          showInfoType={showInfoType}
          badgeColor="bg-yellow-100 text-yellow-700"
          uploadedCount={checklist.uploadedRecommended}
          totalCount={checklist.totalRecommended}
        />
      )}

      {/* Optional Documents */}
      {checklist.totalOptional > 0 && (
        <DocumentSection
          title="Optional Documents"
          items={checklist.optional}
          isExpanded={expandedSections.optional}
          onToggle={() => toggleSection('optional')}
          onUpload={handleUploadClick}
          onShowInfo={setShowInfoType}
          showInfoType={showInfoType}
          badgeColor="bg-gray-100 text-gray-700"
          uploadedCount={checklist.uploadedOptional}
          totalCount={checklist.totalOptional}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedDocument && (
        <DocumentUploadModal
          intakeId={intakeId}
          document={selectedDocument}
          onClose={() => setShowUploadModal(false)}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  )
}

interface DocumentSectionProps {
  title: string
  items: DocumentChecklistItem[]
  isExpanded: boolean
  onToggle: () => void
  onUpload: (item: DocumentChecklistItem) => void
  onShowInfo: (type: string | null) => void
  showInfoType: string | null
  badgeColor: string
  uploadedCount: number
  totalCount: number
}

function DocumentSection({
  title,
  items,
  isExpanded,
  onToggle,
  onUpload,
  onShowInfo,
  showInfoType,
  badgeColor,
  uploadedCount,
  totalCount,
}: DocumentSectionProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900">{title}</span>
          <span className={`text-xs px-2 py-1 rounded-full ${badgeColor}`}>
            {uploadedCount}/{totalCount}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t divide-y">
          {items.map((item) => {
            const config = DOCUMENT_TYPES[item.type as DocumentType] || item.config
            const status = STATUS_CONFIG[item.status]
            const StatusIcon = status.icon

            return (
              <div key={item.type} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{config.name}</span>
                      <button
                        onClick={() => onShowInfo(showInfoType === item.type ? null : item.type)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                        <StatusIcon className={`w-3 h-3 ${item.status === 'processing' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </span>
                    </div>

                    {showInfoType === item.type && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                        <p className="text-gray-700 mb-2">{config.description}</p>
                        <p className="text-blue-700 font-medium">Why needed: {config.whyNeeded}</p>
                        <p className="text-gray-500 mt-1">
                          Accepted formats: {config.acceptableFormats.join(', ')}
                        </p>
                      </div>
                    )}

                    {item.status === 'rejected' && item.document && (
                      <p className="text-sm text-red-600 mt-1">
                        {(item.document as { rejection_reason?: string }).rejection_reason || 'Document could not be verified. Please re-upload.'}
                      </p>
                    )}
                  </div>

                  <div className="ml-4">
                    {item.status === 'pending' || item.status === 'rejected' ? (
                      <button
                        onClick={() => onUpload(item)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                      >
                        <Upload className="w-4 h-4" />
                        {item.status === 'rejected' ? 'Re-upload' : 'Upload'}
                      </button>
                    ) : item.status === 'processing' ? (
                      <span className="text-sm text-yellow-600">Verifying...</span>
                    ) : item.status === 'verified' || item.status === 'uploaded' ? (
                      <button
                        onClick={() => onUpload(item)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Replace
                      </button>
                    ) : null}
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
