import { NextRequest, NextResponse } from 'next/server'
import { CaseWithMessages } from '@/types/messages'
import { getAuthenticatedClient } from '@/lib/supabase/server'

interface CaseRecord {
  id: string
  case_number: string | null
  client_name: string
  spouse_name: string
  status: string
  attorney_id: string
  client_id: string | null
}

interface UnreadRecord {
  case_id: string
  unread_count: number
}

// Supabase join may return sender as object or array
interface MessageRecordRaw {
  case_id: string
  content: string
  created_at: string
  sender: { full_name: string } | { full_name: string }[] | null
}

function extractSenderName(sender: MessageRecordRaw['sender']): string {
  if (!sender) return 'Unknown'
  if (Array.isArray(sender)) {
    return sender[0]?.full_name || 'Unknown'
  }
  return sender.full_name || 'Unknown'
}

/**
 * GET /api/messages/inbox
 * Get all cases for the current user with message summaries
 */
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAttorney = profile?.role === 'attorney' || profile?.role === 'admin'

    // Get all cases for this user
    let query = supabase
      .from('cases')
      .select('id, case_number, client_name, spouse_name, status, attorney_id, client_id')
      .order('updated_at', { ascending: false })

    if (isAttorney) {
      query = query.eq('attorney_id', user.id)
    } else {
      query = query.eq('client_id', user.id)
    }

    const { data: cases, error: casesError } = await query

    if (casesError) {
      console.error('Error fetching cases:', casesError)
      return NextResponse.json(
        { error: 'Failed to fetch cases', details: casesError.message },
        { status: 500 }
      )
    }

    if (!cases || cases.length === 0) {
      return NextResponse.json({
        cases: [],
        total_unread: 0
      })
    }

    const caseIds = cases.map(c => c.id)

    // Get unread counts for all cases
    const { data: unreadCounts } = await supabase
      .from('message_unread_counts')
      .select('case_id, unread_count')
      .eq('user_id', user.id)
      .in('case_id', caseIds)

    const unreadMap = new Map<string, number>()
    ;(unreadCounts as UnreadRecord[] || []).forEach(u => {
      unreadMap.set(u.case_id, u.unread_count)
    })

    // Get last message for each case
    const { data: lastMessages } = await supabase
      .from('messages')
      .select(`
        case_id,
        content,
        created_at,
        sender:sender_id(full_name)
      `)
      .in('case_id', caseIds)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    // Group by case and take first (most recent)
    const lastMessageMap = new Map<string, { content: string; sender_name: string; created_at: string }>()
    ;(lastMessages as MessageRecordRaw[] || []).forEach(msg => {
      if (!lastMessageMap.has(msg.case_id)) {
        lastMessageMap.set(msg.case_id, {
          content: msg.content,
          sender_name: extractSenderName(msg.sender),
          created_at: msg.created_at
        })
      }
    })

    // Build response
    const casesWithMessages: CaseWithMessages[] = (cases as CaseRecord[]).map(c => ({
      id: c.id,
      case_number: c.case_number,
      client_name: c.client_name,
      spouse_name: c.spouse_name,
      status: c.status,
      attorney_id: c.attorney_id,
      client_id: c.client_id || '',
      unread_count: unreadMap.get(c.id) || 0,
      last_message: lastMessageMap.get(c.id)
    }))

    // Sort by unread count (unread first) then by last message time
    casesWithMessages.sort((a, b) => {
      if (a.unread_count > 0 && b.unread_count === 0) return -1
      if (a.unread_count === 0 && b.unread_count > 0) return 1
      const aTime = a.last_message?.created_at || ''
      const bTime = b.last_message?.created_at || ''
      return bTime.localeCompare(aTime)
    })

    const totalUnread = casesWithMessages.reduce((sum, c) => sum + c.unread_count, 0)

    return NextResponse.json({
      cases: casesWithMessages,
      total_unread: totalUnread
    })

  } catch (error) {
    console.error('Inbox API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
