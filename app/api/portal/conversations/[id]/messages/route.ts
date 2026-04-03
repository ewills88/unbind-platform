import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/portal/conversations/[id]/messages — list messages in a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Verify conversation access
    const { data: conversation } = await supabase
      .from('portal_conversations')
      .select('id, case_id')
      .eq('id', id)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAttorney = profile?.role === 'attorney' || profile?.role === 'admin'

    // Get messages
    let query = supabase
      .from('portal_messages')
      .select('*')
      .eq('conversation_id', id)

    // Clients can't see internal messages
    if (!isAttorney) {
      query = query.eq('is_internal', false)
    }

    const { data: messages, error } = await query
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get sender profiles
    const senderIds = Array.from(new Set((messages || []).map(m => m.sender_id)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profileMap: Record<string, any> = {}
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds)
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
      }
    }

    const enriched = (messages || []).map(m => ({
      ...m,
      sender_name: profileMap[m.sender_id]?.full_name || 'Unknown',
      sender_avatar_initials: getInitials(profileMap[m.sender_id]?.full_name || '?'),
    }))

    // Mark messages as read for this user's role
    const unreadIds = (messages || [])
      .filter(m => !m.is_read && m.sender_id !== user.id)
      .map(m => m.id)

    if (unreadIds.length > 0) {
      await supabase
        .from('portal_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)

      // Reset unread count
      const updateField = isAttorney ? 'attorney_unread_count' : 'client_unread_count'
      await supabase
        .from('portal_conversations')
        .update({ [updateField]: 0 })
        .eq('id', id)
    }

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Portal messages GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/portal/conversations/[id]/messages — send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Verify conversation access and get case_id
    const { data: conversation } = await supabase
      .from('portal_conversations')
      .select('id, case_id, status')
      .eq('id', id)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.status === 'closed') {
      return NextResponse.json({ error: 'Conversation is closed' }, { status: 400 })
    }

    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    const senderRole = profile?.role === 'attorney' || profile?.role === 'admin' ? 'attorney' : 'client'

    // Create message
    const { data: message, error } = await supabase
      .from('portal_messages')
      .insert({
        conversation_id: id,
        sender_id: user.id,
        sender_role: senderRole,
        content: body.content.trim(),
        content_type: body.content_type || 'text',
        attachments: body.attachments || [],
        is_internal: body.is_internal || false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reopen conversation if it was archived
    if (conversation.status === 'archived') {
      await supabase
        .from('portal_conversations')
        .update({ status: 'open' })
        .eq('id', id)
    }

    // Log activity
    await supabase.from('case_activity_log').insert({
      case_id: conversation.case_id,
      user_id: user.id,
      activity_type: 'message_sent',
      title: `${senderRole === 'client' ? 'Client' : profile?.full_name || 'Attorney'} sent a message`,
      description: body.content.trim().substring(0, 100),
      is_visible_to_client: !body.is_internal,
      metadata: { conversation_id: id },
    })

    return NextResponse.json({
      data: {
        ...message,
        sender_name: profile?.full_name || 'Unknown',
        sender_avatar_initials: getInitials(profile?.full_name || '?'),
      },
    })
  } catch (error) {
    console.error('Portal messages POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}
