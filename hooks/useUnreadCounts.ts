'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface UnreadCounts {
  [caseId: string]: number
}

interface UseUnreadCountsReturn {
  counts: UnreadCounts
  totalUnread: number
  isLoading: boolean
  refresh: () => Promise<void>
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function useUnreadCounts(userId: string | null): UseUnreadCountsReturn {
  const [counts, setCounts] = useState<UnreadCounts>({})
  const [isLoading, setIsLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const fetchCounts = useCallback(async () => {
    if (!userId) return

    try {
      const response = await authFetch('/api/messages/inbox')
      if (!response.ok) throw new Error('Failed to fetch inbox')

      const data = await response.json()
      const newCounts: UnreadCounts = {}

      data.cases?.forEach((c: { id: string; unread_count: number }) => {
        newCounts[c.id] = c.unread_count
      })

      setCounts(newCounts)
    } catch (err) {
      console.error('Error fetching unread counts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!userId) return

    fetchCounts()

    // Subscribe to unread count changes
    const channel = supabase
      .channel(`unread-counts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_unread_counts',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as { case_id: string; unread_count: number }
            setCounts(prev => ({
              ...prev,
              [record.case_id]: record.unread_count
            }))
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as { case_id: string }
            setCounts(prev => {
              const newCounts = { ...prev }
              delete newCounts[record.case_id]
              return newCounts
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Refresh counts when new messages arrive
          // Small delay to allow trigger to update counts
          setTimeout(fetchCounts, 500)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [userId, fetchCounts])

  const totalUnread = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return {
    counts,
    totalUnread,
    isLoading,
    refresh: fetchCounts
  }
}
