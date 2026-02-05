'use client'

import { useState, useCallback } from 'react'
import {
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
} from 'lucide-react'
import { DocumentChecklistItem, DOCUMENT_TYPES, DocumentType } from '@/types/intake-documents'

interface DocumentUploadModalProps {
  intakeId: string
  document: DocumentChecklistItem
  onClose: () => void
  onComplete: () => void
}

export default function DocumentUploadModal({
  intakeId,
  document,
  onClose,
  onComplete,
}: DocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const config = DOCUMENT_TYPES[document.type as DocumentType] || document.config
  const maxSizeMB = config.maxSizeMB || 25
  const acceptedFormats = config.acceptableFormats.map(f => `.${f.toLowerCase()}`).join(',')

  const validateFile = (file: File): string | null => {
    // Check file type
    const ext = file.name.split('.').pop()?.toUpperCase()
    if (ext && !config.acceptableFormats.includes(ext)) {
      return `Invalid file type. Accepted: ${config.acceptableFormats.join(', ')}`
    }

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large. Maximum size: ${maxSizeMB}MB`
    }

    return null
  }

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(null)
    }
  }, [config.acceptableFormats, maxSizeMB])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Get or create document record
      let documentId = (document.document as { id?: string })?.id

      if (!documentId) {
        // Create document record first
        const createResponse = await fetch(`/api/intakes/${intakeId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_type: document.type,
            document_category: config.category,
          }),
        })

        if (!createResponse.ok) {
          const createResult = await createResponse.json()
          if (createResponse.status === 409 && createResult.existingId) {
            documentId = createResult.existingId
          } else {
            throw new Error(createResult.error || 'Failed to create document record')
          }
        } else {
          const createResult = await createResponse.json()
          documentId = createResult.document.id
        }
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Upload file
      const formData = new FormData()
      formData.append('file', selectedFile)

      const uploadResponse = await fetch(
        `/api/intakes/${intakeId}/documents/${documentId}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!uploadResponse.ok) {
        const uploadResult = await uploadResponse.json()
        throw new Error(uploadResult.error || 'Upload failed')
      }

      setSuccess(true)

      // Close modal after brief delay
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Document Info */}
          <div className="bg-blue-50 rounded-lg p-3">
            <h3 className="font-medium text-blue-900">{config.name}</h3>
            <p className="text-sm text-blue-700 mt-1">{config.description}</p>
            <p className="text-xs text-blue-600 mt-2">
              Accepted formats: {config.acceptableFormats.join(', ')} | Max size: {maxSizeMB}MB
            </p>
          </div>

          {/* Success State */}
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Upload Successful!</h3>
              <p className="text-gray-600 mt-1">
                Your document is being verified by our AI system.
              </p>
            </div>
          ) : (
            <>
              {/* Drop Zone */}
              {!selectedFile ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 mb-2">
                    Drag and drop your file here, or{' '}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                      browse
                      <input
                        type="file"
                        accept={acceptedFormats}
                        onChange={handleInputChange}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-sm text-gray-500">
                    {config.acceptableFormats.join(', ')} up to {maxSizeMB}MB
                  </p>
                </div>
              ) : (
                /* File Preview */
                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                        {selectedFile.type === 'application/pdf' ? (
                          <FileText className="w-8 h-8 text-red-500" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {!isUploading && (
                        <button
                          onClick={clearFile}
                          className="mt-2 flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Uploading...</span>
                        <span className="text-gray-600">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Document
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
