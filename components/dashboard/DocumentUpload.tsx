'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Upload, X, File, AlertCircle, CheckCircle2 } from 'lucide-react'
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, DOCUMENT_CATEGORIES } from '@/types/documents'

const supabase = createClient(
  'https://rpbjravqgflidnwjkgvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'
)

interface DocumentUploadProps {
  caseId: string
  onUploadComplete?: () => void
}

interface UploadingFile {
  file: File
  progress: number
  error?: string
  success?: boolean
}

export default function DocumentUpload({ caseId, onUploadComplete }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [shareWithClient, setShareWithClient] = useState(false)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'File type not allowed. Please upload PDF, DOC, DOCX, JPG, or PNG files.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 50MB limit.'
    }
    return null
  }

  const uploadFile = async (file: File) => {
    const error = validateFile(file)
    if (error) {
      setUploadingFiles(prev => 
        prev.map(f => f.file === file ? { ...f, error, progress: 0 } : f)
      )
      return
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Generate unique filename
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filename = `${timestamp}_${sanitizedName}`
      const storagePath = `case-${caseId}/${filename}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('case-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Create database record
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          case_id: caseId,
          uploader_id: user.id,
          filename: filename,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: storagePath,
          category: category,
          description: description || null,
          is_shared_with_client: shareWithClient,
        })

      if (dbError) throw dbError

      // Mark as success
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: 100, success: true } : f)
      )

      // Remove after 2 seconds
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.file !== file))
        if (onUploadComplete) onUploadComplete()
      }, 2000)

    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, error: error.message, progress: 0 } : f)
      )
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files).map(file => ({
      file,
      progress: 0,
    }))

    setUploadingFiles(prev => [...prev, ...newFiles])

    // Upload each file
    newFiles.forEach(({ file }) => uploadFile(file))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [caseId, category, description, shareWithClient])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., December bank statement"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Share with client */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shareWithClient}
                onChange={(e) => setShareWithClient(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Share with client
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-500 mb-4">
          PDF, DOC, DOCX, JPG, PNG up to 50MB
        </p>
        <input
          type="file"
          multiple
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
        >
          Select Files
        </label>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map(({ file, progress, error, success }) => (
            <div
              key={file.name}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start gap-3">
                <File className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    {!success && !error && (
                      <button
                        onClick={() => removeFile(file)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {formatFileSize(file.size)}
                  </p>

                  {error ? (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  ) : success ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Upload complete!</span>
                    </div>
                  ) : (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}