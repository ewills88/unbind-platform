'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState, useEffect } from 'react'
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  Download,
  Eye,
  Save
} from 'lucide-react'
import TemplateSelector from './TemplateSelector'
import DataMappingReview from './DataMappingReview'
import {
  DocumentTemplate,
  FilledDocumentData,
  DataValidationWarning,
  DOCUMENT_TYPE_INFO
} from '@/types/document-templates'

interface DocumentGeneratorProps {
  caseId: string
  stateCode?: string
  onComplete?: (documentId: string) => void
  onCancel?: () => void
}

type WizardStep = 'select' | 'review' | 'customize' | 'generate'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'select', label: 'Select Template' },
  { id: 'review', label: 'Review Data' },
  { id: 'customize', label: 'Customize' },
  { id: 'generate', label: 'Generate' }
]

export default function DocumentGenerator({
  caseId,
  stateCode,
  onComplete,
  onCancel
}: DocumentGeneratorProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select')
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [previewData, setPreviewData] = useState<{
    filled_data: FilledDocumentData
    field_preview: Record<string, { template_field: string; data_path: string; value: unknown; is_filled: boolean }>
    warnings: DataValidationWarning[]
    has_errors: boolean
    missing_required: string[]
  } | null>(null)
  const [dataOverrides, setDataOverrides] = useState<Partial<FilledDocumentData>>({})
  const [customContent, setCustomContent] = useState<{
    narratives?: Record<string, string>
    notes?: string
  }>({})
  const [documentTitle, setDocumentTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedDocId, setGeneratedDocId] = useState<string | null>(null)

  // Fetch preview data when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      fetchPreviewData()
      setDocumentTitle(selectedTemplate.template_name)
    }
  }, [selectedTemplate])

  const fetchPreviewData = async () => {
    if (!selectedTemplate) return

    try {
      setLoading(true)
      setError(null)

      const response = await authFetch(`/api/cases/${caseId}/documents/generate?template_id=${selectedTemplate.id}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch document preview')
      }

      const data = await response.json()
      setPreviewData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview')
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setCurrentStep('review')
  }

  const handleDataOverride = (path: string, value: unknown) => {
    // Parse the path and set nested value
    const parts = path.split('.')
    const newOverrides = { ...dataOverrides }

    let current: Record<string, unknown> = newOverrides
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {}
      }
      current = current[parts[i]] as Record<string, unknown>
    }
    current[parts[parts.length - 1]] = value

    setDataOverrides(newOverrides)
  }

  const handleGenerate = async () => {
    if (!selectedTemplate) return

    try {
      setGenerating(true)
      setError(null)

      const response = await authFetch(`/api/cases/${caseId}/documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          document_title: documentTitle,
          data_overrides: Object.keys(dataOverrides).length > 0 ? dataOverrides : undefined,
          custom_content: Object.keys(customContent).length > 0 ? customContent : undefined,
          skip_validation: false
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate document')
      }

      setGeneratedDocId(data.document.id)
      setCurrentStep('generate')

      if (onComplete) {
        onComplete(data.document.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate document')
    } finally {
      setGenerating(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'select':
        return !!selectedTemplate
      case 'review':
        return previewData && !previewData.has_errors
      case 'customize':
        return true
      case 'generate':
        return !!generatedDocId
      default:
        return false
    }
  }

  const goToStep = (step: WizardStep) => {
    const stepIndex = STEPS.findIndex(s => s.id === step)
    const currentIndex = STEPS.findIndex(s => s.id === currentStep)

    // Can only go back or to current step
    if (stepIndex <= currentIndex) {
      setCurrentStep(step)
    }
  }

  const goNext = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep)
    if (currentIndex < STEPS.length - 1 && canProceed()) {
      if (currentStep === 'customize') {
        handleGenerate()
      } else {
        setCurrentStep(STEPS[currentIndex + 1].id)
      }
    }
  }

  const goBack = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id)
    }
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Progress Steps */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => goToStep(step.id)}
                disabled={index > currentStepIndex}
                className={`flex items-center gap-2 ${
                  index <= currentStepIndex
                    ? 'text-blue-600 cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : index === currentStepIndex
                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {index < currentStepIndex ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="hidden sm:block font-medium">{step.label}</span>
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight className="w-5 h-5 mx-4 text-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: Select Template */}
        {currentStep === 'select' && (
          <TemplateSelector
            stateCode={stateCode}
            onSelect={handleTemplateSelect}
            selectedTemplateId={selectedTemplate?.id}
          />
        )}

        {/* Step 2: Review Data */}
        {currentStep === 'review' && selectedTemplate && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">{selectedTemplate.template_name}</h3>
                <p className="text-sm text-gray-500">
                  {selectedTemplate.form_number && `Form ${selectedTemplate.form_number} • `}
                  {DOCUMENT_TYPE_INFO[selectedTemplate.template_type]?.label}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Loading case data...</span>
              </div>
            ) : previewData ? (
              <DataMappingReview
                template={selectedTemplate}
                filledData={previewData.filled_data}
                fieldPreview={previewData.field_preview}
                warnings={previewData.warnings}
                onOverride={handleDataOverride}
                overrides={dataOverrides}
              />
            ) : null}
          </div>
        )}

        {/* Step 3: Customize */}
        {currentStep === 'customize' && selectedTemplate && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Customize Document</h3>

              {/* Document Title */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes (not included in document)
                </label>
                <textarea
                  value={customContent.notes || ''}
                  onChange={(e) => setCustomContent({ ...customContent, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes for your reference..."
                />
              </div>
            </div>

            {/* Warnings Summary */}
            {previewData?.warnings && previewData.warnings.length > 0 && (
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-3">Data Warnings</h4>
                <div className="space-y-2">
                  {previewData.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg flex items-start gap-3 ${
                        warning.severity === 'error'
                          ? 'bg-red-50 text-red-700'
                          : warning.severity === 'warning'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {warning.severity === 'error' ? (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      ) : warning.severity === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      ) : (
                        <Info className="w-5 h-5 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">{warning.message}</p>
                        {warning.suggestion && (
                          <p className="text-sm mt-1 opacity-80">{warning.suggestion}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Generate */}
        {currentStep === 'generate' && (
          <div className="text-center py-12">
            {generating ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Generating Document...
                </h3>
                <p className="text-gray-500 mt-2">
                  This may take a moment
                </p>
              </>
            ) : generatedDocId ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Document Generated Successfully!
                </h3>
                <p className="text-gray-500 mt-2">
                  Your document draft has been created and saved.
                </p>
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => window.open(`/api/cases/${caseId}/documents/generated/${generatedDocId}/preview`, '_blank')}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => window.open(`/api/cases/${caseId}/documents/generated/${generatedDocId}/download`, '_blank')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {currentStepIndex > 0 && currentStep !== 'generate' && (
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {currentStep !== 'generate' && (
            <button
              onClick={goNext}
              disabled={!canProceed() || generating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === 'customize' ? (
                generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Generate Document
                  </>
                )
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {currentStep === 'generate' && generatedDocId && (
            <button
              onClick={() => {
                setSelectedTemplate(null)
                setPreviewData(null)
                setDataOverrides({})
                setCustomContent({})
                setGeneratedDocId(null)
                setCurrentStep('select')
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate Another Document
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
