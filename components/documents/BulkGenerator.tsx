'use client'

import { useState, useEffect } from 'react'
import {
  Package, FileText, Check, AlertCircle, Loader2,
  ChevronRight, Download, FolderOpen
} from 'lucide-react'
import { PACKAGE_TEMPLATES, PackageTemplate, DocumentPackage } from '@/types/document-collaboration'

interface BulkGeneratorProps {
  caseId: string
  stateCode: string
  onPackageCreated?: (pkg: DocumentPackage) => void
}

interface StateTemplate {
  id: string
  template_name: string
  template_code: string
  template_type: string
  category: string
  form_number: string | null
}

export default function BulkGenerator({
  caseId,
  stateCode,
  onPackageCreated
}: BulkGeneratorProps) {
  const [step, setStep] = useState<'select' | 'customize' | 'generating' | 'complete'>('select')
  const [selectedPackage, setSelectedPackage] = useState<PackageTemplate | null>(null)
  const [customName, setCustomName] = useState('')
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [availableTemplates, setAvailableTemplates] = useState<StateTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    package: DocumentPackage
    documents: unknown[]
    errors?: { template_code: string; error: string }[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Filter package templates for current state
  const statePackages = PACKAGE_TEMPLATES.filter(p => p.state_code === stateCode)

  useEffect(() => {
    if (step === 'customize') {
      fetchTemplates()
    }
  }, [step, stateCode])

  async function fetchTemplates() {
    try {
      setLoading(true)
      const response = await fetch(`/api/states/${stateCode}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableTemplates(data.templates || [])
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    } finally {
      setLoading(false)
    }
  }

  function handlePackageSelect(pkg: PackageTemplate) {
    setSelectedPackage(pkg)
    setCustomName(pkg.name)
    setSelectedTemplates(pkg.template_codes)
    setStep('customize')
  }

  function handleCustomPackage() {
    setSelectedPackage(null)
    setCustomName('Custom Document Package')
    setSelectedTemplates([])
    setStep('customize')
  }

  function toggleTemplate(code: string) {
    setSelectedTemplates(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  async function generatePackage() {
    if (selectedTemplates.length === 0) {
      setError('Please select at least one template')
      return
    }

    try {
      setStep('generating')
      setError(null)

      const response = await fetch(`/api/cases/${caseId}/documents/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_name: customName,
          package_type: selectedPackage?.package_type || 'custom',
          template_codes: selectedTemplates
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate package')
      }

      const data = await response.json()
      setResult(data)
      setStep('complete')
      onPackageCreated?.(data.package)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate package')
      setStep('customize')
    }
  }

  function reset() {
    setStep('select')
    setSelectedPackage(null)
    setCustomName('')
    setSelectedTemplates([])
    setResult(null)
    setError(null)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Bulk Document Generation</h3>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Generate multiple documents at once using predefined packages
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Step 1: Select Package */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">
              Select a Package for {stateCode}
            </p>

            {statePackages.length > 0 ? (
              <div className="grid gap-3">
                {statePackages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => handlePackageSelect(pkg)}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg
                             hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{pkg.name}</h4>
                      <p className="mt-1 text-sm text-gray-500">{pkg.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {pkg.template_codes.map((code) => (
                          <span
                            key={code}
                            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No predefined packages for {stateCode}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={handleCustomPackage}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg
                         hover:border-blue-400 hover:bg-blue-50 text-center transition-colors"
              >
                <Package className="w-6 h-6 text-gray-400 mx-auto" />
                <p className="mt-2 font-medium text-gray-700">Create Custom Package</p>
                <p className="text-sm text-gray-500">Select individual templates</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Customize */}
        {step === 'customize' && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Package Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
                         focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {selectedPackage?.instructions && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">{selectedPackage.instructions}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Templates ({selectedTemplates.length} selected)
              </label>

              {loading ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="mt-2 text-sm text-gray-500">Loading templates...</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {availableTemplates.map((template) => (
                    <label
                      key={template.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(template.template_code)}
                        onChange={() => toggleTemplate(template.template_code)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded
                                 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {template.template_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {template.template_code} - {template.category}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={generatePackage}
                disabled={selectedTemplates.length === 0 || !customName.trim()}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                Generate {selectedTemplates.length} Documents
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === 'generating' && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h4 className="mt-4 font-medium text-gray-900">Generating Documents</h4>
            <p className="mt-1 text-sm text-gray-500">
              Creating {selectedTemplates.length} documents...
            </p>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && result && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="mt-4 font-medium text-gray-900">Package Created!</h4>
              <p className="mt-1 text-sm text-gray-500">
                Generated {result.documents.length} documents successfully
              </p>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">
                  Some documents could not be generated:
                </p>
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err.template_code}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {(result.documents as Array<{ id: string; document_title: string; template?: { template_code: string } }>).map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.document_title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.template?.template_code || 'Generated'}
                    </p>
                  </div>
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Create Another Package
              </button>
              {result.package.zip_file_path && (
                <button
                  className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600
                           rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Download All
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
