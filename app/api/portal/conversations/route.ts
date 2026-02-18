import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { client: null, user: null }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: { headers: { cookie: cookieStore.toString() } }
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { client: null, user: null }
  return { client: supabase, user }
}

// GET /api/portal/conversations — list conversations for client's case
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'open'

    // Get client's case
    const { data: caseData } = await supabase
      .from('cases')
      .select('id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!caseData) {
      return NextResponse.json({ data: [] })
    }

    let query = supabase
      .from('portal_conversations')
      .select('*')
      .eq('case_id', caseData.id)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get participant names for each conversation
    const conversations = data || []
    const userIds = Array.from(new Set(
      conversations.flatMap(c => [c.started_by, c.assigned_to].filter(Boolean))
    ))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profileMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || 'Unknown']))
      }
    }

    const enriched = conversations.map(c => ({
      ...c,
      starter_name: profileMap[c.started_by] || 'Unknown',
      assignee_name: c.assigned_to ? (profileMap[c.assigned_to] || 'Unassigned') : null,
    }))

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Portal conversations GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/portal/conversations — create a new conversation
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.subject || !body.initial_message) {
      return NextResponse.json(
        { error: 'Subject and initial message are required' },
        { status: 400 }
      )
    }

    // Get client's case
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!caseData) {
      return NextResponse.json({ error: 'No active case found' }, { status: 400 })
    }

    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const senderRole = profile?.role === 'attorney' || profile?.role === 'admin' ? 'attorney' : 'client'

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('portal_conversations')
      .insert({
        case_id: caseData.id,
        subject: body.subject,
        conversation_type: body.conversation_type || 'general',
        priority: body.priority || 'normal',
        started_by: user.id,
        assigned_to: caseData.attorney_id,
        last_message_at: new Date().toISOString(),
        last_message_preview: body.initial_message.substring(0, 100),
        client_unread_count: senderRole === 'attorney' ? 1 : 0,
        attorney_unread_count: senderRole === 'client' ? 1 : 0,
      })
      .select()
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: convError?.message || 'Failed to create conversation' }, { status: 500 })
    }

    // Create initial message
    const { error: msgError } = await supabase
      .from('portal_messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_role: senderRole,
        content: body.initial_message,
        content_type: 'text',
      })

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Log activity
    await supabase.from('case_activity_log').insert({
      case_id: caseData.id,
      user_id: user.id,
      activity_type: 'conversation_opened',
      title: `New conversation: ${body.subject}`,
      description: `${senderRole === 'client' ? 'Client' : 'Attorney'} started a new ${body.conversation_type || 'general'} conversation`,
      is_visible_to_client: true,
    })

    return NextResponse.json({ data: conversation })
  } catch (error) {
    console.error('Portal conversations POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
