'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Upload, X, File, AlertCircle, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react'
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, DOCUMENT_CATEGORIES } from '@/types/documents'
import { getConfidenceLabel, getConfidenceColor } from '@/lib/ai/document-classifier'

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
  suggestedCategory?: string
  confidence?: number
  reasoning?: string
}

export default function DocumentUpload({ caseId, onUploadComplete }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [shareWithClient, setShareWithClient] = useState(false)
  const [showTooltip, setShowTooltip] = useState<string | null>(null)

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filename = `${timestamp}_${sanitizedName}`
      const storagePath = `case-${caseId}/${filename}`

      console.log('📤 Uploading file:', filename)

      // Upload to storage
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: 30 } : f)
      )

      const { error: uploadError } = await supabase.storage
        .from('case-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      console.log('✅ File uploaded to storage')

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('case-documents')
        .getPublicUrl(storagePath)

      console.log('🔗 Public URL:', publicUrl)

      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: 50 } : f)
      )

      // Check for duplicate filename in the same case
      const { data: existingDocs } = await supabase
        .from('documents')
        .select('id, original_filename')
        .eq('case_id', caseId)
        .eq('original_filename', file.name)

      if (existingDocs && existingDocs.length > 0) {
        const overwrite = confirm(
          `A document named "${file.name}" already exists in this case. Upload anyway with a modified name?`
        )
        if (!overwrite) {
          // Clean up the uploaded storage file
          await supabase.storage.from('case-documents').remove([storagePath])
          setUploadingFiles(prev => prev.filter(f => f.file !== file))
          return
        }
      }

      // Insert document record
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert({
          case_id: caseId,
          uploader_id: user.id,
          filename: filename,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: storagePath,
          category: category !== 'other' ? category : null,
          description: description || null,
          is_shared_with_client: shareWithClient,
        })
        .select()
        .single()

      if (dbError) throw dbError

      console.log('✅ Document record created:', docData.id)

      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: 70 } : f)
      )

      // 🎯 TRIGGER AI ANALYSIS
      console.log('🤖 Calling AI analysis API...')

      try {
        // Get auth token for API call
        const { data: { session } } = await supabase.auth.getSession()
        const aiHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
        if (session?.access_token) {
          aiHeaders['Authorization'] = `Bearer ${session.access_token}`
        }

        const aiResponse = await fetch('/api/analyze-document', {
          method: 'POST',
          headers: aiHeaders,
          body: JSON.stringify({
            documentId: docData.id,
            fileUrl: publicUrl,
            filename: file.name,
            mimeType: file.type,
            caseId: caseId,
          }),
        })

        if (aiResponse.ok) {
          const { analysis } = await aiResponse.json()
          console.log('🎉 AI Analysis result:', analysis)
          
          // Update UI with AI suggestion
          setUploadingFiles(prev =>
            prev.map(f => f.file === file ? { 
              ...f, 
              progress: 90,
              suggestedCategory: analysis.category,
              confidence: analysis.confidence,
              reasoning: analysis.reasoning,
            } : f)
          )
        } else {
          const errorData = await aiResponse.json()
          console.error('❌ AI analysis failed:', errorData)
        }
      } catch (aiError) {
        console.error('❌ AI analysis error:', aiError)
        // Don't fail the upload - AI is optional
      }

      // Complete
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: 100, success: true } : f)
      )

      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.file !== file))
        if (onUploadComplete) onUploadComplete()
      }, 2000)

    } catch (error) {
      console.error('❌ Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, error: errorMessage, progress: 0 } : f)
      )
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return

    const filesArray = Array.from(files)
    
    // Add files to uploading list
    const newFiles = filesArray.map(file => ({
      file,
      progress: 0,
      suggestedCategory: undefined,
      confidence: undefined,
      reasoning: undefined,
    }))
    
    setUploadingFiles(prev => [...prev, ...newFiles])

    // Upload each file (AI will analyze during upload)
    for (const file of filesArray) {
      await uploadFile(file)
    }
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
              Default Category
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
            <p className="text-xs text-gray-500 mt-1">AI will suggest categories per file</p>
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
        <div className="flex flex-col items-center">
          <div className="relative">
            <Upload className={`w-12 h-12 mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
            <Sparkles className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1" />
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500 mb-1">
            PDF, DOC, DOCX, JPG, PNG up to 50MB
          </p>
          <p className="text-xs text-blue-600 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI will suggest categories automatically
          </p>
        </div>
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
          className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors mt-4"
        >
          Select Files
        </label>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map(({ file, progress, error, success, suggestedCategory, confidence, reasoning }) => (
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

                  {/* AI Suggestion */}
                  {suggestedCategory && !error && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-blue-900">
                            AI suggests: {DOCUMENT_CATEGORIES.find(c => c.value === suggestedCategory)?.label}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full bg-${getConfidenceColor(confidence || 0)}-100 text-${getConfidenceColor(confidence || 0)}-700`}>
                            {getConfidenceLabel(confidence || 0)}
                          </span>
                          <button
                            onMouseEnter={() => setShowTooltip(file.name)}
                            onMouseLeave={() => setShowTooltip(null)}
                            className="relative"
                          >
                            <HelpCircle className="w-3 h-3 text-blue-600" />
                            {showTooltip === file.name && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                                {reasoning}
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
                    <div className="space-y-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">Uploading... {progress}%</p>
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
