'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, AlertCircle, MessageSquare, Search, ArrowDown } from 'lucide-react'
import MessageBubble from './MessageBubble'
import MessageComposer from './MessageComposer'
import TypingIndicator from './TypingIndicator'
import MessageSearch from './MessageSearch'
import { useMessages } from '@/hooks/useMessages'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface MessageThreadProps {
  caseId: string
  currentUserId: string
  onMessageSent?: () => void
  showHeader?: boolean
}

export default function MessageThread({
  caseId,
  currentUserId,
  onMessageSent,
  showHeader = false
}: MessageThreadProps) {
  const [availableDocuments, setAvailableDocuments] = useState<{
    id: string
    original_filename: string
    mime_type: string
    file_size?: number
  }[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Use the messages hook
  const {
    messages,
    isLoading,
    error,
    hasMore,
    typingUsers,
    sendMessage,
    loadMore,
    startTyping,
    stopTyping
  } = useMessages({
    caseId,
    currentUserId,
    onNewMessage: () => {
      // Play notification sound or show toast for new messages
      if (!document.hasFocus()) {
        // Could add browser notification here
      }
    }
  })

  // Fetch available documents for attachments
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await authFetch(`/api/documents?case_id=${caseId}`)
        if (response.ok) {
          const data = await response.json()
          setAvailableDocuments(data.documents || [])
        }
      } catch (err) {
        console.error('Error fetching documents:', err)
      }
    }
    fetchDocuments()
  }, [caseId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && !isLoadingMore && !highlightedMessageId) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoadingMore, highlightedMessageId])

  // Clear highlight after animation
  useEffect(() => {
    if (highlightedMessageId) {
      const timer = setTimeout(() => {
        setHighlightedMessageId(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightedMessageId])

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget

    // Show scroll to bottom button if not near bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollToBottom(!isNearBottom)

    // Load more when at top
    if (scrollTop === 0 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true)
      loadMore().finally(() => setIsLoadingMore(false))
    }
  }, [hasMore, isLoadingMore, loadMore])

  // Scroll to specific message
  const scrollToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMessageId(messageId)
    }
  }, [])

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Send message handler
  const handleSend = async (content: string, attachments: string[]) => {
    await sendMessage(content, attachments)
    onMessageSent?.()
  }

  // Handle attachment click
  const handleAttachmentClick = (documentId: string) => {
    window.open(`/dashboard/documents?preview=${documentId}`, '_blank')
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F to search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load messages</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Optional header with search */}
      {showHeader && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-gray-100 bg-white">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Search messages (Ctrl+F)"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Search overlay */}
      {showSearch && (
        <MessageSearch
          caseId={caseId}
          onResultSelect={(messageId) => {
            scrollToMessage(messageId)
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
      >
        {/* Load more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading earlier messages...</span>
            </div>
          </div>
        )}

        {hasMore && !isLoadingMore && (
          <div className="flex justify-center py-3">
            <button
              onClick={() => {
                setIsLoadingMore(true)
                loadMore().finally(() => setIsLoadingMore(false))
              }}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Load earlier messages
            </button>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center h-full min-h-[300px]">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-600">
                Start the conversation by sending a message below. All messages are securely stored and only visible to case participants.
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => {
          const showSender =
            index === 0 ||
            messages[index - 1]?.sender_id !== message.sender_id

          // Group messages by date
          const messageDate = new Date(message.created_at).toDateString()
          const prevMessageDate = index > 0
            ? new Date(messages[index - 1].created_at).toDateString()
            : null
          const showDateSeparator = messageDate !== prevMessageDate

          const isHighlighted = message.id === highlightedMessageId

          return (
            <div key={message.id} id={`message-${message.id}`}>
              {/* Date separator */}
              {showDateSeparator && (
                <div className="flex items-center justify-center my-6">
                  <div className="flex-1 border-t border-gray-200" />
                  <div className="mx-4 px-3 py-1 bg-white text-gray-500 text-xs font-medium rounded-full border border-gray-200 shadow-sm">
                    {formatDateSeparator(message.created_at)}
                  </div>
                  <div className="flex-1 border-t border-gray-200" />
                </div>
              )}

              <div
                className={`transition-all duration-500 rounded-lg ${
                  isHighlighted ? 'bg-yellow-100 -mx-2 px-2 py-1' : ''
                }`}
              >
                <MessageBubble
                  message={message}
                  isOwnMessage={message.sender_id === currentUserId}
                  showSender={showSender}
                  onAttachmentClick={handleAttachmentClick}
                />
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 p-3 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Composer */}
      <MessageComposer
        onSend={handleSend}
        onTyping={startTyping}
        onStopTyping={stopTyping}
        availableDocuments={availableDocuments}
      />
    </div>
  )
}

// Helper to format date separator
function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  })
}
