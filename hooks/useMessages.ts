'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { MessageWithSender, TypingIndicator, Message } from '@/types/messages'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface UseMessagesOptions {
  caseId: string
  currentUserId: string
  onNewMessage?: (message: MessageWithSender) => void
}

interface UseMessagesReturn {
  messages: MessageWithSender[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  typingUsers: TypingIndicator[]
  sendMessage: (content: string, attachments?: string[]) => Promise<void>
  loadMore: () => Promise<void>
  markAsRead: (messageIds: string[]) => Promise<void>
  startTyping: () => void
  stopTyping: () => void
  refresh: () => Promise<void>
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function useMessages({
  caseId,
  currentUserId,
  onNewMessage
}: UseMessagesOptions): UseMessagesReturn {
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])

  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  // Fetch messages from API
  const fetchMessages = useCallback(async (before?: string) => {
    const url = before
      ? `/api/cases/${caseId}/messages?before=${before}`
      : `/api/cases/${caseId}/messages`

    const response = await authFetch(url)
    if (!response.ok) throw new Error('Failed to fetch messages')
    return response.json()
  }, [caseId])

  // Initial load
  const loadInitialMessages = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchMessages()
      setMessages(data.messages || [])
      setHasMore(data.has_more)
    } catch {
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [fetchMessages])

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || messages.length === 0) return

    const oldestMessage = messages[0]
    try {
      const data = await fetchMessages(oldestMessage.created_at)
      setMessages(prev => [...(data.messages || []), ...prev])
      setHasMore(data.has_more)
    } catch (err) {
      console.error('Error loading more messages:', err)
    }
  }, [fetchMessages, hasMore, messages])

  // Refresh messages
  const refresh = useCallback(async () => {
    await loadInitialMessages()
  }, [loadInitialMessages])

  // Send message
  const sendMessage = useCallback(async (content: string, attachments?: string[]) => {
    // Optimistic update - add message immediately
    const optimisticMessage: MessageWithSender = {
      id: `temp-${Date.now()}`,
      case_id: caseId,
      sender_id: currentUserId,
      content,
      content_type: 'text',
      attachments: attachments || [],
      is_archived: false,
      archived_at: null,
      archived_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_read: true
    }

    setMessages(prev => [...prev, optimisticMessage])

    // Stop typing indicator
    stopTyping()

    try {
      const response = await authFetch(`/api/cases/${caseId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          attachments: attachments?.length ? attachments : undefined
        })
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()

      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(m => m.id === optimisticMessage.id ? data.message : m)
      )
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      throw err
    }
    // stopTyping uses refs for state, safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, currentUserId])

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return

    try {
      await authFetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_ids: messageIds })
      })

      // Update local state
      setMessages(prev =>
        prev.map(m =>
          messageIds.includes(m.id) ? { ...m, is_read: true } : m
        )
      )
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }, [])

  // Typing indicator - start
  const startTyping = useCallback(() => {
    if (isTypingRef.current) {
      // Already typing, just reset the timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    } else {
      // Start new typing session
      isTypingRef.current = true
      authFetch(`/api/cases/${caseId}/typing`, { method: 'POST' })
    }

    // Auto-stop after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 3000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  // Typing indicator - stop
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    if (isTypingRef.current) {
      isTypingRef.current = false
      authFetch(`/api/cases/${caseId}/typing`, { method: 'DELETE' })
    }
  }, [caseId])

  // Setup real-time subscription
  useEffect(() => {
    loadInitialMessages()

    // Subscribe to messages channel
    const channel = supabase
      .channel(`case-messages:${caseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `case_id=eq.${caseId}`
        },
        async (payload) => {
          const newMessage = payload.new as Message

          // Skip if it's our own message (already added optimistically)
          if (newMessage.sender_id === currentUserId) {
            // But update with real data if we have a temp message
            setMessages(prev => {
              const hasTemp = prev.some(m => m.id.startsWith('temp-'))
              if (hasTemp) {
                // Fetch full message with sender info
                authFetch(`/api/cases/${caseId}/messages?limit=1`)
                  .then(res => res.json())
                  .then(data => {
                    const fullMsg = data.messages?.find((m: MessageWithSender) => m.id === newMessage.id)
                    if (fullMsg) {
                      setMessages(p => p.map(m =>
                        m.id.startsWith('temp-') ? fullMsg : m
                      ))
                    }
                  })
              }
              return prev
            })
            return
          }

          // Fetch full message with sender info for messages from others
          try {
            const response = await authFetch(`/api/cases/${caseId}/messages?limit=1`)
            const data = await response.json()
            const fullMessage = data.messages?.find((m: MessageWithSender) => m.id === newMessage.id)

            if (fullMessage) {
              setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === fullMessage.id)) return prev
                return [...prev, fullMessage]
              })

              // Notify callback
              onNewMessage?.(fullMessage)

              // Auto-mark as read if window is focused
              if (document.hasFocus()) {
                authFetch(`/api/messages/${newMessage.id}/read`, { method: 'PATCH' })
              }
            }
          } catch (err) {
            console.error('Error fetching new message:', err)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `case_id=eq.${caseId}`
        },
        async () => {
          // Refresh typing indicators
          try {
            const response = await authFetch(`/api/cases/${caseId}/typing`)
            const data = await response.json()
            setTypingUsers(data.typing?.filter((t: TypingIndicator) => t.user_id !== currentUserId) || [])
          } catch (err) {
            console.error('Error fetching typing indicators:', err)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    // Cleanup
    return () => {
      stopTyping()
      channel.unsubscribe()
    }
  }, [caseId, currentUserId, loadInitialMessages, onNewMessage, stopTyping])

  // Mark unread messages as read when they appear
  useEffect(() => {
    const unreadIds = messages
      .filter(m => !m.is_read && m.sender_id !== currentUserId)
      .map(m => m.id)

    if (unreadIds.length > 0 && document.hasFocus()) {
      markAsRead(unreadIds)
    }
  }, [messages, currentUserId, markAsRead])

  return {
    messages,
    isLoading,
    error,
    hasMore,
    typingUsers,
    sendMessage,
    loadMore,
    markAsRead,
    startTyping,
    stopTyping,
    refresh
  }
}
