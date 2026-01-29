import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Create authenticated Supabase client
async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { client: null, user: null }
  }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: {
      headers: {
        cookie: cookieStore.toString()
      }
    }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { client: null, user: null }
  }

  return { client: supabase, user }
}

interface RouteParams {
  params: Promise<{ caseId: string }>
}

/**
 * GET /api/cases/[caseId]/messages/unread
 * Get unread message count for the current user in this case
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

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

    // If not in cache, calculate from messages
    const { count, error: countError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', caseId)
      .eq('is_archived', false)
      .neq('sender_id', user.id)
      .not('id', 'in', `(
        SELECT message_id FROM message_reads WHERE user_id = '${user.id}'
      )`)

    if (countError) {
      // Fallback to simpler query
      const { data: messages } = await supabase
        .from('messages')
        .select('id, sender_id')
        .eq('case_id', caseId)
        .eq('is_archived', false)
        .neq('sender_id', user.id)

      const { data: reads } = await supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', user.id)

      const readIds = new Set(reads?.map(r => r.message_id) || [])
      const unreadCount = messages?.filter(m => !readIds.has(m.id)).length || 0

      return NextResponse.json({
        case_id: caseId,
        count: unreadCount
      })
    }

    return NextResponse.json({
      case_id: caseId,
      count: count || 0
    })

  } catch (error) {
    console.error('Unread count API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
