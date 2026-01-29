'use client'

import { useState } from 'react'
import { Check, CheckCheck, Paperclip, FileText, Image as ImageIcon, File as FileIcon } from 'lucide-react'
import { MessageWithSender } from '@/types/messages'

interface MessageBubbleProps {
  message: MessageWithSender
  isOwnMessage: boolean
  showSender?: boolean
  attachmentDetails?: {
    id: string
    original_filename: string
    mime_type: string
    file_size: number
  }[]
  onAttachmentClick?: (documentId: string) => void
}

export default function MessageBubble({
  message,
  isOwnMessage,
  showSender = true,
  attachmentDetails,
  onAttachmentClick
}: MessageBubbleProps) {
  const [expanded, setExpanded] = useState(false)

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (mimeType === 'application/pdf') return <FileText className="w-4 h-4" />
    return <FileIcon className="w-4 h-4" />
  }

  const isLongMessage = message.content.length > 500
  const displayContent = isLongMessage && !expanded
    ? message.content.substring(0, 500) + '...'
    : message.content

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        {/* Sender name (for received messages) */}
        {showSender && !isOwnMessage && message.sender && (
          <div className="text-xs text-gray-500 mb-1 ml-1">
            {message.sender.full_name}
            {message.sender.role === 'attorney' && (
              <span className="ml-1 text-blue-600">(Attorney)</span>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwnMessage
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          {/* Message content */}
          <div className="whitespace-pre-wrap break-words">
            {displayContent}
          </div>

          {/* Show more/less for long messages */}
          {isLongMessage && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={`text-xs mt-1 ${
                isOwnMessage ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`mt-2 pt-2 border-t ${
              isOwnMessage ? 'border-blue-500' : 'border-gray-200'
            }`}>
              <div className={`flex items-center gap-1 text-xs mb-2 ${
                isOwnMessage ? 'text-blue-200' : 'text-gray-500'
              }`}>
                <Paperclip className="w-3 h-3" />
                {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
              </div>
              <div className="space-y-1">
                {attachmentDetails?.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => onAttachmentClick?.(doc.id)}
                    className={`flex items-center gap-2 w-full text-left text-sm rounded p-2 transition-colors ${
                      isOwnMessage
                        ? 'bg-blue-500 hover:bg-blue-400 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
                    }`}
                  >
                    {getFileIcon(doc.mime_type)}
                    <span className="flex-1 truncate">{doc.original_filename}</span>
                    <span className={`text-xs ${isOwnMessage ? 'text-blue-200' : 'text-gray-500'}`}>
                      {formatFileSize(doc.file_size)}
                    </span>
                  </button>
                )) || message.attachments.map(id => (
                  <button
                    key={id}
                    onClick={() => onAttachmentClick?.(id)}
                    className={`flex items-center gap-2 w-full text-left text-sm rounded p-2 transition-colors ${
                      isOwnMessage
                        ? 'bg-blue-500 hover:bg-blue-400 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
                    }`}
                  >
                    <FileIcon className="w-4 h-4" />
                    <span className="truncate">Document</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timestamp and read status */}
        <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
          isOwnMessage ? 'justify-end mr-1' : 'ml-1'
        }`}>
          <span>{formatTime(message.created_at)}</span>
          {isOwnMessage && (
            <span className="ml-1">
              {message.is_read ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
              ) : (
                <Check className="w-3.5 h-3.5 text-gray-400" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
