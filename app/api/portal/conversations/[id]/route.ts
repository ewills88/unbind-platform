import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// PATCH /api/portal/conversations/[id] — update conversation (close, reopen, etc.)
export async function PATCH(
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

    // Get conversation to verify access
    const { data: existing } = await supabase
      .from('portal_conversations')
      .select('id, case_id, status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Build update object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {}

    if (body.status) {
      updates.status = body.status
      if (body.status === 'closed') {
        updates.closed_at = new Date().toISOString()
        updates.closed_by = user.id
      }
    }
    if (body.priority) updates.priority = body.priority
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to
    if (body.subject) updates.subject = body.subject

    const { data, error } = await supabase
      .from('portal_conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log close/reopen activity
    if (body.status === 'closed') {
      await supabase.from('case_activity_log').insert({
        case_id: existing.case_id,
        user_id: user.id,
        activity_type: 'conversation_closed',
        title: 'Conversation closed',
        is_visible_to_client: true,
        metadata: { conversation_id: id },
      })

      // Add system message
      await supabase.from('portal_messages').insert({
        conversation_id: id,
        sender_id: user.id,
        sender_role: 'system',
        content: 'This conversation has been closed.',
        content_type: 'system',
      })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Portal conversation PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
