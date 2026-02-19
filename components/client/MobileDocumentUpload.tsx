'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import CameraModal from './CameraModal'
import FilePreviewCard from './FilePreviewCard'
import { Progress } from '@/components/ui/progress'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface MobileDocumentUploadProps {
  caseId: string
  requestedDocType?: string
  onUploadComplete?: () => void
}

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'complete'

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  return new Promise((resolve) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const reader = new FileReader()

    reader.onload = (e) => {
      img.onload = () => {
        // Scale down if larger than 1920px
        let { width, height } = img
        const maxDimension = 1920

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }))
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          0.85
        )
      }
      img.src = e.target?.result as string
    }

    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

export default function MobileDocumentUpload({
  caseId,
  requestedDocType,
  onUploadComplete,
}: MobileDocumentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle')
  const [showCamera, setShowCamera] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const handleCameraCapture = (file: File) => {
    setSelectedFiles(prev => [...prev, file])
    setShowCamera(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    setProcessingStatus('uploading')
    setUploadError(null)

    let successCount = 0

    for (const file of selectedFiles) {
      try {
        // Compress image if needed
        const processedFile = await compressImage(file)

        // Upload to Supabase Storage
        const fileName = `${caseId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, processedFile)

        // Track progress manually (Supabase JS v2 doesn't support onUploadProgress)
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))

        if (error) throw error

        // Create document record
        const { error: insertError } = await supabase.from('documents').insert({
          case_id: caseId,
          storage_path: data.path,
          filename: fileName.split('/').pop(),
          original_filename: file.name,
          file_size: processedFile.size,
          mime_type: processedFile.type,
          category: requestedDocType || null,
          is_shared_with_client: true,
          uploader_id: (await supabase.auth.getUser()).data.user?.id,
        })

        if (insertError) throw insertError
        successCount++
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err)
        setUploadError(`Failed to upload ${file.name}`)
      }
    }

    if (successCount > 0) {
      setProcessingStatus('processing')

      // Brief pause to show processing state
      await new Promise(resolve => setTimeout(resolve, 1500))

      setProcessingStatus('complete')

      // Reset after showing success
      setTimeout(() => {
        setSelectedFiles([])
        setUploadProgress({})
        setProcessingStatus('idle')
        onUploadComplete?.()
      }, 2000)
    } else {
      setProcessingStatus('idle')
    }
  }

  return (
    <div className="space-y-4">
      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />

      {processingStatus === 'idle' && (
        <>
          {/* Upload method selection */}
          <div className="grid grid-cols-1 gap-3">
            {isMobile && (
              <button
                onClick={() => setShowCamera(true)}
                className="h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors min-h-[44px]"
              >
                <Camera className="w-8 h-8 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Take Photo</span>
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors min-h-[44px]"
            >
              <Upload className="w-8 h-8 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Choose from {isMobile ? 'Photos' : 'Files'}
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Requested doc type hint */}
          {requestedDocType && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Requested:</span> {requestedDocType}
              </p>
            </div>
          )}

          {/* Selected files preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm text-gray-900">
                  Selected Files ({selectedFiles.length})
                </h4>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <FilePreviewCard
                    key={`${file.name}-${index}`}
                    file={file}
                    onRemove={() => handleRemoveFile(index)}
                  />
                ))}
              </div>

              {uploadError && (
                <p className="text-sm text-red-600">{uploadError}</p>
              )}

              <button
                onClick={handleUpload}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors min-h-[44px]"
              >
                Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'Document' : 'Documents'}
              </button>
            </div>
          )}
        </>
      )}

      {processingStatus === 'uploading' && (
        <div className="space-y-3 py-4">
          <h4 className="font-semibold text-center text-gray-900">Uploading...</h4>
          {selectedFiles.map((file) => (
            <div key={file.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="truncate text-gray-700">{file.name}</span>
                <span className="text-gray-500">{Math.round(uploadProgress[file.name] || 0)}%</span>
              </div>
              <Progress value={uploadProgress[file.name] || 0} />
            </div>
          ))}
        </div>
      )}

      {processingStatus === 'processing' && (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h4 className="font-semibold text-gray-900 mb-2">Processing documents...</h4>
          <p className="text-sm text-gray-600">
            Categorizing and organizing your uploads
          </p>
        </div>
      )}

      {processingStatus === 'complete' && (
        <div className="text-center py-8">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-900 mb-2">Upload Complete!</h4>
          <p className="text-sm text-gray-600">
            Your attorney has been notified
          </p>
        </div>
      )}
    </div>
  )
}
