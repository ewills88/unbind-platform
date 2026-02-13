'use client'

import { useState, useEffect } from 'react'
import { FileText, Image as ImageIcon, X } from 'lucide-react'

interface FilePreviewCardProps {
  file: File
  onRemove: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function FilePreviewCard({ file, onRemove }: FilePreviewCardProps) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [file])

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      {preview ? (
        <img src={preview} alt={file.name} className="w-16 h-16 object-cover rounded" />
      ) : (
        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
          {file.type === 'application/pdf' ? (
            <FileText className="w-8 h-8 text-red-500" />
          ) : (
            <ImageIcon className="w-8 h-8 text-gray-500" />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{file.name}</p>
        <p className="text-xs text-gray-600">{formatFileSize(file.size)}</p>
      </div>

      <button
        onClick={onRemove}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
