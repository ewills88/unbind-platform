'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, X, Loader2, FileText, Image as ImageIcon, File as FileIcon, Search } from 'lucide-react'

interface Attachment {
  id: string
  original_filename: string
  mime_type: string
  file_size?: number
}

interface MessageComposerProps {
  onSend: (content: string, attachments: string[]) => Promise<void>
  onTyping?: () => void
  onStopTyping?: () => void
  disabled?: boolean
  placeholder?: string
  availableDocuments?: Attachment[]
}

export default function MessageComposer({
  onSend,
  onTyping,
  onStopTyping,
  disabled = false,
  placeholder = 'Type a message...',
  availableDocuments = []
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false)
  const [attachmentSearch, setAttachmentSearch] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
    }
  }, [content])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowAttachmentPicker(false)
      }
    }

    if (showAttachmentPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAttachmentPicker])

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    onTyping?.()
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping?.()
    }, 3000)
  }, [onTyping, onStopTyping])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        onStopTyping?.()
      }
    }
  }, [onStopTyping])

  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return
    if (isSending || disabled) return

    setIsSending(true)
    onStopTyping?.()

    try {
      await onSend(content.trim(), attachments.map(a => a.id))
      setContent('')
      setAttachments([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const addAttachment = (doc: Attachment) => {
    if (!attachments.find(a => a.id === doc.id)) {
      setAttachments([...attachments, doc])
    }
    setShowAttachmentPicker(false)
    setAttachmentSearch('')
  }

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id))
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-green-600" />
    if (mimeType === 'application/pdf') return <FileText className="w-4 h-4 text-red-600" />
    if (mimeType.includes('word')) return <FileText className="w-4 h-4 text-blue-600" />
    return <FileIcon className="w-4 h-4 text-gray-600" />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Filter available documents
  const filteredDocuments = availableDocuments.filter(doc =>
    doc.original_filename.toLowerCase().includes(attachmentSearch.toLowerCase())
  )

  // Group documents by type
  const groupedDocuments = filteredDocuments.reduce((groups, doc) => {
    let type = 'Other'
    if (doc.mime_type.startsWith('image/')) type = 'Images'
    else if (doc.mime_type === 'application/pdf') type = 'PDFs'
    else if (doc.mime_type.includes('word')) type = 'Documents'

    if (!groups[type]) groups[type] = []
    groups[type].push(doc)
    return groups
  }, {} as Record<string, Attachment[]>)

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm group"
            >
              {getFileIcon(doc.mime_type)}
              <span className="max-w-[150px] truncate">{doc.original_filename}</span>
              <button
                onClick={() => removeAttachment(doc.id)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2">
        {/* Attachment picker button */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowAttachmentPicker(!showAttachmentPicker)}
            disabled={disabled || availableDocuments.length === 0}
            className={`p-2 rounded-full transition-colors ${
              showAttachmentPicker
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={availableDocuments.length === 0 ? 'No documents available' : 'Attach document'}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attachment picker dropdown */}
          {showAttachmentPicker && (
            <div className="absolute bottom-12 left-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
              {/* Search header */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={attachmentSearch}
                    onChange={(e) => setAttachmentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Document list */}
              <div className="max-h-64 overflow-y-auto">
                {Object.keys(groupedDocuments).length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {attachmentSearch ? 'No documents found' : 'No documents available'}
                  </div>
                ) : (
                  Object.entries(groupedDocuments).map(([type, docs]) => (
                    <div key={type}>
                      <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 sticky top-0">
                        {type} ({docs.length})
                      </div>
                      {docs.map(doc => {
                        const isSelected = attachments.some(a => a.id === doc.id)
                        return (
                          <button
                            key={doc.id}
                            onClick={() => addAttachment(doc)}
                            disabled={isSelected}
                            className={`w-full px-3 py-2 text-left flex items-center gap-3 text-sm transition-colors ${
                              isSelected
                                ? 'bg-blue-50 text-blue-600'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {getFileIcon(doc.mime_type)}
                            <span className="flex-1 truncate">{doc.original_filename}</span>
                            {doc.file_size && (
                              <span className="text-xs text-gray-400">
                                {formatFileSize(doc.file_size)}
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-xs text-blue-600">Added</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="p-2 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  Select documents from this case to attach
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              handleTyping()
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 text-sm"
            style={{ maxHeight: '150px' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!content.trim() && attachments.length === 0) || isSending || disabled}
          className={`p-2.5 rounded-full transition-all ${
            (!content.trim() && attachments.length === 0) || isSending || disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
          }`}
          title="Send message (Enter)"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Character count for long messages */}
      {content.length > 8000 && (
        <div className={`text-xs mt-2 text-right ${
          content.length > 10000 ? 'text-red-500' : 'text-yellow-600'
        }`}>
          {content.length.toLocaleString()}/10,000 characters
          {content.length > 10000 && ' (message too long)'}
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">Shift+Enter</kbd> for new line
        </span>
        {attachments.length > 0 && (
          <span className="text-xs text-blue-600">
            {attachments.length} file{attachments.length > 1 ? 's' : ''} attached
          </span>
        )}
      </div>
    </div>
  )
}
