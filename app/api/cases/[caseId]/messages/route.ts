import { NextRequest, NextResponse } from 'next/server'
import { MessageWithSender, SendMessageRequest } from '@/types/messages'
import { getAuthenticatedClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ caseId: string }>
}

// Type for joined message data from Supabase
interface MessageWithSenderJoin {
  id: string
  case_id: string
  sender_id: string
  content: string
  content_type: string
  attachments: string[]
  is_archived: boolean
  archived_at: string | null
  archived_by: string | null
  created_at: string
  updated_at: string
  sender: {
    id: string
    full_name: string
    role: string
    avatar_url: string | null
  } | null
  message_reads: { read_at: string }[]
}

/**
 * GET /api/cases/[caseId]/messages
 * Get messages for a case with pagination
 * Query params: limit (default 50), before (cursor for pagination), search
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const before = searchParams.get('before') // ISO timestamp for cursor pagination
    const search = searchParams.get('search')

    if (!caseId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Case ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to the case (RLS will handle this too)
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Not Found', details: 'Case not found or access denied' },
        { status: 404 }
      )
    }

    // Build query
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, full_name, role, avatar_url),
        message_reads!left(read_at)
      `, { count: 'exact' })
      .eq('case_id', caseId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply cursor pagination
    if (before) {
      query = query.lt('created_at', before)
    }

    // Apply search
    if (search) {
      query = query.textSearch('content', search)
    }

    // Filter message_reads to only current user
    // This is handled in the data transformation below

    const { data: messages, error: messagesError, count } = await query

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesError.message },
        { status: 500 }
      )
    }

    // Transform messages with read status for current user
    const transformedMessages: MessageWithSender[] = (messages as MessageWithSenderJoin[] || []).map(msg => {
      const isRead = msg.message_reads?.some(r => r.read_at) || msg.sender_id === user.id
      return {
        id: msg.id,
        case_id: msg.case_id,
        sender_id: msg.sender_id,
        content: msg.content,
        content_type: msg.content_type as 'text' | 'rich_text',
        attachments: msg.attachments || [],
        is_archived: msg.is_archived,
        archived_at: msg.archived_at,
        archived_by: msg.archived_by,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        sender: msg.sender ? {
          id: msg.sender.id,
          full_name: msg.sender.full_name,
          role: msg.sender.role as 'client' | 'attorney' | 'admin',
          avatar_url: msg.sender.avatar_url || undefined
        } : undefined,
        is_read: isRead,
        read_at: msg.message_reads?.[0]?.read_at || null
      }
    })

    // Reverse to get chronological order (oldest first) for display
    transformedMessages.reverse()

    return NextResponse.json({
      messages: transformedMessages,
      has_more: (count || 0) > limit,
      total_count: count || 0
    })

  } catch (error) {
    console.error('Messages API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/cases/[caseId]/messages
 * Send a new message
 * Body: { content: string, content_type?: string, attachments?: string[] }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body: SendMessageRequest = await request.json()

    if (!caseId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Case ID is required' },
        { status: 400 }
      )
    }

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Message content is required' },
        { status: 400 }
      )
    }

    // Validate content length
    if (body.content.length > 10000) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Message too long (max 10000 characters)' },
        { status: 400 }
      )
    }

    // Verify user has access to the case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Not Found', details: 'Case not found or access denied' },
        { status: 404 }
      )
    }

    // Validate attachments if provided (must be documents in this case)
    if (body.attachments && body.attachments.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('id')
        .eq('case_id', caseId)
        .in('id', body.attachments)

      if (docsError || !docs || docs.length !== body.attachments.length) {
        return NextResponse.json(
          { error: 'Bad Request', details: 'One or more attachments not found in this case' },
          { status: 400 }
        )
      }
    }

    // Create the message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        case_id: caseId,
        sender_id: user.id,
        content: body.content.trim(),
        content_type: body.content_type || 'text',
        attachments: body.attachments || []
      })
      .select(`
        *,
        sender:sender_id(id, full_name, role, avatar_url)
      `)
      .single()

    if (insertError) {
      console.error('Error creating message:', insertError)
      return NextResponse.json(
        { error: 'Failed to send message', details: insertError.message },
        { status: 500 }
      )
    }

    const msg = message as unknown as MessageWithSenderJoin

    const response: MessageWithSender = {
      id: msg.id,
      case_id: msg.case_id,
      sender_id: msg.sender_id,
      content: msg.content,
      content_type: msg.content_type as 'text' | 'rich_text',
      attachments: msg.attachments || [],
      is_archived: msg.is_archived,
      archived_at: msg.archived_at,
      archived_by: msg.archived_by,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      sender: msg.sender ? {
        id: msg.sender.id,
        full_name: msg.sender.full_name,
        role: msg.sender.role as 'client' | 'attorney' | 'admin',
        avatar_url: msg.sender.avatar_url || undefined
      } : undefined,
      is_read: true // Sender has read their own message
    }

    return NextResponse.json({
      success: true,
      message: response
    }, { status: 201 })

  } catch (error) {
    console.error('Messages API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
