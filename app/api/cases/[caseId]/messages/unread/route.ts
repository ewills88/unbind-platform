import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ caseId: string }>
}

/**
 * GET /api/cases/[caseId]/messages/unread
 * Get unread message count for the current user in this case
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    if (!caseId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Case ID is required' },
        { status: 400 }
      )
    }

    // Try to get from cache first
    const { data: cached } = await supabase
      .from('message_unread_counts')
      .select('unread_count')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .single()

    if (cached) {
      return NextResponse.json({
        case_id: caseId,
        count: cached.unread_count
      })
    }

    // Calculate unread count using two queries (avoids SQL injection from string interpolation)
    const { data: allMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('case_id', caseId)
      .eq('is_archived', false)
      .neq('sender_id', user.id)

    const { data: reads } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', user.id)

    const readIds = new Set(reads?.map(r => r.message_id) || [])
    const unreadCount = allMessages?.filter(m => !readIds.has(m.id)).length || 0

    return NextResponse.json({
      case_id: caseId,
      count: unreadCount
    })

  } catch (error) {
    console.error('Unread count API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
